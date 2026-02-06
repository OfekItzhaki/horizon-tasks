process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'password';
process.env.SMTP_FROM = 'noreply@example.com';
process.env.JWT_SECRET = 'test-secret';
// Do not override DATABASE_URL if it's already set or needs to be postgres
