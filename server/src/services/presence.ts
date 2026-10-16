import { Server } from 'socket.io';

const onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>
let ioInstance: Server | null = null;

export function setPresenceIo(io: Server) {
  ioInstance = io;
}

export function registerUserSocket(userId: string, socketId: string) {
  if (!userId) return;
  let sockets = onlineUsers.get(userId);
  if (!sockets) {
    sockets = new Set();
    onlineUsers.set(userId, sockets);
  }
  sockets.add(socketId);
}

export function removeUserSocket(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

export function removeSocketId(socketId: string) {
  for (const [userId, sockets] of onlineUsers.entries()) {
    if (sockets.has(socketId)) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
      }
    }
  }
}

export function isUserOnline(userId: string): boolean {
  if (!userId) return false;
  const sockets = onlineUsers.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

export function getUserSocketIds(userId: string): string[] {
  const sockets = onlineUsers.get(userId);
  return sockets ? Array.from(sockets) : [];
}

export function emitToUser(userId: string, event: string, data: any) {
  if (!ioInstance) return;
  const socketIds = getUserSocketIds(userId);
  for (const sid of socketIds) {
    ioInstance.to(sid).emit(event, data);
  }
}
