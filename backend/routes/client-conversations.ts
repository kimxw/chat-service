import { FastifyInstance } from "fastify";
import { createClientConversation } from "../services/client-service";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";

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

      if (!businessId)
        return reply.code(400).send({ message: "Missing businessId" });

      const { userId } = verifyJWT(request, reply);

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
