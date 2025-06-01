  import { FastifyInstance } from "fastify";
  import prisma from "../utils/db";
  import { markMessageReadByAgent, markMessageReadByCustomer } from "./messages";
  
  export async function generalUserServicesRoutes(fastify: FastifyInstance) {
    fastify.patch<{
    Params: { conversationId: string; role: 'CUSTOMER' | 'AGENT' }
  }>('/conversations/:conversationId/markAllAsRead/:role', async (request, reply) => {
    const { conversationId, role } = request.params;
    try {
      const convId = BigInt(conversationId);

      // Fetch all unread messages for this role
      let unreadMessages;
      if (role === 'CUSTOMER') {
        unreadMessages = await prisma.message.findMany({
          where: {
            conversationId: convId,
            readByCustomer: false,
          },
          select: { id: true },
        });
      } else {
        unreadMessages = await prisma.message.findMany({
          where: {
            conversationId: convId,
            readByAgents: false,
          },
          select: { id: true },
        });
      }

      for (const msg of unreadMessages) {
        if (role === 'CUSTOMER') {
          await markMessageReadByCustomer(convId, msg.id);
        } else {
          await markMessageReadByAgent(convId, msg.id);
        }
      }

      reply.send({ success: true, count: unreadMessages.length });
    } catch (err) {
      console.error(err);
      reply.status(500).send({ error: 'Failed to mark all messages as read' });
    }
  });
}