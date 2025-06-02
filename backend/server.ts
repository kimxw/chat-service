import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { authRoutes } from "./routes/auth";
import { registerRoutes } from "./routes/register";
import { clientChatRoutes } from "./routes/client-chats";
import { agentChatRoutes } from "./routes/agent-chats";
import { messageRoutes } from "./routes/messages";
import { generalUserServicesRoutes } from "./routes/general";
import * as dotenv from "dotenv";
import { connectedUsers } from "./utils/connections";

dotenv.config();

const fastify = Fastify();
const wss = new WebSocketServer({ noServer: true });

fastify.register(cors, {
  origin: ["http://127.0.0.1:8080", "http://localhost:3000", "https://chat-service-hub.vercel.app"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});

fastify.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

authRoutes(fastify);
registerRoutes(fastify);
clientChatRoutes(fastify);
agentChatRoutes(fastify);
messageRoutes(fastify);
generalUserServicesRoutes(fastify);

function getRawUrl(req: any): string {
  return req?.raw?.req?.url || req?.raw?.url || req?.url || "";
}

// WebSocket connection
wss.on("connection", (ws, req) => {
  try {
    const rawUrl = req.url || "";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    const token = parsedUrl.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const user = jwt.verify(token, process.env.JWT_SECRET!);
    console.log("verified jwt");
    connectedUsers[user.id] = { role: user.role, socket: ws };
    console.log(Object.keys(connectedUsers).length);

    const presenceSnapshot = getPresenceSnapshot();
    ws.send(
      JSON.stringify({
        type: "PRESENCE_SNAPSHOT",
        usersOnline: presenceSnapshot,
      }),
    );
    console.log("PRESENCE_SNAPSHOT sent!");

    broadcastPresenceUpdate(user.id, true);

    ws.on("message", (msg) => {
      console.log(`Received from ${user.id}:`, msg.toString());
    });

    ws.on("close", () => {
      delete connectedUsers[user.id];
      broadcastPresenceUpdate(user.id, false);
    });

    ws.send(
      JSON.stringify({ type: "WELCOME", message: "WebSocket connected!" }),
    );
  } catch (err) {
    console.error("WebSocket auth error:", err);
    ws.close(4001, "Invalid token");
  }
});

function broadcastPresenceUpdate(userId, isOnline) {
  const message = JSON.stringify({
    type: "PRESENCE_UPDATE",
    userId,
    isOnline,
  });

  Object.values(connectedUsers).forEach(({ socket }) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
}

function getPresenceSnapshot() {
  const snapshot = {};
  for (const userId in connectedUsers) {
    snapshot[userId] = true;
  }
  return snapshot;
}

// Start server
fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});

fastify.get('/health', async () => ({ status: 'ok' }));