import { env } from './config/env.js';
import { disconnectPrisma, getPrisma } from './config/db.js';
import { buildApp } from './app.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  const app = await buildApp({ prisma: getPrisma() });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down');
    const forceExit = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();
    try {
      await app.close(); // stops accepting connections and waits for in-flight requests
      await disconnectPrisma();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await app.listen({ host: env.host, port: env.port });
}

start().catch((error) => {
  // The logger may not exist yet if startup failed early (e.g. missing environment variables).
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
