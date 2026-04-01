export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface OnlinePlayer {
  userId: number;
  username: string;
  socketId: string;
}

export interface ChatMessage {
  id: number;
  content: string;
  conversationId: number;
  userId: number;
  createdAt: Date | string;
  user: {
    id: number;
    username: string;
  };
}

export interface TypingData {
  userId: number | string;
  isTyping: boolean;
}

export interface MessagesReadData {
  messageIds: (string | number)[];
  userId: number | string;
}

export interface ProfileUpdateData {
  userId: number;
  avatar?: string;
  tankColor?: string;
  username?: string;
}

export interface RoomParticipantsData {
  userIds: number[];
}

export interface WebSocketEventMap {
  'online-players-update': OnlinePlayer[];
  'user-joined': { userId: number };
  'user-left': { userId: number };
  'new-message': ChatMessage;
  'user-typing': TypingData;
  'messages-read': MessagesReadData;
  'user-profile-updated': ProfileUpdateData;
  'room-participants': RoomParticipantsData;
  'force-logout': { reason: string };
  'connect': void;
  'disconnect': void;
  'connect_error': { message: string };
  'reconnect': number;
  'reconnect_attempt': number;
  'reconnect_failed': void;
}

export interface SocketEvents {
  'join-game': (data: { userId: string; username: string }) => void;
  'join-private-room': (data: { conversationId: string; userId: string }) => void;
  'leave-private-room': (data: { conversationId: string }) => void;
  'private-message': (data: { conversationId: string; content: string; userId: string }) => void;
  'typing': (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'mark-messages-read': (data: { conversationId: string; messageIds: string[]; userId: string }) => void;
  'profile-update': (data: { userId: number; updates: Partial<ProfileUpdateData> }) => void;
  'player-disconnect': (data: { userId: string }) => void;
}

export interface ReconnectionInfo {
  attempts: number;
  maxAttempts: number;
  lastAttemptTime: number;
  nextRetryDelay: number;
}

export interface HeartbeatConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
}

export interface WebSocketConfig {
  url: string;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
  transports: ('websocket' | 'polling')[];
  heartbeat: HeartbeatConfig;
}

export interface MessageAck {
  success: boolean;
  error?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}