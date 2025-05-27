import { FastifyInstance } from "fastify";
// import bcrypt from "bcrypt";
// import * as dotenv from 'dotenv';
// dotenv.config();

import prisma from "../utils/db";

export async function chatRoutes(fastify: FastifyInstance) {
  // Create a new conversation (SUPPORT_ROOM) for the client given a businessId
  fastify.post("/conversations", async (request, reply) => {
    // Just log the received body (which is empty in your example)
    console.log("Received POST /conversations with body:", request.body);

    // Respond with dummy conversation list or confirmation
    return reply.send({
      success: true,
      message: "Dummy conversations response",
      conversations: [
        { id: "1", business: "Business A", createdAt: new Date().toISOString()},
        { id: "2", business: "Business B", createdAt: new Date().toISOString()},
      ],
    });
  });

  fastify.post("/createConversation", async (request, reply) => {
    // Log the body (will be empty in your current example)
    console.log("Received POST /createConversation with body:", request.body);

    // Create a dummy conversation (replace this with real logic later!)
    const dummyConversation = {
        id: Math.floor(Math.random() * 10000), // Random ID for testing
        business: "Business C",
        createdAt: new Date().toISOString(),
    };

    // Respond with the dummy conversation
    reply.send({ conversation: dummyConversation });
    });

}
