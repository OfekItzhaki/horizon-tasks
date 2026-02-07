# SMTP Setup Guide for Horizon Tasks

This guide explains how to set up the SMTP configuration for the `todo-backend`. Currently, the Email Service is in a NO-OP state or using placeholders, which prevents OTP emails from being sent to users.

## 1. Choose an SMTP Provider

You can use any SMTP provider. Common options include:

- **Resend** (Recommended for simplicity)
- **SendGrid**
- **Mailgun**
- **Gmail** (Requires "App Passwords")
- **Mailtrap** (Great for testing)

## 2. Environment Variables

You need to add the following variables to your `todo-backend/.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM='"Horizon Tasks" <no-reply@yourdomain.com>'
```

## 3. Configuration in NestJS

The backend uses `@nestjs-modules/mailer`. You can find the configuration in:
`todo-backend/src/app.module.ts` (or wherever the `MailerModule` is initialized).

Example configuration:

```typescript
MailerModule.forRoot({
  transport: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  defaults: {
    from: process.env.SMTP_FROM,
  },
}),
```

## 4. Testing the Setup

Once configured, you can test the registration flow. If correctly configured:

1. Enter your email in the SignUp screen.
2. You should receive a 6-digit code in your inbox.
3. If it fails, check the backend logs for `MailerModule` errors.

---

# Profile Picture Persistence (Production Setup)

Currently, the project saves profile pictures to the local filesystem (`todo-backend/uploads`). This works in development but will **not persist** in production environments (like Heroku, Vercel, or AWS Lambda) because their filesystems are ephemeral.

## Recommendation: Use Cloud Storage

To make profile pictures persist across environments, you should implement a cloud storage provider:

1. **Providers**:
   - **AWS S3 / Google Cloud Storage / Azure Blob Storage** (Standard)
   - **Cloudinary** (Easiest for images/avatars)
   - **Firebase Storage**

2. **Implementation Steps**:
   - Replace the `LocalFilesInterceptor` in `users.controller.ts` with a service that uploads to your chosen provider.
   - Store the public **URL** returned by the provider in the database, rather than just the filename.

---

> [!IMPORTANT]
> **Security**: Never commit your `.env` file with real credentials. Use `todo-backend/.env.example` as a template.
