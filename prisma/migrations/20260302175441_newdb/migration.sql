-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "itRegistrationNumber" TEXT,
ADD COLUMN     "jobsplusRegistrationNumber" TEXT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "payPeriodFrom" TIMESTAMP(3),
ADD COLUMN     "payPeriodTo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VacationLeaveCarryForward" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "minutesCarried" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationLeaveCarryForward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VacationLeaveCarryForward_organisationId_employeeId_idx" ON "VacationLeaveCarryForward"("organisationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "VacationLeaveCarryForward_employeeId_cycleStart_key" ON "VacationLeaveCarryForward"("employeeId", "cycleStart");

-- AddForeignKey
ALTER TABLE "VacationLeaveCarryForward" ADD CONSTRAINT "VacationLeaveCarryForward_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationLeaveCarryForward" ADD CONSTRAINT "VacationLeaveCarryForward_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
