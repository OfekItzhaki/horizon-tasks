-- AlterTable: Change reminderDaysBefore from Int to Int[] (array)
-- This allows tasks to have multiple reminder days (e.g., [7, 1] for 7 days and 1 day before)

-- Step 1: Remove the default temporarily
ALTER TABLE "Task" ALTER COLUMN "reminderDaysBefore" DROP DEFAULT;

-- Step 2: Alter the column type (converts integer to integer[] using USING clause)
ALTER TABLE "Task" 
  ALTER COLUMN "reminderDaysBefore" TYPE integer[] 
  USING ARRAY["reminderDaysBefore"]::integer[];

-- Step 3: Set the new default
ALTER TABLE "Task" ALTER COLUMN "reminderDaysBefore" SET DEFAULT ARRAY[1]::integer[];

