-- CreateEnum
CREATE TYPE "FssFormType" AS ENUM ('FS3', 'FS5', 'FS7');

-- CreateTable
CREATE TABLE "FssForm" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "type" "FssFormType" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "employeeId" TEXT,
    "sourcePayslipIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceFssFormIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "data" JSONB NOT NULL,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FssForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FssForm_organisationId_type_year_idx" ON "FssForm"("organisationId", "type", "year");

-- CreateIndex
CREATE INDEX "FssForm_organisationId_type_year_month_idx" ON "FssForm"("organisationId", "type", "year", "month");

-- CreateIndex
CREATE INDEX "FssForm_employeeId_idx" ON "FssForm"("employeeId");

-- AddForeignKey
ALTER TABLE "FssForm" ADD CONSTRAINT "FssForm_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FssForm" ADD CONSTRAINT "FssForm_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
