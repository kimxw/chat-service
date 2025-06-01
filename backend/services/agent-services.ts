import prisma from "../utils/db";

export const addAgentToChat = async (
  businessId: bigint,
  conversationId: bigint,
) => {
  const agents = await prisma.user.findMany({
    where: {
      businessId: businessId,
      role: "AGENT",
    },
  });

  if (agents.length > 0) {
    await prisma.participant.createMany({
      data: agents.map((agent) => ({
        conversationId: conversationId,
        userId: agent.id,
        role: "AGENT",
      })),
      skipDuplicates: true, // Just in case!
    });
  }
};

export const addAgentToAllConversations = async (
  businessId: bigint,
  agentUserId: bigint,
) => {
  const conversationsWithParticipants = await prisma.conversation.findMany({
    where: {
      businessId,
      participants: { some: {} },
    },
    select: { id: true },
  });

  if (conversationsWithParticipants.length === 0) return;

  await prisma.participant.createMany({
    data: conversationsWithParticipants.map((conv) => ({
      conversationId: conv.id,
      userId: agentUserId,
      role: "AGENT",
    })),
    skipDuplicates: true,
  });
};

export const getAgentChats = async (userId: bigint) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "AGENT")
    throw new Error("Unexpected error. Current user is not of role AGENT");

  const participants = await prisma.participant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          business: true, // get business name (necessary!)
        },
      },
    },
  });

  return participants;
};

export async function removeAllParticipantsFromConversation(
  conversationId: bigint,
  userId: bigint,
) {
  // Check if the user is a participant
  const participant = await prisma.participant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!participant) {
    throw new Error("You are not part of this conversation.");
  }

  // Delete all participants from the conversation
  await prisma.participant.deleteMany({
    where: { conversationId },
  });

  return {
    success: true,
    message: "All participants removed from conversation.",
  };
}
