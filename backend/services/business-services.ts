import prisma from "../utils/db";

export const getBusiness = async (businessId: bigint) => {
  return prisma.business.findUnique({
    where: { id: businessId },
  });
};

export const getAllBusiness = async() => {
  return await prisma.business.findMany();
};