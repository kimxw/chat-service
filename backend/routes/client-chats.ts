import { FastifyInstance } from "fastify";
import { createClientChat, getClientChats } from "../services/client-service";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";
import prisma from "../utils/db";

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
      const business = await prisma.business.findUnique({
        where: { id: parsedBusinessId },
      });
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

      reply.send({ newParticipantEntry: serializedNewParticipantEntry });
    } catch (err: any) {
      console.error(err);
      reply.code(500).send("Internal server error RAAA");
    }
  });
}
