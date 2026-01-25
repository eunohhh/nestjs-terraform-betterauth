-- CreateEnum
CREATE TYPE "SittingBookingStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SittingPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SittingAuditType" AS ENUM ('BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'PAYMENT_STATUS_CHANGED', 'CARE_ADDED', 'CARE_UPDATED', 'CARE_DELETED', 'NOTE_UPDATED');

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "sitting_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appId" VARCHAR(32) NOT NULL DEFAULT 'catsitter',
    "userId" UUID NOT NULL,
    "clientName" TEXT NOT NULL,
    "catName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "entryNote" TEXT,
    "requirements" TEXT,
    "catPic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "sitting_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitting_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appId" VARCHAR(32) NOT NULL DEFAULT 'catsitter',
    "clientId" UUID NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "catName" TEXT NOT NULL,
    "bookingStatus" "SittingBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "expectedAmount" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentStatus" "SittingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "addressSnapshot" TEXT NOT NULL,
    "entryNoteSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "sitting_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitting_cares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appId" VARCHAR(32) NOT NULL DEFAULT 'catsitter',
    "bookingId" UUID NOT NULL,
    "careTime" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "sitting_cares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitting_booking_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appId" VARCHAR(32) NOT NULL DEFAULT 'catsitter',
    "bookingId" UUID NOT NULL,
    "type" "SittingAuditType" NOT NULL,
    "payload" JSONB,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sitting_booking_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sitting_clients_appId_userId_idx" ON "sitting_clients"("appId", "userId");

-- CreateIndex
CREATE INDEX "sitting_clients_userId_idx" ON "sitting_clients"("userId");

-- CreateIndex
CREATE INDEX "sitting_bookings_appId_reservationDate_idx" ON "sitting_bookings"("appId", "reservationDate");

-- CreateIndex
CREATE INDEX "sitting_bookings_clientId_reservationDate_idx" ON "sitting_bookings"("clientId", "reservationDate");

-- CreateIndex
CREATE INDEX "sitting_bookings_bookingStatus_reservationDate_idx" ON "sitting_bookings"("bookingStatus", "reservationDate");

-- CreateIndex
CREATE INDEX "sitting_cares_bookingId_careTime_idx" ON "sitting_cares"("bookingId", "careTime");

-- CreateIndex
CREATE INDEX "sitting_cares_appId_careTime_idx" ON "sitting_cares"("appId", "careTime");

-- CreateIndex
CREATE INDEX "sitting_booking_audit_logs_bookingId_createdAt_idx" ON "sitting_booking_audit_logs"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "sitting_booking_audit_logs_appId_createdAt_idx" ON "sitting_booking_audit_logs"("appId", "createdAt");

-- AddForeignKey
ALTER TABLE "sitting_clients" ADD CONSTRAINT "sitting_clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_clients" ADD CONSTRAINT "sitting_clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_clients" ADD CONSTRAINT "sitting_clients_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_bookings" ADD CONSTRAINT "sitting_bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "sitting_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_bookings" ADD CONSTRAINT "sitting_bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_bookings" ADD CONSTRAINT "sitting_bookings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_cares" ADD CONSTRAINT "sitting_cares_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "sitting_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_cares" ADD CONSTRAINT "sitting_cares_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_cares" ADD CONSTRAINT "sitting_cares_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_booking_audit_logs" ADD CONSTRAINT "sitting_booking_audit_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "sitting_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_booking_audit_logs" ADD CONSTRAINT "sitting_booking_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
