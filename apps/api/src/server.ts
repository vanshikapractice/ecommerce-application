import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { attachNotificationGateway } from './modules/notifications/notification.gateway.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
attachNotificationGateway(server);

const shutdown = (signal: string) => {
  console.log(`${signal} received; shutting down HTTP server`);
  server.close(() => {
    void prisma
      .$disconnect()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
