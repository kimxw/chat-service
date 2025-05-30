import { FastifyInstance } from "fastify";
import { createClientChat, getClientChats } from "../services/client-service";
import { getBusiness } from "../services/business-services";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";
import { connectedUsers } from "../utils/connections";

export async function clientChatRoutes(fastify: FastifyInstance) {
  fastify.get("/getClientChats", async (request, reply) => {
    const { userId } = verifyJWT(request, reply);
      
    const userAsParticipantList = await getClientChats(  //conversations is trype array
      userId,
    );

    const serialisedUserAsParticipantList = userAsParticipantList.map(serialiseBigInts)

    return reply.send({
      success: true,
      userAsParticipantList: serialisedUserAsParticipantList,
    });
  });

  fastify.post("/createClientChat", async (request, reply) => {
    try {
      const { businessId } = request.body as { businessId: string };
      if (!businessId) {
        return reply.code(400).send({ message: "Missing businessId" });
      }
      const parsedBusinessId = BigInt(businessId);
      const business = await getBusiness(parsedBusinessId);
      if (!business) {
        return reply
          .status(400)
          .send({ error: `Business with id ${businessId} does not exist` });
      }
      
      const { userId } = verifyJWT(request, reply);
      
      const newParticipantEntry = await createClientChat(
        BigInt(businessId),
        userId,
      );

      const serializedNewParticipantEntry = serialiseBigInts(newParticipantEntry);

      Object.values(connectedUsers).forEach(user => {
        if (user?.socket?.readyState === 1 && user.role === 'AGENT') {
          user.socket.send(JSON.stringify({
            type: "REFRESH_CHATS",
            message: "A new chat has been created. Please refresh.",
          }));
        }
      });

      reply.send({ newParticipantEntry: serializedNewParticipantEntry });
    } catch (err: any) {
      console.error(err);
      reply.code(500).send("Internal server error RAAA");
    }
  });
}
