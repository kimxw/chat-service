export const connectedUsers: {
  [userId: string]: { role: string; socket: WebSocket };
} = {};
