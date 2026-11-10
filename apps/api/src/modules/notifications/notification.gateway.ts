import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { verifyAccessToken } from '../../common/utils/token.js';

let io: Server | null = null;

export const attachNotificationGateway = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: [env.FRONTEND_URL, env.ADMIN_URL], credentials: true },
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.accessToken;
    if (typeof token !== 'string') {
      next(new Error('Authentication is required.'));
      return;
    }
    try {
      const auth = verifyAccessToken(token);
      socket.data.userId = auth.sub;
      socket.data.role = auth.role;
      next();
    } catch {
      next(new Error('The access token is invalid or expired.'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });
  return io;
};

export const emitNotification = (recipientId: string, notification: unknown) => {
  io?.to(`user:${recipientId}`).emit('notification:new', notification);
};
