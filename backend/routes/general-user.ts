import { FastifyInstance } from "fastify";
import prisma from "../utils/db";
import { markMessageReadByAgent, markMessageReadByCustomer } from "./messages";
import { getParticipantListOfConversation } from "../services/message-service";
import serialiseBigInts from "../utils/serialiser";
import { connectedUsers } from "../utils/connections";

export async function generalUserServicesRoutes(fastify: FastifyInstance) {
  fastify.get("/presence/online-users", async (request, reply) => {
    const onlineUsers = Object.entries(connectedUsers).map(
      ([userId, { role }]) => ({
        userId,
        role,
      }),
    );

    return serialiseBigInts(onlineUsers);
  });

  fastify.patch<{
    Params: { conversationId: string; role: "CUSTOMER" | "AGENT" };
  }>(
    "/conversations/:conversationId/markAllAsRead/:role",
    async (request, reply) => {
      const { conversationId, role } = request.params;
      try {
        const convId = BigInt(conversationId);

        // Fetch all unread messages for this role
        let unreadMessages;
        if (role === "CUSTOMER") {
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
          if (role === "CUSTOMER") {
            await markMessageReadByCustomer(convId, msg.id);
          } else {
            await markMessageReadByAgent(convId, msg.id);
          }
        }

        reply.send({ success: true, count: unreadMessages.length });
      } catch (err) {
        console.error(err);
        reply
          .status(500)
          .send({ error: "Failed to mark all messages as read" });
      }
    },
  );

  fastify.get(
    "/conversations/:conversationId/participants",
    async (request, reply) => {
      try {
        const { conversationId } = request.params as { conversationId: string };
        const participants = await getParticipantListOfConversation(
          BigInt(conversationId),
        );
        // console.log(serialiseBigInts(participants));
        reply.send(serialiseBigInts(participants));
      } catch (error) {
        console.error(
          "Error in POST /conversations/:conversationId/messages:",
          error,
        );
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.post("/conversations/:id/typing", async (req, res) => {
    const { id: conversationId } = req.params as { id: string };
    const { userId, username, isTyping } = req.body as {
      userId: string;
      username: string;
      isTyping: boolean;
    };

    // console.log(req.body);

    try {
      const participantList = await getParticipantListOfConversation(
        BigInt(conversationId),
      );
      const participantUserIds = participantList.map((p) =>
        p.userId.toString(),
      );

      for (const [connectedUserId, user] of Object.entries(connectedUsers)) {
        if (
          user?.socket?.readyState === 1 &&
          participantUserIds.includes(connectedUserId)
        ) {
          user.socket.send(
            JSON.stringify({
              type: "TYPING",
              message: serialiseBigInts({
                conversationId,
                userId,
                username,
                isTyping,
              }),
            }),
          );
        }
      }

      res.send({ success: true });
    } catch (error) {
      console.error("Error in typing endpoint:", error);
      res.status(500).send({ success: false, error: error.message });
    }
  });
}
