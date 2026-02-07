/**
 * Script to manually apply the reminderConfig migration
 * This bypasses Prisma's migration system to work around Supabase connection pooler issues
 */

const { PrismaClient } = require('@prisma/client');

async function applyMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('Checking if reminderConfig column exists...');

    // Check if column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Task' 
      AND column_name = 'reminderConfig'
    `;

    if (result && result.length > 0) {
      console.log('✅ Column "reminderConfig" already exists!');
      console.log('Marking migration as applied...');

      // Mark migration as applied
      try {
        await prisma.$executeRaw`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count)
          VALUES (
            '20250126000000_add_reminder_config',
            'manual_application',
            NOW(),
            '20250126000000_add_reminder_config',
            NULL,
            NOW(),
            1
          )
          ON CONFLICT (id) DO NOTHING
        `;
        console.log('✅ Migration marked as applied!');
      } catch (error) {
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate')
        ) {
          console.log('✅ Migration already marked as applied!');
        } else {
          throw error;
        }
      }
    } else {
      console.log('Column does not exist. Adding reminderConfig column...');

      // Add the column
      await prisma.$executeRaw`
        ALTER TABLE "Task" ADD COLUMN "reminderConfig" JSONB
      `;

      console.log('✅ Column "reminderConfig" added successfully!');

      // Mark migration as applied
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count)
        VALUES (
          '20250126000000_add_reminder_config',
          'manual_application',
          NOW(),
          '20250126000000_add_reminder_config',
          NULL,
          NOW(),
          1
        )
        ON CONFLICT (id) DO NOTHING
      `;

      console.log('✅ Migration marked as applied!');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('You can now run: npx prisma generate');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
