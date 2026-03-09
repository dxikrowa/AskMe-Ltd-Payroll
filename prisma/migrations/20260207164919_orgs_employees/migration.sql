/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'PAYROLL', 'EMPLOYEE', 'VIEWER');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PayRunStatus" AS ENUM ('DRAFT', 'REVIEW', 'FINALIZED', 'PAID');

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash",
DROP COLUMN "username";

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'MT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "employeeNo" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "designation" TEXT,
    "taxStatus" INTEGER NOT NULL DEFAULT 1,
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "baseWage" INTEGER NOT NULL DEFAULT 0,
    "includeNI" BOOLEAN NOT NULL DEFAULT true,
    "under17" BOOLEAN NOT NULL DEFAULT false,
    "apprentice" BOOLEAN NOT NULL DEFAULT false,
    "before1962" BOOLEAN NOT NULL DEFAULT false,
    "includeAllowance1" BOOLEAN NOT NULL DEFAULT false,
    "includeAllowance2" BOOLEAN NOT NULL DEFAULT false,
    "includeBonus1" BOOLEAN NOT NULL DEFAULT false,
    "includeBonus2" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRun" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "status" "PayRunStatus" NOT NULL DEFAULT 'DRAFT',
    "periodFrom" TEXT NOT NULL,
    "periodTo" TEXT NOT NULL,
    "payDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payRunId" TEXT,
    "grossCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "niCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "allowanceCents" INTEGER NOT NULL DEFAULT 0,
    "bonusCents" INTEGER NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organisation_name_idx" ON "Organisation"("name");

-- CreateIndex
CREATE INDEX "Membership_organisationId_idx" ON "Membership"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organisationId_key" ON "Membership"("userId", "organisationId");

-- CreateIndex
CREATE INDEX "Employee_organisationId_idx" ON "Employee"("organisationId");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "PayRun_organisationId_idx" ON "PayRun"("organisationId");

-- CreateIndex
CREATE INDEX "Payslip_organisationId_idx" ON "Payslip"("organisationId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
