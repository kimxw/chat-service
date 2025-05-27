import { FastifyInstance } from "fastify";
import { createClientConversation } from "../services/client-service";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";
import prisma from "../utils/db";

export async function clientChatRoutes(fastify: FastifyInstance) {
  fastify.post("/getClientConversations", async (request, reply) => {
    console.log("Received POST /conversations with body:", request.body);

    return reply.send({
      success: true,
      message: "Dummy conversations response",
      conversations: [
        {
          id: "1",
          business: "Business A",
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          business: "Business B",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  fastify.post("/createClientConversation", async (request, reply) => {
    console.log("calling function1");
    try {
      const { businessId } = request.body as { businessId: string };
      if (!businessId) {
        return reply.code(400).send({ message: "Missing businessId" });
      }
      const parsedBusinessId = BigInt(businessId);
      const business = await prisma.business.findUnique({
        where: { id: parsedBusinessId },
      });
      if (!business) {
        return reply
          .status(400)
          .send({ error: `Business with id ${businessId} does not exist` });
      }
      
      console.log("calling function1");
      const { userId } = verifyJWT(request, reply);
      console.log("calling function1");
      
      const conversation = await createClientConversation(
        BigInt(businessId),
        userId,
      );

      const serializedConversation = serialiseBigInts(conversation);

      reply.send({ conversation: serializedConversation });
    } catch (err: any) {
      console.error(err);
      reply.code(500).send("Internal server error RAAA");
    }
  });
}
