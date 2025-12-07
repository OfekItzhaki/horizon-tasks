<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

To-Do List API built with NestJS, Prisma, and PostgreSQL. Features include:
- Multiple list types (Daily, Weekly, Monthly, Yearly, Custom)
- Task scheduling with reminders
- User management with profile pictures
- List sharing between users
- Daily task aggregation

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm (or npm/yarn)

## Project setup

1. **Install dependencies:**
```bash
$ pnpm install
```

2. **Set up environment variables:**
Create a `.env` file in the `todo-backend` directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/todo_db?schema=public"
PORT=3000
JWT_SECRET="change-me"
```

3. **Run database migrations:**
```bash
# Generate Prisma client and run migrations
$ npx prisma migrate dev

# Or if you want to create a new migration
$ npx prisma migrate dev --name your_migration_name
```

4. **Generate Prisma Client:**
```bash
$ npx prisma generate
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode (recommended for development)
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

The API will be available at `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Auth
- `POST /auth/login` - Exchange email/password for a JWT access token
- `POST /auth/verify-email/:token` - Verify email address with token
- `POST /auth/resend-verification` - Resend email verification email

All other endpoints (except `POST /users`) require an `Authorization: Bearer <token>` header. Create a user first, then log in to obtain a token.

### Users
- `GET /users` - Get the authenticated user (array with a single entry)
- `GET /users/:id` - Get the authenticated user by ID
- `POST /users` - Create a new user (registration - default lists are auto-created)
- `PATCH /users/:id` - Update authenticated user
- `DELETE /users/:id` - Soft delete authenticated user

### To-Do Lists
- `GET /todo-lists` - Get all lists for authenticated user
- `GET /todo-lists/:id` - Get list by ID
- `POST /todo-lists` - Create a new list
- `PATCH /todo-lists/:id` - Update list
- `DELETE /todo-lists/:id` - Delete list (soft delete)

**Note**: Default lists (Daily, Weekly, Monthly, Yearly) are automatically created when a user registers.

### Tasks
- `GET /tasks` - Get all tasks (optional: `?todoListId=1`)
- `GET /tasks/by-date` - Get all tasks for a specific date (optional: `?date=YYYY-MM-DD`)
- `GET /tasks/:id` - Get task by ID
- `POST /tasks/todo-list/:todoListId` - Create a task in a list
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task (soft delete)

**Task Reminders**: Use `reminderDaysBefore` as an array to set multiple reminders (e.g., `[7, 1]` for 7 days and 1 day before).

### Steps (sub-tasks)
- `GET /tasks/:taskId/steps` - Get steps for a task (ordered)
- `POST /tasks/:taskId/steps` - Create a new step (appends to the end)
- `PATCH /steps/:id` - Update step description/completion
- `DELETE /steps/:id` - Soft delete a step
- `PATCH /tasks/:taskId/steps/reorder` - Reorder steps for drag-and-drop (body: `{ "stepIds": [/* desired order */] }`)

### Reminders
- `GET /reminders/today` - Get reminder notifications for today
- `GET /reminders/date?date=YYYY-MM-DD` - Get reminder notifications for a specific date
- `GET /reminders/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Get reminder notifications for a date range

Returns formatted notification data (title, message) that front-end can use for push notifications. See `REMINDERS_FEATURE.md` for details.

### Me (User-scoped endpoints)
- `GET /me/lists` - Get all lists for the current authenticated user (alias for `GET /todo-lists`)
- `GET /me/tasks?todoListId=1` - Get all tasks for the current authenticated user (optional filter by list)

### List Sharing
- `POST /list-shares/todo-list/:todoListId` - Share a list with a user
- `GET /list-shares/user/:userId` - Get all lists shared with a user
- `GET /list-shares/todo-list/:todoListId` - Get all users a list is shared with
- `DELETE /list-shares/todo-list/:todoListId/user/:userId` - Unshare a list with a user

## Database Management

```bash
# Open Prisma Studio (database GUI)
$ npx prisma studio

# Reset database (WARNING: deletes all data)
$ npx prisma migrate reset

# View migration status
$ npx prisma migrate status
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

For detailed testing instructions, see [docs/TESTING_INSTRUCTIONS.md](./docs/TESTING_INSTRUCTIONS.md).

## Documentation

Additional documentation is available in the `docs/` folder:

- [Testing Instructions](./docs/TESTING_INSTRUCTIONS.md) - How to run and write tests
- [Reminders Feature](./docs/REMINDERS_FEATURE.md) - Reminders system guide
- [Multiple Reminders Guide](./docs/MULTIPLE_REMINDERS_GUIDE.md) - Multiple reminders implementation
- [Backend Checklist](./docs/BACKEND_CHECKLIST.md) - Completion status
- [Cleanup Summary](./docs/CLEANUP_SUMMARY.md) - Code organization details

**API Documentation**: Interactive Swagger UI available at `http://localhost:3000/api` when the server is running.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
