import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import multipart from '@fastify/multipart';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/auth.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { envelope, success } from '../../utils/response.js';
import { ERROR_RESPONSES, integerParams, secured } from '../../utils/schemas.js';

/** Images we accept, checked by their first bytes as well as the name the browser sends. */
const IMAGE_TYPES = {
  'image/png': {
    ext: 'png',
    magic: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': {
    ext: 'webp',
    magic: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  'image/gif': { ext: 'gif', magic: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
};
// Sub-folders a client may upload into, and the FILE_DOC_TYPE each file gets.
const FOLDER_DOC_TYPES = {
  'service-groups': 'SERVICE_GROUP',
  'organization-logos': 'ORG_LOGO',
  'quote-headers': 'QUOTE_HEADER',
  'survey-sheets': 'SURVEY_DOCUMENT',
};
const FOLDERS = Object.keys(FOLDER_DOC_TYPES);

const uploadRoot = () => path.resolve(env.uploadDir);

const fileResponse = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    mimeType: { type: 'string' },
    sizeBytes: { type: 'integer' },
  },
};

export default async function fileRoutes(app, { prisma }) {
  await app.register(multipart, { limits: { files: 1, fileSize: env.uploadMaxBytes } });
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.post(
    '/',
    {
      schema: {
        ...secured('uploads'),
        summary:
          'Upload one image (multipart field "file"); ?folder=service-groups|organization-logos|quote-headers',
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['folder'],
          properties: { folder: { type: 'string', enum: FOLDERS } },
        },
        response: { 201: envelope(fileResponse), ...ERROR_RESPONSES },
      },
    },
    async (request, reply) => {
      const part = await request.file();
      if (!part)
        throw new BadRequestError('Choose a file', [{ field: 'file', message: 'Choose a file' }]);
      const type = IMAGE_TYPES[part.mimetype];
      let buffer;
      try {
        buffer = await part.toBuffer();
      } catch {
        throw new BadRequestError('The file is too large', [
          {
            field: 'file',
            message: `Use an image up to ${Math.round(env.uploadMaxBytes / 1024 / 1024)} MB`,
          },
        ]);
      }
      if (!type || !type.magic(buffer)) {
        throw new BadRequestError('Unsupported file', [
          { field: 'file', message: 'Use a PNG, JPG, WEBP or GIF image' },
        ]);
      }

      const docType = await prisma.parameter.findFirst({
        where: {
          code: FOLDER_DOC_TYPES[request.query.folder],
          parameter_type: { code: 'FILE_DOC_TYPE' },
        },
        select: { parameter_id: true },
      });
      const relative = `${request.query.folder}/${randomUUID()}.${type.ext}`;
      const absolute = path.join(uploadRoot(), relative);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, buffer);
      try {
        const row = await prisma.file_doc.create({
          data: {
            name: path.basename(part.filename || `image.${type.ext}`).slice(0, 255),
            path: relative,
            file_doc_type_id: docType?.parameter_id ?? null,
            mime_type: part.mimetype,
            size_bytes: buffer.length,
            created_by: request.user?.uid ? BigInt(request.user.uid) : null,
          },
          select: { file_doc_id: true, name: true, mime_type: true, size_bytes: true },
        });
        return reply.status(201).send(
          success(
            {
              id: Number(row.file_doc_id),
              name: row.name,
              mimeType: row.mime_type,
              sizeBytes: Number(row.size_bytes),
            },
            'File uploaded',
          ),
        );
      } catch (error) {
        await unlink(absolute).catch(() => {});
        throw error;
      }
    },
  );

  app.get(
    '/:id',
    { schema: { ...secured('uploads'), summary: 'Download a file', params: integerParams } },
    async (request, reply) => {
      const row = await prisma.file_doc.findFirst({
        where: { file_doc_id: BigInt(request.params.id), deleted_at: null },
        select: { path: true, mime_type: true, name: true },
      });
      if (!row) throw new NotFoundError('File not found');
      const absolute = path.resolve(uploadRoot(), row.path);
      // Never serve anything outside the upload folder.
      if (!absolute.startsWith(uploadRoot() + path.sep)) throw new NotFoundError('File not found');
      try {
        await stat(absolute);
      } catch {
        throw new NotFoundError('File not found');
      }
      reply
        .header('Content-Type', row.mime_type || 'application/octet-stream')
        .header('Cache-Control', 'private, max-age=86400')
        .header('Content-Disposition', `inline; filename="${encodeURIComponent(row.name)}"`);
      return reply.send(createReadStream(absolute));
    },
  );
}
