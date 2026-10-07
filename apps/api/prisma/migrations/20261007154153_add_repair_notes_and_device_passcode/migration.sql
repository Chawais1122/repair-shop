/*
  Warnings:

  - You are about to drop the column `repairNotes` on the `repair_tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "passcode" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "repair_tickets" DROP COLUMN "repairNotes";

-- CreateTable
CREATE TABLE "repair_notes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repair_notes_ticketId_idx" ON "repair_notes"("ticketId");

-- CreateIndex
CREATE INDEX "repair_notes_authorId_idx" ON "repair_notes"("authorId");

-- CreateIndex
CREATE INDEX "devices_serialNumber_idx" ON "devices"("serialNumber");

-- CreateIndex
CREATE INDEX "devices_imei_idx" ON "devices"("imei");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "repair_tickets_priority_idx" ON "repair_tickets"("priority");

-- CreateIndex
CREATE INDEX "ticket_status_history_changedAt_idx" ON "ticket_status_history"("changedAt");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "repair_notes" ADD CONSTRAINT "repair_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_notes" ADD CONSTRAINT "repair_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
