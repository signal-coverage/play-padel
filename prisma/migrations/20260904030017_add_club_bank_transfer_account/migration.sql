-- CreateTable
CREATE TABLE "club_bank_transfer_accounts" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "cbu" TEXT NOT NULL,
    "alias" TEXT,
    "accountHolderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "club_bank_transfer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_bank_transfer_accounts_clubId_key" ON "club_bank_transfer_accounts"("clubId");

-- AddForeignKey
ALTER TABLE "club_bank_transfer_accounts" ADD CONSTRAINT "club_bank_transfer_accounts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
