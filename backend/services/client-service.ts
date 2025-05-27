import prisma from "../utils/db";

export const createClientConversation = async (
  businessId: bigint,
  userId: bigint,
) => {
  // Check if the user is a client (optional strictness)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "CLIENT")
    throw new Error("Only CLIENT users can create conversations");

  const conversation = await prisma.conversation.create({
    data: {
      businessId: businessId,
      type: "SUPPORT_ROOM",
      participants: {
        create: [
          {
            userId: userId,
            role: "CUSTOMER",
          },
        ],
      },
    },
    include: {
      participants: true,
    },
  });

  return conversation;
};
