import { FastifyInstance } from 'fastify';
import { getConversationMessages, getConversationFromId, findParticipantInConversation, getParticipantListOfConversation } from '../services/message-service'
import prisma from '../utils/db';
import serialiseBigInts from '../utils/serialiser';
import { connectedUsers } from '../utils/connections';

export async function messageRoutes(app: FastifyInstance) {

  app.get('/conversations/:conversationId/messages', async (request, reply) => {
    try {
      const { conversationId } = request.params as { conversationId: string };
      const conversation = await getConversationMessages(BigInt(conversationId));

      if (!conversation) {
          console.log(`Conversation with id ${conversationId} not found`);
        return reply.status(404).send({ error: 'Conversation with given id not found' });
      }

      return reply.send(serialiseBigInts(conversation.messages));
    } catch (error) {
      console.error('Error in POST /conversations/:conversationId/messages:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

app.post<{
  Params: { conversationId: string };
  Body: {
    senderId: string;
    body?: string;
    fileUrl?: string;
    mimeType?: string;
    contentType?: 'TEXT' | 'FILE' | 'IMAGE' | 'VIDEO' | 'OTHER';
    currentRole?: string;
  };
}>('/conversations/:conversationId/messages', async (request, reply) => {
  try {
    const { conversationId } = request.params;
    const { senderId, body, fileUrl, mimeType, contentType = 'TEXT', currentRole} = request.body;

    console.log("send pressed");

    // Validate Conversation
    const conversation = await getConversationFromId(BigInt(conversationId));
    if (!conversation) {
      console.log(`Conversation with id ${conversationId} not found`);
      return reply.status(404).send({ error: 'Conversation with given id not found' });
    }
    console.log("conversation validated");

    // Fetch the sender details (id and username)
    const sender = await prisma.user.findUnique({
      where: { id: BigInt(senderId) },
      select: { id: true, username: true },
    });

    if (!sender) {
      return reply.status(404).send({ error: 'Sender not found' });
    }

    // Validate Sender (must be participant in conversation)
    const participant = await findParticipantInConversation(BigInt(conversationId), BigInt(senderId));
    if (!participant) {
      return reply.status(403).send({ error: 'User is not a participant in this conversation' });
    }
    console.log("participant validated");

    // Validate content fields
    if (!body && !fileUrl) {
      return reply.status(400).send({ error: 'Message must have a body or a fileUrl' });
    }
    console.log(`body validated ${body}`);
    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: BigInt(conversationId),
        senderId: BigInt(senderId),
        body,
        fileUrl,
        mimeType,
        contentType,
        readByAgents: currentRole === "AGENT" ? true : false,
        readByCustomer: currentRole === "CUSTOMER" ? true : false,
      },
    });

    console.log(`message validated ${body}`);

    const participantList = await getParticipantListOfConversation(BigInt(conversationId));
    console.log("participant list generated:", participantList);
    const participantUserIds = participantList.map(participant => participant.userId.toString());
    console.log("participantUserIds generated:", participantUserIds);

    const eventType = currentRole == "CUSTOMER" ? "NEW_MESSAGE_BY_CUSTOMER" : "NEW_MESSAGE_BY_AGENT";

    // Notify all participants in the chat
    for (const [userId, user] of Object.entries(connectedUsers)) {
      console.log(userId);
      console.log(participantUserIds.includes(userId));
      console.log(user?.socket?.readyState === 1);
      if (
        user?.socket?.readyState === 1 &&
        participantUserIds.includes(userId)
      ) {
        console.log("message sent");
        user.socket.send(JSON.stringify({
          type: eventType,
          message: serialiseBigInts({
            ...message,
            sender,
          }),
        }));
      }
    }

    console.log("broadcast message sent");

    return reply.status(201).send(serialiseBigInts({
      ...message,
      sender,
    }));

  } catch (error) {
    console.error('Error in POST /conversations/:conversationId/messages:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});


app.patch<{
  Params: { conversationId: string; messageId: string }
}>('/conversations/:conversationId/messages/:messageId/read/customer', async (request, reply) => {
  const { conversationId, messageId } = request.params;
  try {
    console.log("TRYING TO UPDATE CUSTOMER STATUS");
    const updatedMessage = await prisma.message.update({
      where: { id: BigInt(messageId) },
      data: { readByCustomer: true },
    });
    console.log("UPDATED CUSTOMER STATUS IN BACKEND");

    const participantList = await getParticipantListOfConversation(BigInt(conversationId));
    const participantUserIds = participantList.map(participant => participant.userId.toString());
    console.log(participantUserIds);
    const serialisedMessage = serialiseBigInts(updatedMessage);
    
    // Notify all participants in the chat
    for (const [userId, user] of Object.entries(connectedUsers)) {
      if (
        user?.socket?.readyState === 1 &&
        participantUserIds.includes(userId)
      ) {
        user.socket.send(JSON.stringify({
          type: "UPDATED_READ_STATUS_OF_CUSTOMER",
          message: serialisedMessage,
        }));
      }
    }

    console.log("BROADCASTED MESSAGE ON CUSTOMER STATUS");

    reply.send({ success: true, message: serialisedMessage });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: 'Failed to mark message as read by customer' });
  }
});


app.patch<{
  Params: { conversationId: string; messageId: string }
}>('/conversations/:conversationId/messages/:messageId/read/agent', async (request, reply) => {
  const { conversationId, messageId } = request.params;
  try {
    const updatedMessage = await prisma.message.update({
      where: { id: BigInt(messageId) },
      data: { readByAgents: true },
    });

    const participantList = await getParticipantListOfConversation(BigInt(conversationId));
    const participantUserIds = participantList.map(participant => participant.userId.toString());
    const serialisedMessage = serialiseBigInts(updatedMessage);
    
    // Notify all participants in the chat
    for (const [userId, user] of Object.entries(connectedUsers)) {
      if (
        user?.socket?.readyState === 1 &&
        participantUserIds.includes(userId)
      ) {
        user.socket.send(JSON.stringify({
          type: "UPDATED_READ_STATUS_OF_AGENTS",
          message: serialisedMessage,
        }));
      }
    }

    reply.send({ success: true, message: serialisedMessage });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: 'Failed to mark message as read by agent' });
  }
});

app.get<{
  Params: { messageId: string }
}>('/messages/:messageId', async (request, reply) => {
  const { messageId } = request.params;

  try {
    const message = await prisma.message.findUnique({
      where: { id: BigInt(messageId) },
      include: {
        sender: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    reply.send({ success: true, message: serialiseBigInts(message) });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: 'Failed to fetch message' });
  }
});


}