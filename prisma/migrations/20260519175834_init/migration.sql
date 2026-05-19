-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('transport', 'energy', 'buildings', 'waste', 'land_use');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('planned', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('manual', 'ai');

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "baseline_tons" INTEGER NOT NULL,
    "baseline_year" INTEGER NOT NULL,
    "target_year" INTEGER NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateAction" (
    "id" SERIAL NOT NULL,
    "cityId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sector" "Sector" NOT NULL,
    "status" "Status" NOT NULL,
    "annual_reduction" INTEGER NOT NULL,
    "start_year" INTEGER NOT NULL,
    "source" "Source" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimateAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClimateAction" ADD CONSTRAINT "ClimateAction_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
