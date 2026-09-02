-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO', 'PLUS', 'MAX');

-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('owner', 'player');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "PreferredSide" AS ENUM ('forehand', 'backhand');

-- CreateEnum
CREATE TYPE "DominantHand" AS ENUM ('right', 'left');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "WaitlistEntryStatus" AS ENUM ('WAITING', 'NOTIFIED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'DIGITAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RESERVATION_REMINDER', 'RESERVATION_CANCELLED', 'PAYMENT_CONFIRMED', 'WAITLIST_SLOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "province" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "status" "ClubStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresPrepayment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL DEFAULT 'player',
    "clubId" TEXT,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "photoURL" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "province" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "gender" "Gender",
    "padelCategory" INTEGER,
    "preferredSide" "PreferredSide",
    "dominantHand" "DominantHand",
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLogin" TIMESTAMP(3),
    "acceptedTermsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surface" TEXT,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "photoUrl" TEXT,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 90,
    "reservationFee" DOUBLE PRECISION,
    "courtPrice" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_availability" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_closures" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,

    CONSTRAINT "court_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "paymentExpiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "reservationId" TEXT,
    "number" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "userId" TEXT NOT NULL,
    "userDisplayName" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_profiles_clubId_idx" ON "user_profiles"("clubId");

-- CreateIndex
CREATE INDEX "courts_clubId_active_idx" ON "courts"("clubId", "active");

-- CreateIndex
CREATE INDEX "court_availability_courtId_dayOfWeek_idx" ON "court_availability"("courtId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "court_closures_courtId_startsAt_endsAt_idx" ON "court_closures"("courtId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "reservations_clubId_scheduledStart_idx" ON "reservations"("clubId", "scheduledStart");

-- CreateIndex
CREATE INDEX "reservations_clubId_userId_idx" ON "reservations"("clubId", "userId");

-- CreateIndex
CREATE INDEX "reservations_clubId_courtId_idx" ON "reservations"("clubId", "courtId");

-- CreateIndex
CREATE INDEX "reservations_clubId_status_idx" ON "reservations"("clubId", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_courtId_scheduledStart_status_idx" ON "waitlist_entries"("courtId", "scheduledStart", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_courtId_scheduledStart_userId_key" ON "waitlist_entries"("courtId", "scheduledStart", "userId");

-- CreateIndex
CREATE INDEX "invoices_clubId_status_idx" ON "invoices"("clubId", "status");

-- CreateIndex
CREATE INDEX "invoices_clubId_userId_idx" ON "invoices"("clubId", "userId");

-- CreateIndex
CREATE INDEX "invoices_clubId_createdAt_idx" ON "invoices"("clubId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_clubId_number_key" ON "invoices"("clubId", "number");

-- CreateIndex
CREATE INDEX "notifications_clubId_status_idx" ON "notifications"("clubId", "status");

-- CreateIndex
CREATE INDEX "notifications_clubId_type_recipientId_idx" ON "notifications"("clubId", "type", "recipientId");

-- CreateIndex
CREATE INDEX "audit_logs_clubId_timestamp_idx" ON "audit_logs"("clubId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_clubId_entity_idx" ON "audit_logs"("clubId", "entity");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_availability" ADD CONSTRAINT "court_availability_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_closures" ADD CONSTRAINT "court_closures_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

