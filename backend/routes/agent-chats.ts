import { FastifyInstance } from "fastify";
import { getAgentChats } from "../services/agent-services";
import { removeAllParticipantsFromConversation } from "../services/agent-services";
import { verifyJWT } from "../utils/verifyJWT";
import serialiseBigInts from "../utils/serialiser";
import { connectedUsers } from "../utils/connections";

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

  fastify.delete("/deleteChatForAll", async (request, reply) => {
    try {
      const { userId } = verifyJWT(request, reply);
      const { conversationId } = request.body as { conversationId: string };

      if (!conversationId) {
        return reply.status(400).send({ success: false, message: "conversationId is required" });
      }

      await removeAllParticipantsFromConversation(BigInt(conversationId), userId);

      Object.values(connectedUsers).forEach(user => {
        if (user?.socket?.readyState === 1) {
          user.socket.send(JSON.stringify({
            type: "REFRESH_CHATS",
            message: "A chat has been deleted. Please refresh.",
          }));
        }
      });

      return reply.send({ success: true, message: "Chat deleted successfully" });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || "Unknown error" });
    }
  });

}
