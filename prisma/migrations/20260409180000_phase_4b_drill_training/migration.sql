-- AlterEnum: add drill to SimulationMode
ALTER TYPE "SimulationMode" ADD VALUE 'drill';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "drillPlan" JSONB;

-- CreateTable
CREATE TABLE "UserTrainingFocus" (
    "userId" TEXT NOT NULL,
    "focusSkills" JSONB NOT NULL,
    "sessionsRemaining" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'user',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTrainingFocus_pkey" PRIMARY KEY ("userId")
);
