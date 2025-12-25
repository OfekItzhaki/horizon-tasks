-- AlterTable: Add updatedAt column with default value for existing rows
ALTER TABLE "Step" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Update existing rows to use createdAt as initial updatedAt value
UPDATE "Step" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make the column NOT NULL after populating existing rows
ALTER TABLE "Step" ALTER COLUMN "updatedAt" SET NOT NULL;
