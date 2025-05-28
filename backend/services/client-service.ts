import prisma from "../utils/db";

export const createClientChat = async (
  businessId: bigint,
  userId: bigint,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "CLIENT")
    throw new Error("Only CLIENT users can create conversations");

  // 1) Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      businessId: businessId,
      type: "SUPPORT_ROOM",
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
      conversation: true,  // fetch the nested conversation object
    },
  });

  return participant;
};




export const getClientChats = async (
  userId: bigint,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "CLIENT")
    throw new Error("Only CLIENT users can create conversations");

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
