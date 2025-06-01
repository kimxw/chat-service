/*
  Warnings:

  - You are about to drop the column `lastReadAt` on the `Participant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readByAgents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readByCustomer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "lastReadAt";
