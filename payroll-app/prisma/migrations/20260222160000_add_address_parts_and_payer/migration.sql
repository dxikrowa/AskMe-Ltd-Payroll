-- Add separated address fields + payroll payer fields
ALTER TABLE "Organisation"
  ADD COLUMN IF NOT EXISTS "addressHouseNo" TEXT,
  ADD COLUMN IF NOT EXISTS "addressStreet" TEXT,
  ADD COLUMN IF NOT EXISTS "addressLocality" TEXT,
  ADD COLUMN IF NOT EXISTS "addressPostcode" TEXT,
  ADD COLUMN IF NOT EXISTS "payrollManagerFullName" TEXT,
  ADD COLUMN IF NOT EXISTS "payrollManagerPosition" TEXT;

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "spouseIdNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "addressHouseNo" TEXT,
  ADD COLUMN IF NOT EXISTS "addressStreet" TEXT,
  ADD COLUMN IF NOT EXISTS "addressLocality" TEXT,
  ADD COLUMN IF NOT EXISTS "addressPostcode" TEXT;
