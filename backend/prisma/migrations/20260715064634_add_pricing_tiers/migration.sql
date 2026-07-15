/*
  Warnings:

  - You are about to drop the column `baseRate` on the `ArtistProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistProfile" DROP COLUMN "baseRate";

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "artistProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flexibility" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "revisionRounds" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_artistProfileId_fkey" FOREIGN KEY ("artistProfileId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
