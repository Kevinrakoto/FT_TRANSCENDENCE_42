// server/websocket-utils.ts

import { Server, Socket } from 'socket.io';

interface Room {
  id: string;
  sockets: Set<string>;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface BroadcastOptions {
  rooms?: string[];
  except?: string[];
  includeSelf?: boolean;
}

export class WebSocketManager {
  private rooms: Map<string, Room> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private io: Server;

  private readonly RATE_LIMIT_WINDOW = 1000;
  private readonly MAX_MESSAGES_PER_WINDOW = 20;
  private readonly ROOM_MAX_SIZE = 100;

  constructor(io: Server) {
    this.io = io;
    this.setupPingPong();
  }

  private setupPingPong() {
    this.io.on('connection', (socket: Socket) => {
      socket.on('ping', (data: { timestamp: number }, callback?: () => void) => {
        if (callback) {
          callback();
        }
      });
    });
  }

  createRoom(roomId: string, metadata?: Record<string, unknown>): boolean {
    if (this.rooms.has(roomId)) {
      return false;
    }

    this.rooms.set(roomId, {
      id: roomId,
      sockets: new Set(),
      createdAt: Date.now(),
      metadata,
    });

    return true;
  }

  joinRoom(socket: Socket, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (room.sockets.size >= this.ROOM_MAX_SIZE) {
      return false;
    }

    socket.join(roomId);
    room.sockets.add(socket.id);

    const userRooms = this.userRooms.get(socket.id) || new Set();
    userRooms.add(roomId);
    this.userRooms.set(socket.id, userRooms);

    return true;
  }

  leaveRoom(socket: Socket, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    socket.leave(roomId);
    room.sockets.delete(socket.id);

    const userRooms = this.userRooms.get(socket.id);
    if (userRooms) {
      userRooms.delete(roomId);
    }

    if (room.sockets.size === 0) {
      this.rooms.delete(roomId);
    }

    return true;
  }

  leaveAllRooms(socket: Socket) {
    const userRooms = this.userRooms.get(socket.id);
    if (userRooms) {
      userRooms.forEach((roomId) => {
        this.leaveRoom(socket, roomId);
      });
      this.userRooms.delete(socket.id);
    }

    const socketRooms = socket.rooms;
    socketRooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        this.leaveRoom(socket, roomId);
      }
    });
  }

  getRoomMembers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.sockets);
  }

  getRoomCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room ? room.sockets.size : 0;
  }

  checkRateLimit(socket: Socket, event: string): boolean {
    const key = `${socket.id}:${event}`;
    const now = Date.now();

    const entry = this.rateLimits.get(key);
    if (!entry || now > entry.resetTime) {
      this.rateLimits.set(key, {
        count: 0,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
    }

    const currentEntry = this.rateLimits.get(key)!;
    if (currentEntry.count >= this.MAX_MESSAGES_PER_WINDOW) {
      return false;
    }

    currentEntry.count++;
    return true;
  }

  broadcast(event: string, data: unknown, options: BroadcastOptions = {}) {
    const { rooms = [], except = [], includeSelf = true } = options;

    if (rooms.length > 0) {
      const namespace = this.io.to(Array.from(rooms));

      if (!includeSelf && except.length > 0) {
        except.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.volatile.emit(event, data);
          }
        });
      } else {
        namespace.volatile.emit(event, data);
      }
    } else {
      if (!includeSelf && except.length > 0) {
        this.io.except(except).volatile.emit(event, data);
      } else {
        this.io.volatile.emit(event, data);
      }
    }
  }

  emitToRoom(roomId: string, event: string, data: unknown) {
    this.io.to(roomId).volatile.emit(event, data);
  }

  emitToUser(socketId: string, event: string, data: unknown) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.volatile.emit(event, data);
    }
  }

  validateMessage(message: string, maxLength = 1000): { valid: boolean; error?: string } {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Invalid message format' };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > maxLength) {
      return { valid: false, error: `Message exceeds maximum length of ${maxLength} characters` };
    }

    return { valid: true };
  }

  sanitizeMessage(message: string): string {
    return message
      .trim()
      .replace(/[<>]/g, '')
      .slice(0, 1000);
  }
}

export function setupRoomHandlers(io: Server) {
  const manager = new WebSocketManager(io);

  io.on('connection', (socket: Socket) => {
    socket.on('join-room', (data: { roomId: string; metadata?: Record<string, unknown> }, callback) => {
      if (!data?.roomId) {
        if (callback) callback({ success: false, error: 'Room ID required' });
        return;
      }

      const roomId = data.roomId;

      if (!manager['rooms'].has(roomId)) {
        manager.createRoom(roomId, data.metadata);
      }

      const success = manager.joinRoom(socket, roomId);

      if (callback) {
        callback({
          success,
          memberCount: manager.getRoomCount(roomId),
          error: success ? undefined : 'Failed to join room',
        });
      }
    });

    socket.on('leave-room', (data: { roomId: string }, callback) => {
      if (!data?.roomId) {
        if (callback) callback({ success: false, error: 'Room ID required' });
        return;
      }

      const success = manager.leaveRoom(socket, data.roomId);

      if (callback) {
        callback({ success });
      }
    });

    socket.on('get-room-members', (data: { roomId: string }, callback) => {
      if (!data?.roomId) {
        if (callback) callback({ members: [] });
        return;
      }

      const members = manager.getRoomMembers(data.roomId);

      if (callback) {
        callback({ members });
      }
    });

    socket.on('broadcast', (data: { event: string; data: unknown; roomId?: string }, callback) => {
      if (!data?.event || !manager.checkRateLimit(socket, 'broadcast')) {
        if (callback) callback({ success: false, error: 'Rate limited' });
        return;
      }

      const sanitizedEvent = manager.sanitizeMessage(data.event);
      const { valid, error } = manager.validateMessage(JSON.stringify(data.data));

      if (!valid) {
        if (callback) callback({ success: false, error });
        return;
      }

      if (data.roomId) {
        manager.emitToRoom(data.roomId, sanitizedEvent, data.data);
      } else {
        manager.broadcast(sanitizedEvent, data.data, { includeSelf: false, except: [socket.id] });
      }

      if (callback) {
        callback({ success: true });
      }
    });

    socket.on('disconnect', () => {
      manager.leaveAllRooms(socket);
    });
  });

  return manager;
}