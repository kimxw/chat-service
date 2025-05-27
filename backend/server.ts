import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import jwt from "jsonwebtoken";
import { authRoutes } from "./routes/auth";
import { registerRoutes } from "./routes/register";
import * as dotenv from "dotenv";

dotenv.config();

const fastify = Fastify();
fastify.register(fastifyWebsocket);

fastify.register(cors, {
  origin: ["http://127.0.0.1:8080"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
});

authRoutes(fastify);
registerRoutes(fastify);

// WebSocket route
fastify.get("/ws", { websocket: true }, (conn, req) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      conn.socket.close(4001, "Unauthorized");
      return;
    }

    const token = authHeader.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    // console.log("Authenticated user:", user);

    conn.socket.on("message", (msg) => {
      console.log(`Received from ${user.sub}:`, msg.toString());
    });
  } catch (err) {
    conn.socket.close(4001, "Invalid token");
  }
});

// Start server
fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
