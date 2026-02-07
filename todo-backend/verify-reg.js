const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = `test-wizard-${Date.now()}@example.com`;

async function verifyRegistration() {
  console.log('Starting registration verification for:', TEST_EMAIL);

  try {
    // 1. Start Registration
    console.log('1. Calling /auth/register/start...');
    const startRes = await axios.post(`${API_URL}/auth/register/start`, {
      email: TEST_EMAIL,
    });
    console.log('   Response:', startRes.data);

    // 2. Get OTP from DB
    console.log('2. Fetching OTP from DB...');
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (!user || !user.emailVerificationOtp) {
      throw new Error('User or OTP not found in DB');
    }
    console.log('   OTP found:', user.emailVerificationOtp);

    // 3. Verify OTP
    console.log('3. Calling /auth/register/verify...');
    const verifyRes = await axios.post(`${API_URL}/auth/register/verify`, {
      email: TEST_EMAIL,
      otp: user.emailVerificationOtp,
    });
    const regToken = verifyRes.data.registrationToken;
    console.log(
      '   Registration Token received:',
      regToken.substring(0, 20) + '...',
    );

    // 4. Finish Registration
    console.log('4. Calling /auth/register/finish...');
    const finishRes = await axios.post(`${API_URL}/auth/register/finish`, {
      registrationToken: regToken,
      password: 'Password123!',
      passwordConfirm: 'Password123!',
    });
    console.log(
      '   Final Response (should include accessToken):',
      finishRes.data.accessToken ? 'SUCCESS (Token present)' : 'FAILED',
    );

    // Cleanup lists first then user
    const createdUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    if (createdUser) {
      await prisma.toDoList.deleteMany({ where: { ownerId: createdUser.id } });
      await prisma.user.delete({ where: { id: createdUser.id } });
    }
    console.log('   Done.');
  } catch (error) {
    console.error('Verification failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRegistration();
