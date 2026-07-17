-- AlterTable
ALTER TABLE "TournamentEntry" ADD COLUMN "guestName" TEXT,
ADD COLUMN "guestPartnerName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_eventId_guestName_key" ON "TournamentEntry"("eventId", "guestName");
