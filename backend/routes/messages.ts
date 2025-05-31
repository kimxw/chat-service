import { FastifyInstance } from 'fastify';
import { getConversationMessages, getConversationFromId, findParticipantInConversation } from '../services/message-retrieval'
import prisma from '../utils/db';
import serialiseBigInts from '../utils/serialiser';

export async function messageRoutes(app: FastifyInstance) {

  app.get('/conversations/:conversationId/messages', async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const conversation = await getConversationMessages(BigInt(conversationId));

    if (!conversation) {
        console.log(`Conversation with id ${conversationId} not found`);
      return reply.status(404).send({ error: 'Conversation with given id not found' });
    }

    return reply.send(serialiseBigInts(conversation.messages));
  });


  app.post('/conversations/:conversationId/messages', async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const {
      senderId,
      body,
      fileUrl,
      mimeType,
      contentType = 'TEXT',
    } = request.body as {
      senderId: string;
      body?: string;
      fileUrl?: string;
      mimeType?: string;
      contentType?: 'TEXT' | 'FILE' | 'IMAGE' | 'VIDEO' | 'OTHER';
    };

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
    const participant =  await findParticipantInConversation(BigInt(conversationId), BigInt(senderId));
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
      },
    });

    console.log(`message validated ${body}`);

    
    return reply.status(201).send(serialiseBigInts({
      ...message,
      sender,  // Include the full sender object in the response
    }));

  });
}