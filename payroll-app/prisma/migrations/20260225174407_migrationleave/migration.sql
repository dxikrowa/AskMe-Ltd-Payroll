-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "isStudent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "normalWeeklyHours" INTEGER NOT NULL DEFAULT 40;

-- CreateTable
CREATE TABLE "VacationLeaveEntry" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutesUsed" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacationLeaveEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VacationLeaveEntry_organisationId_employeeId_date_idx" ON "VacationLeaveEntry"("organisationId", "employeeId", "date");

-- AddForeignKey
ALTER TABLE "VacationLeaveEntry" ADD CONSTRAINT "VacationLeaveEntry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationLeaveEntry" ADD CONSTRAINT "VacationLeaveEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
