-- Catch-up migration for columns/enums present in schema but missing in deployed databases.

-- Add enum used by Employee.employmentType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentType') THEN
    CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME');
  END IF;
END $$;

-- Add enum used by TimesheetEntry.entryType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TimesheetEntryType') THEN
    CREATE TYPE "TimesheetEntryType" AS ENUM ('OVERTIME', 'PART_TIME_HOURS');
  END IF;
END $$;

-- Employee columns
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  ADD COLUMN IF NOT EXISTS "hourlyWage" INTEGER;

-- TimesheetEntry column
ALTER TABLE "TimesheetEntry"
  ADD COLUMN IF NOT EXISTS "entryType" "TimesheetEntryType" NOT NULL DEFAULT 'OVERTIME';
