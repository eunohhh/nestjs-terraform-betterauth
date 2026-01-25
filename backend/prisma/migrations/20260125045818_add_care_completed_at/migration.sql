-- AlterEnum
ALTER TYPE "SittingAuditType" ADD VALUE 'CARE_COMPLETED';

-- AlterTable
ALTER TABLE "sitting_cares" ADD COLUMN     "completedAt" TIMESTAMP(3);
