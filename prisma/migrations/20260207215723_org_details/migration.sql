-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "idNumber" TEXT;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "address1" TEXT,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "companyRegistrationNumber" TEXT,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "vatNumber" TEXT;
