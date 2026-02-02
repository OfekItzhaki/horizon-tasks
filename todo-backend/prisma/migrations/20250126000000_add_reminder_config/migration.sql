-- AlterTable: Add reminderConfig JSON field to store reminder configurations including "every day" reminders
ALTER TABLE "Task" ADD COLUMN "reminderConfig" JSONB;
