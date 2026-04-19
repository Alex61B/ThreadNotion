-- CreateEnum
CREATE TYPE "TurnKind" AS ENUM ('FREE_TEXT', 'MCQ', 'WORD_BANK');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "turnKind" "TurnKind" NOT NULL DEFAULT 'FREE_TEXT';
