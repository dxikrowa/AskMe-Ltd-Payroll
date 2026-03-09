-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "employmentStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "vacationLeaveBalanceMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vacationLeaveResetAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "maternityFundCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vacationConsumedMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vacationEntitledMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vacationRemainingMinutes" INTEGER NOT NULL DEFAULT 0;
