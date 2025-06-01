import { FastifyInstance } from "fastify";
import { createClientChat, getClientChats } from "../services/client-service";
import { getBusiness } from "../services/business-services";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";
import { connectedUsers } from "../utils/connections";
import { ConversationType } from "@prisma/client";

export async function clientChatRoutes(fastify: FastifyInstance) {
  fastify.get("/getClientChats", async (request, reply) => {
    const { userId } = verifyJWT(request, reply);

    const userAsParticipantList = await getClientChats(userId);

    const serialisedUserAsParticipantList =
      userAsParticipantList.map(serialiseBigInts);

    return reply.send({
      success: true,
      userAsParticipantList: serialisedUserAsParticipantList,
    });
  });

  fastify.post("/createClientChat", async (request, reply) => {
    try {
      const { businessId, conversationType } = request.body as {
        businessId: string;
        conversationType: string;
      };
      if (!businessId) {
        return reply.code(400).send({ error: "Missing businessId" });
      }
      const parsedBusinessId = BigInt(businessId);
      const business = await getBusiness(parsedBusinessId);
      if (!business) {
        return reply
          .status(400)
          .send({ error: `Business with id ${businessId} does not exist` });
      }

      if (!conversationType) {
        return reply.code(400).send({ error: "Missing conversationType" });
      }

      const { userId } = verifyJWT(request, reply);

      const newParticipantEntry = await createClientChat(
        parsedBusinessId,
        userId,
        conversationType.toUpperCase() as ConversationType, // This is the key!
      );

      const serializedNewParticipantEntry =
        serialiseBigInts(newParticipantEntry);

      Object.values(connectedUsers).forEach((user) => {
        if (user?.socket?.readyState === 1 && user.role === "AGENT") {
          user.socket.send(
            JSON.stringify({
              type: "REFRESH_CHATS",
              message: "A new chat has been created. Please refresh.",
            }),
          );
        }
      });

      reply.send({ newParticipantEntry: serializedNewParticipantEntry });
    } catch (err: any) {
      console.error(err);
      reply.code(500).send("Internal server error");
    }
  });
}
