# Project Organization

This document describes the organization of the backend project.

## Directory Structure

```
todo-backend/
├── docs/                          # Documentation files
│   ├── README.md                  # Documentation index
│   ├── TESTING_INSTRUCTIONS.md    # Testing guide
│   ├── REMINDERS_FEATURE.md       # Reminders system overview
│   ├── MULTIPLE_REMINDERS_GUIDE.md # Multiple reminders guide
│   ├── BACKEND_CHECKLIST.md       # Completion checklist
│   ├── CLEANUP_SUMMARY.md         # Code organization summary
│   └── ORGANIZATION.md            # This file
│
├── src/                           # Source code
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Application entry point
│   ├── auth/                      # Authentication module
│   ├── users/                     # User management module
│   ├── todo-lists/               # To-do lists module
│   ├── tasks/                     # Tasks module
│   ├── steps/                     # Steps (sub-tasks) module
│   ├── list-shares/               # List sharing module
│   ├── reminders/                # Reminders module
│   ├── me/                        # User-scoped endpoints module
│   └── prisma/                    # Prisma service and module
│
├── test/                          # E2E tests
│   ├── auth.e2e-spec.ts
│   ├── todo-lists.e2e-spec.ts
│   ├── tasks-steps.e2e-spec.ts
│   ├── me-endpoints.e2e-spec.ts
│   ├── list-sharing.e2e-spec.ts
│   └── app.e2e-spec.ts
│
├── prisma/                        # Database schema and migrations
│   ├── schema.prisma              # Prisma schema
│   └── migrations/                # Database migrations
│
├── README.md                      # Main project README (keep in root)
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── nest-cli.json                  # NestJS CLI configuration
```

## Module Organization

Each feature has its own module with:
- `*.module.ts` - Module definition
- `*.controller.ts` - API endpoints
- `*.service.ts` - Business logic
- `*.service.spec.ts` - Unit tests
- `dto/` - Data Transfer Objects

## Documentation Organization

- **Root README.md**: Main project documentation, setup instructions, API overview
- **docs/**: All detailed documentation files
  - Feature guides
  - Testing instructions
  - Implementation guides
  - Project status

## File Naming Conventions

- **Modules**: `*.module.ts`
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **DTOs**: `*.dto.ts`
- **Tests**: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e)
- **Documentation**: `*.md`

## Best Practices

1. **Keep README.md in root** - Standard practice for GitHub/GitLab
2. **Organize docs in docs/** - Keeps root directory clean
3. **One module per feature** - Clear separation of concerns
4. **Tests alongside code** - Unit tests in same directory as source
5. **E2E tests in test/** - Separate directory for integration tests

