import prisma from "../utils/db";
import { MessageContentType } from "@prisma/client";

export const getConversationMessages = async (
  conversationId: bigint,
) => {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, username: true, role: true } } },
        },
      },
    });
}

export const getConversationFromId = async (
  conversationId: bigint,
) => {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
}

export const findParticipantInConversation = async(
    conversationId : bigint,
    senderId : bigint,
) => {
    return await prisma.participant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationId,
          userId: senderId,
        },
      },
    });
}

export const createNewMessage = async (
    conversationId : bigint,
    senderId: bigint,
    body : string | null,
    fileUrl : string | null,  
    mimeType : string | null,  
    contentType: MessageContentType = "TEXT",
) => {
    return await prisma.message.create({
      data: {
        conversationId: BigInt(conversationId),
        senderId: BigInt(senderId),
        body,
        fileUrl,
        mimeType,
        contentType,
      },
    });
}