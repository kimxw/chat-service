import { FastifyInstance } from "fastify";
import { getAgentChats } from "../services/agent-services";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";

export async function agentChatRoutes(fastify: FastifyInstance) {
  fastify.get("/getAgentChats", async (request, reply) => {
    const { userId } = verifyJWT(request, reply);
      
    const userAsParticipantList = await getAgentChats(  
      userId,
    );

    const serialisedUserAsParticipantList = userAsParticipantList.map(serialiseBigInts)

    return reply.send({
      success: true,
      userAsParticipantList: serialisedUserAsParticipantList,
    });
  });
}
