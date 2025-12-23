/**
 * WebRTC Signaling Server for VaultLive
 * 
 * Handles peer-to-peer connections for live streaming:
 * - Broadcaster (creator) sends video/audio stream
 * - Viewers receive stream via WebRTC
 * - Signaling via Socket.IO
 * - No external media server required (P2P mesh)
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

interface StreamRoom {
  streamId: number;
  broadcasterId: string;
  broadcasterSocketId: string;
  viewers: Map<string, { socketId: string; userId?: number }>;
  startedAt: Date;
}

const activeStreams = new Map<number, StreamRoom>();

export function initializeWebRTC(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.VITE_FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
  });

  io.on('connection', (socket) => {
    console.log('[WebRTC] Client connected:', socket.id);

    // Broadcaster starts streaming
    socket.on('start-broadcast', ({ streamId, userId }: { streamId: number; userId: number }) => {
      console.log('[WebRTC] Start broadcast:', { streamId, userId, socketId: socket.id });

      const room: StreamRoom = {
        streamId,
        broadcasterId: userId.toString(),
        broadcasterSocketId: socket.id,
        viewers: new Map(),
        startedAt: new Date(),
      };

      activeStreams.set(streamId, room);
      socket.join(`stream-${streamId}`);

      socket.emit('broadcast-started', { streamId });
    });

    // Viewer joins stream
    socket.on('join-stream', ({ streamId, userId }: { streamId: number; userId?: number }) => {
      console.log('[WebRTC] Viewer joining:', { streamId, userId, socketId: socket.id });

      const room = activeStreams.get(streamId);
      if (!room) {
        socket.emit('stream-error', { message: 'Stream not found' });
        return;
      }

      // Add viewer to room
      room.viewers.set(socket.id, { socketId: socket.id, userId });
      socket.join(`stream-${streamId}`);

      // Notify broadcaster of new viewer
      io.to(room.broadcasterSocketId).emit('viewer-joined', {
        viewerId: socket.id,
        viewerCount: room.viewers.size,
      });

      // Send broadcaster socket ID to viewer for WebRTC connection
      socket.emit('broadcaster-ready', {
        broadcasterSocketId: room.broadcasterSocketId,
        viewerCount: room.viewers.size,
      });

      // Notify all viewers of updated count
      io.to(`stream-${streamId}`).emit('viewer-count-updated', {
        viewerCount: room.viewers.size,
      });
    });

    // WebRTC signaling: offer from broadcaster
    socket.on('webrtc-offer', ({ targetSocketId, offer }: { targetSocketId: string; offer: any }) => {
      console.log('[WebRTC] Forwarding offer to:', targetSocketId);
      io.to(targetSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        offer,
      });
    });

    // WebRTC signaling: answer from viewer
    socket.on('webrtc-answer', ({ targetSocketId, answer }: { targetSocketId: string; answer: any }) => {
      console.log('[WebRTC] Forwarding answer to:', targetSocketId);
      io.to(targetSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        answer,
      });
    });

    // WebRTC signaling: ICE candidate exchange
    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }: { targetSocketId: string; candidate: any }) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      });
    });

    // Viewer leaves stream
    socket.on('leave-stream', ({ streamId }: { streamId: number }) => {
      handleViewerLeave(socket.id, streamId, io);
    });

    // Broadcaster ends stream
    socket.on('end-broadcast', ({ streamId }: { streamId: number }) => {
      console.log('[WebRTC] End broadcast:', { streamId, socketId: socket.id });

      const room = activeStreams.get(streamId);
      if (room && room.broadcasterSocketId === socket.id) {
        // Notify all viewers
        io.to(`stream-${streamId}`).emit('broadcast-ended', { streamId });

        // Clean up room
        activeStreams.delete(streamId);
        socket.leave(`stream-${streamId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('[WebRTC] Client disconnected:', socket.id);

      // Check if disconnected client was a broadcaster
      for (const [streamId, room] of Array.from(activeStreams.entries())) {
        if (room.broadcasterSocketId === socket.id) {
          // Broadcaster disconnected - end stream
          io.to(`stream-${streamId}`).emit('broadcast-ended', { streamId });
          activeStreams.delete(streamId);
        } else if (room.viewers.has(socket.id)) {
          // Viewer disconnected
          handleViewerLeave(socket.id, streamId, io);
        }
      }
    });
  });

  console.log('[WebRTC] Signaling server initialized');
  return io;
}

function handleViewerLeave(socketId: string, streamId: number, io: SocketIOServer) {
  const room = activeStreams.get(streamId);
  if (!room) return;

  room.viewers.delete(socketId);

  // Notify broadcaster
  io.to(room.broadcasterSocketId).emit('viewer-left', {
    viewerId: socketId,
    viewerCount: room.viewers.size,
  });

  // Notify all viewers of updated count
  io.to(`stream-${streamId}`).emit('viewer-count-updated', {
    viewerCount: room.viewers.size,
  });
}

export function getActiveStreams() {
  return Array.from(activeStreams.entries()).map(([streamId, room]) => ({
    streamId,
    broadcasterId: room.broadcasterId,
    viewerCount: room.viewers.size,
    startedAt: room.startedAt,
  }));
}

export function getStreamViewerCount(streamId: number): number {
  const room = activeStreams.get(streamId);
  return room ? room.viewers.size : 0;
}
