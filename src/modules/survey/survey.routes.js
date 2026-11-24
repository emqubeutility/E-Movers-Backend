import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { success } from '../../utils/response.js';
import {
  completeSurveySchema,
  dropSurveySchema,
  getSurveySchema,
  saveSurveySchema,
} from './survey.schema.js';

/** The survey of a service request: /service-requests/:id/survey. */
export default async function surveyRoutes(app) {
  const service = app.surveyService;
  const can = (action) => requirePermission(MENU.SERVICE_REQUESTS, action);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.get(
    '/:id/survey',
    { schema: getSurveySchema, preHandler: can(ACTION.VIEW) },
    async (request) =>
      success(await service.get(request.params.id, request.user), 'Survey retrieved'),
  );
  app.put(
    '/:id/survey',
    { schema: saveSurveySchema, preHandler: can(ACTION.EDIT) },
    async (request) =>
      success(await service.save(request.params.id, request.body, request.user), 'Survey saved'),
  );
  app.post(
    '/:id/survey/complete',
    { schema: completeSurveySchema, preHandler: can(ACTION.EDIT) },
    async (request) =>
      success(
        await service.complete(request.params.id, request.body, request.user),
        'Survey completed',
      ),
  );
  app.post(
    '/:id/survey/drop',
    { schema: dropSurveySchema, preHandler: can(ACTION.EDIT) },
    async (request) =>
      success(await service.drop(request.params.id, request.body, request.user), 'Survey dropped'),
  );
}
