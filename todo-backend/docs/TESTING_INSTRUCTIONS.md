# Testing Instructions

This document provides comprehensive instructions for running and understanding the test suite for the Tasks Management API.

## Test Structure

The test suite is divided into two main categories:

### Unit Tests
Located in `src/**/*.spec.ts` - Test individual services and their business logic in isolation.

### E2E Tests
Located in `test/**/*.e2e-spec.ts` - Test complete API endpoints and workflows end-to-end.

## Running Tests

### Run All Unit Tests
```bash
npm test
```

### Run Unit Tests in Watch Mode
```bash
npm run test:watch
```
This will automatically re-run tests when files change.

### Run Unit Tests with Coverage
```bash
npm run test:cov
```
This generates a coverage report showing which parts of your code are tested.

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
# Unit test
npm test -- steps.service.spec.ts

# E2E test
npm run test:e2e -- auth.e2e-spec.ts
```

### Run Tests Matching a Pattern
```bash
npm test -- --testNamePattern="reorder"
```

## Test Files Overview

### Unit Tests

1. **`src/app.controller.spec.ts`**
   - Tests basic app controller endpoints

2. **`src/auth/auth.service.spec.ts`**
   - User validation
   - Login functionality
   - Invalid credentials handling

3. **`src/users/users.service.spec.ts`**
   - User creation with default lists
   - Password hashing
   - Email verification
   - User updates
   - Authorization checks

4. **`src/todo-lists/todo-lists.service.spec.ts`**
   - List CRUD operations
   - List type handling
   - Soft delete functionality

5. **`src/tasks/tasks.service.spec.ts`**
   - Task scheduling logic (Daily, Weekly, Monthly, Yearly)
   - Date-based filtering
   - Reminders calculation
   - Task CRUD operations

6. **`src/steps/steps.service.spec.ts`**
   - Step reordering with validation
   - Duplicate detection
   - Step CRUD operations

7. **`src/list-shares/list-shares.service.spec.ts`**
   - List sharing functionality
   - Duplicate share prevention
   - Ownership validation

### E2E Tests

1. **`test/app.e2e-spec.ts`**
   - Basic app health check

2. **`test/auth.e2e-spec.ts`**
   - User registration
   - Login flow
   - JWT authentication
   - Protected endpoint access

3. **`test/todo-lists.e2e-spec.ts`**
   - List CRUD operations
   - Default list creation
   - Soft delete

4. **`test/tasks-steps.e2e-spec.ts`**
   - Task CRUD operations
   - Step CRUD operations
   - Step reordering
   - Duplicate validation

5. **`test/me-endpoints.e2e-spec.ts`**
   - `/me/lists` endpoint
   - `/me/tasks` endpoint
   - Authentication requirements

6. **`test/list-sharing.e2e-spec.ts`**
   - Sharing lists with users
   - Getting shared lists
   - Unsharing lists
   - Authorization checks

## Test Coverage Goals

- **Current Coverage**: Run `npm run test:cov` to see current coverage
- **Target**: Aim for 80%+ coverage on critical business logic
- **Focus Areas**:
  - Scheduling logic (TasksService)
  - Reordering logic (StepsService)
  - Sharing logic (ListSharesService)
  - Authentication (AuthService)

## Writing New Tests

### Unit Test Template
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { PrismaService } from '../prisma/prisma.service';

describe('YourService', () => {
  let service: YourService;
  let prisma: PrismaService;

  const mockPrismaService = {
    // Mock Prisma methods
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('yourMethod', () => {
    it('should do something', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### E2E Test Template
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
    await app.close();
  });

  it('should test endpoint', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

## Common Issues

### Tests Failing Due to Database State
- E2E tests create and clean up test data automatically
- If tests fail, check that cleanup is working properly
- Consider using a test database separate from development

### Mock Issues
- Ensure all Prisma methods used in the service are mocked
- Check that mock return values match expected types
- Use `jest.clearAllMocks()` in `afterEach` to reset mocks

### Async Test Issues
- Always use `async/await` or return promises in tests
- Use `beforeAll`/`afterAll` for async setup/teardown
- Use `beforeEach`/`afterEach` for test isolation

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Test Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Don't hit real database in unit tests
5. **Test Edge Cases**: Include tests for error conditions and boundary cases
6. **Keep Tests Fast**: Unit tests should run quickly
7. **Maintain Test Data**: Clean up test data after tests complete

## Continuous Integration

Tests should pass before merging code. The CI pipeline runs:
- Linting (`npm run lint`)
- Type checking (`npx tsc --noEmit`)
- Unit tests (`npm test`)
- E2E tests (`npm run test:e2e`)

## Troubleshooting

### Tests Timeout
- Increase timeout: `jest.setTimeout(10000)`
- Check for hanging promises
- Verify database connections are closed

### Import Errors
- Ensure all dependencies are installed
- Check TypeScript paths are correct
- Verify module imports match actual file structure

### Prisma Client Errors
- Run `npx prisma generate` before tests
- Ensure DATABASE_URL is set for e2e tests
- Check Prisma schema is up to date

