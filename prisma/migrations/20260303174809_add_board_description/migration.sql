/*
  Warnings:

  - You are about to drop the column `invitedUserId` on the `board_invites` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "board_invites" DROP CONSTRAINT "board_invites_invitedUserId_fkey";

-- AlterTable
ALTER TABLE "board_invites" DROP COLUMN "invitedUserId",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "description" TEXT;

-- AddForeignKey
ALTER TABLE "board_invites" ADD CONSTRAINT "board_invites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
