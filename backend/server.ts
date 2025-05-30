import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { authRoutes } from "./routes/auth";
import { registerRoutes } from "./routes/register";
import { clientChatRoutes } from "./routes/client-chats";
import { agentChatRoutes } from "./routes/agent-chats";
import { messageRoutes } from "./routes/messages";
import * as dotenv from "dotenv";
import { connectedUsers } from "./utils/connections";

dotenv.config();

const fastify = Fastify();
const wss = new WebSocketServer({ noServer: true });

fastify.register(cors, {
  origin: ["http://127.0.0.1:8080", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

function getRawUrl(req: any): string {
  return req?.raw?.req?.url || req?.raw?.url || req?.url || '';
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
    connectedUsers[user.id] = { role: user.role, socket: ws };

    ws.on("message", (msg) => {
      console.log(`Received from ${user.id}:`, msg.toString());
    });

    ws.send(JSON.stringify({ type: "WELCOME", message: "WebSocket connected!" }));
  } catch (err) {
    console.error("WebSocket auth error:", err);
    ws.close(4001, "Invalid token");
  }
});


// Start server
fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
