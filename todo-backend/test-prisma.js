const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Prisma connection...');
  try {
    const user = await prisma.user.findFirst();
    console.log('Database connection OK. First user found:', !!user);

    const email = `test-${Date.now()}@test.com`;
    console.log(`Attempting to create user with email: ${email}`);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: 'Test User',
      },
    });
    console.log('User created successfully. ID:', newUser.id);

    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('Test user deleted.');
  } catch (e) {
    console.error('Prisma Test Failed:');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
