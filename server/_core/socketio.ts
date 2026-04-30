/**
 * Socket.IO singleton — exposes the io instance to routers
 * The server already initializes Socket.IO via webrtc.ts
 * This module lets routers emit events without circular imports
 */
import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function setIO(io: SocketIOServer) {
  _io = io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}
