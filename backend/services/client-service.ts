import { ConversationType } from "@prisma/client";
import prisma from "../utils/db";
import { addAgentToChat } from "./agent-services";

export const createClientChat = async (
  businessId: bigint,
  userId: bigint,
  conversationType: ConversationType,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "CUSTOMER")
    throw new Error("Only CUSTOMER users can create conversations");

  // 1) Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      businessId: businessId,
      type: conversationType,
    },
  });

  // 2) Create participant referencing conversation id
  const participant = await prisma.participant.create({
    data: {
      conversationId: conversation.id,
      userId: userId,
      role: "CUSTOMER",
    },
    include: {
      conversation: {
        include: {
          business: true,
        },
      },
    },
  });

  // 3) make all agents from that business participiants in this conversation
  await addAgentToChat(businessId, conversation.id);

  return participant;
};

export const getClientChats = async (userId: bigint) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "CUSTOMER")
    throw new Error("Unexpected error. Current user is not of role CUSTOMER");

  const participants = await prisma.participant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          business: true, // get business name if needed
        },
      },
    },
  });

  return participants;
};
