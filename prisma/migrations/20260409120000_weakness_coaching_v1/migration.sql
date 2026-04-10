-- CreateEnum
CREATE TYPE "SalesSkill" AS ENUM ('discovery_questions', 'objection_handling', 'product_knowledge', 'closing', 'storytelling', 'empathy');

-- CreateEnum
CREATE TYPE "SimulationMode" AS ENUM ('generic', 'adaptive');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('improving', 'declining', 'stable');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "simulationMode" "SimulationMode" NOT NULL DEFAULT 'generic';

-- CreateTable
CREATE TABLE "UserWeaknessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "SalesSkill" NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "trendDirection" "TrendDirection" NOT NULL,
    "lastSimulationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWeaknessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationSkillScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "conversationId" TEXT NOT NULL,
    "skill" "SalesSkill" NOT NULL,
    "score" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationSkillScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEvaluationSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "conversationId" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "avgMessageLength" DOUBLE PRECISION NOT NULL,
    "talkRatio" DOUBLE PRECISION NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "recommendedTips" JSONB NOT NULL,
    "rawEvaluatorOutput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationEvaluationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWeaknessProfile_userId_skill_key" ON "UserWeaknessProfile"("userId", "skill");

-- CreateIndex
CREATE INDEX "UserWeaknessProfile_userId_idx" ON "UserWeaknessProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationSkillScore_conversationId_skill_key" ON "SimulationSkillScore"("conversationId", "skill");

-- CreateIndex
CREATE INDEX "SimulationSkillScore_userId_idx" ON "SimulationSkillScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationEvaluationSummary_conversationId_key" ON "SimulationEvaluationSummary"("conversationId");

-- CreateIndex
CREATE INDEX "SimulationEvaluationSummary_userId_idx" ON "SimulationEvaluationSummary"("userId");

-- AddForeignKey
ALTER TABLE "SimulationSkillScore" ADD CONSTRAINT "SimulationSkillScore_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEvaluationSummary" ADD CONSTRAINT "SimulationEvaluationSummary_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
