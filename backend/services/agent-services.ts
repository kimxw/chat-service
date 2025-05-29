import prisma from "../utils/db";

export const addAgentToChat = async (
  businessId: bigint,
  conversationId : bigint,
) => {
const agents = await prisma.user.findMany({
    where: {
      businessId: businessId,
      role: "AGENT",
    },
  });

  if (agents.length > 0) {
    await prisma.participant.createMany({
      data: agents.map(agent => ({
        conversationId: conversationId,
        userId: agent.id,
        role: "AGENT",
      })),
      skipDuplicates: true, // Just in case!
    });
  }
}

export const getAgentChats = async (
  userId: bigint,
) => {
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
