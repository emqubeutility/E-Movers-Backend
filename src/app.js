import Fastify from 'fastify';
import { buildLoggerOptions, genRequestId } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { registerRequestHooks } from './middlewares/request-logger.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import authRoutes from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createUserRepository } from './modules/user/user.repository.js';
import userRoutes from './modules/user/user.routes.js';
import { createUserService } from './modules/user/user.service.js';
import roleRoutes from './modules/role/role.routes.js';
import { createRoleRepository } from './modules/role/role.repository.js';
import { createRoleService } from './modules/role/role.service.js';
import permissionRoutes from './modules/permission/permission.routes.js';
import { createPermissionRepository } from './modules/permission/permission.repository.js';
import { createPermissionService } from './modules/permission/permission.service.js';
import menuAccessRoutes from './modules/menu-access/menuAccess.routes.js';
import { createMenuAccessRepository } from './modules/menu-access/menuAccess.repository.js';
import { createMenuAccessService } from './modules/menu-access/menuAccess.service.js';
import customerRoutes from './modules/customer/customer.routes.js';
import { createCustomerRepository } from './modules/customer/customer.repository.js';
import { createCustomerService } from './modules/customer/customer.service.js';
import companyRoutes from './modules/company/company.routes.js';
import organizationRoutes from './modules/organization/organization.routes.js';
import { createOrganizationRepository } from './modules/organization/organization.repository.js';
import { createOrganizationService } from './modules/organization/organization.service.js';
import { createCompanyRepository } from './modules/company/company.repository.js';
import { createCompanyService } from './modules/company/company.service.js';
import fileRoutes from './modules/file/file.routes.js';
import serviceRequestRoutes from './modules/service-request/service-request.routes.js';
import surveyRoutes from './modules/survey/survey.routes.js';
import { createSurveyRepository } from './modules/survey/survey.repository.js';
import { createSurveyService } from './modules/survey/survey.service.js';
import { createServiceRequestRepository } from './modules/service-request/service-request.repository.js';
import { createServiceRequestService } from './modules/service-request/service-request.service.js';
import crudRoutes from './modules/crud/crud.routes.js';
import { createCrudRepository, createLookupRepository } from './modules/crud/crud.repository.js';
import dropdownRoutes from './modules/dropdown/dropdown.routes.js';
import corsPlugin from './plugins/cors.js';
import helmetPlugin from './plugins/helmet.js';
import jwtPlugin from './plugins/jwt.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import swaggerPlugin from './plugins/swagger.js';
import { envelope, success } from './utils/response.js';

const healthSchema = {
  tags: ['system'],
  summary: 'Liveness and database check',
  response: {
    200: envelope({
      type: 'object',
      properties: {
        status: { type: 'string' },
        database: { type: 'string' },
        uptime: { type: 'number' },
      },
    }),
  },
};

/**
 * Builds the application. Tests pass in-memory repositories; production passes a Prisma client.
 */
export async function buildApp({ prisma, repositories = {}, checkDatabase } = {}) {
  const app = Fastify({
    logger: buildLoggerOptions(),
    genReqId: genRequestId,
    disableRequestLogging: true,
    trustProxy: true,
    // `additionalProperties: false` must reject the request, not silently drop the field.
    ajv: { customOptions: { removeAdditional: false } },
  });

  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);

  registerRequestHooks(app);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  const userRepository = repositories.userRepository || createUserRepository(prisma);
  const authRepository = repositories.authRepository || createAuthRepository(prisma);
  const roleRepository = repositories.roleRepository || createRoleRepository(prisma);
  const permissionRepository =
    repositories.permissionRepository || createPermissionRepository(prisma);
  const menuAccessRepository =
    repositories.menuAccessRepository || createMenuAccessRepository(prisma);
  const customerRepository = repositories.customerRepository || createCustomerRepository(prisma);
  const companyRepository = repositories.companyRepository || createCompanyRepository(prisma);
  const userService = createUserService({ userRepository });
  const roleService = createRoleService({ roleRepository });
  const permissionService = createPermissionService({ permissionRepository });
  const menuAccessService = createMenuAccessService({ menuAccessRepository });
  const customerService = createCustomerService({ customerRepository });
  const companyService = createCompanyService({ companyRepository });
  const organizationRepository =
    repositories.organizationRepository || createOrganizationRepository(prisma);
  const organizationService = createOrganizationService({ organizationRepository });
  const serviceRequestRepository =
    repositories.serviceRequestRepository || createServiceRequestRepository(prisma);
  const serviceRequestService = createServiceRequestService({ serviceRequestRepository });
  const surveyService = createSurveyService({
    serviceRequestRepository,
    surveyRepository: repositories.surveyRepository || createSurveyRepository(prisma),
  });
  const authService = createAuthService({
    userRepository,
    authRepository,
    userService,
    signAccessToken: (claims) => app.jwt.sign(claims),
  });
  app.decorate('userService', userService);
  app.decorate('authService', authService);
  app.decorate('roleService', roleService);
  app.decorate('permissionService', permissionService);
  app.decorate('menuAccessService', menuAccessService);
  app.decorate('customerService', customerService);
  app.decorate('companyService', companyService);
  app.decorate('organizationService', organizationService);
  app.decorate('serviceRequestService', serviceRequestService);
  app.decorate('surveyService', surveyService);

  const pingDatabase = checkDatabase || (() => prisma.$queryRaw`SELECT 1`);
  app.get('/health', { schema: healthSchema }, async (request, reply) => {
    try {
      await pingDatabase();
      return success({ status: 'ok', database: 'up', uptime: process.uptime() }, 'Healthy');
    } catch (error) {
      request.log.error({ err: error }, 'Database health check failed');
      return reply
        .status(503)
        .send({ success: false, message: 'Database unavailable', data: null, errors: null });
    }
  });

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(permissionRoutes, { prefix: '/api/v1/permissions' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(roleRoutes, { prefix: '/api/v1/roles' });
  await app.register(menuAccessRoutes, { prefix: '/api/v1/menu-access' });
  await app.register(customerRoutes, { prefix: '/api/v1/customers' });
  await app.register(companyRoutes, { prefix: '/api/v1/companies' });
  await app.register(organizationRoutes, { prefix: '/api/v1/organizations' });
  await app.register(serviceRequestRoutes, { prefix: '/api/v1/service-requests' });
  await app.register(surveyRoutes, { prefix: '/api/v1/service-requests' });
  await app.register(fileRoutes, { prefix: '/api/v1/uploads', prisma });

  // Generic CRUD for the remaining tables (one RBAC rule: menu_role via requirePermission).
  const lookups = repositories.lookups || createLookupRepository(prisma);
  await app.register(dropdownRoutes, { prefix: '/api/v1/dropdowns', lookups });
  await app.register(crudRoutes, {
    prefix: '/api/v1',
    lookups,
    createRepository:
      repositories.createCrudRepository || ((resource) => createCrudRepository(prisma, resource)),
  });

  return app;
}
