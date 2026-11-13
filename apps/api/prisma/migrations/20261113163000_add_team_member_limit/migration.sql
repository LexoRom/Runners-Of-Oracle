-- AlterTable
ALTER TABLE "Team" ADD COLUMN "memberLimit" INTEGER NOT NULL DEFAULT 5;

-- CreateIndex
CREATE INDEX "Team_memberLimit_idx" ON "Team"("memberLimit");