---
description: Write comprehensive tests using Vitest
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
auto-approve-tools: Bash(npm test*), Bash(npm run test*), Bash(vitest*)
---

Write comprehensive tests for the specified component using the following guidelines:

## Test Framework
- **Framework**: Vitest (modern, fast, TypeScript-native)
- **HTTP Testing**: supertest for API endpoint testing
- **Database**: In-memory SQLite for test isolation
- **Mocking**: vi.mock() from Vitest

## Coverage Requirements
- **Minimum Coverage**: 80% for all metrics (lines, branches, functions, statements)
- **Critical Paths**: 100% coverage required for:
  - Validation middleware (src/middleware/validate.ts)
  - Error handling (src/middleware/errorHandler.ts)
  - All controller functions
  - Database schema initialization

## Testing Patterns

### 1. Controller Tests
- Test happy path with valid data
- Test validation failures (missing fields, invalid types, out-of-range values)
- Test not found scenarios (404)
- Test database constraint violations
- Test edge cases (empty arrays, null values, boundary values)

### 2. Route/Integration Tests
- Use supertest to test full request/response cycle
- Test all HTTP methods (GET, POST, PUT, DELETE)
- Verify response status codes
- Verify response body structure
- Test authentication/authorization if applicable

### 3. Validation Tests
- Test each Zod schema independently
- Test required vs optional fields
- Test string length limits
- Test numeric ranges and constraints
- Test format validation (email, URL)
- Test array constraints (min length, item types)

### 4. Database Tests
- Use separate test database (`:memory:` or temporary file)
- Reset database state before each test (beforeEach)
- Test foreign key constraints
- Test cascade deletes
- Test transaction rollback on errors

### 5. Test Structure
```typescript
describe('Feature/Module Name', () => {
  beforeEach(() => {
    // Setup: reset database, mock external dependencies
  });

  afterEach(() => {
    // Cleanup: close connections, restore mocks
  });

  describe('Happy path', () => {
    it('should succeed with valid input', async () => {
      // Arrange, Act, Assert
    });
  });

  describe('Error cases', () => {
    it('should return 400 for invalid input', async () => {
      // Test validation
    });

    it('should return 404 when resource not found', async () => {
      // Test not found
    });
  });
});
```

### 6. Naming Conventions
- Test files: `*.test.ts` (e.g., `playlists.test.ts`)
- Location: Mirror source structure (e.g., `src/controllers/__tests__/playlists.test.ts`)
- Test names: Use "should" statements describing expected behavior

### 7. Test Data
- Create reusable test fixtures in `src/__tests__/fixtures/`
- Use factory functions for generating test data
- Keep test data minimal but realistic

## Commands to Add to package.json
```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest --coverage",
"test:watch": "vitest --watch"
```

## Dependencies to Install
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8 supertest @types/supertest
```

## Example Test Template
When writing tests, follow this pattern:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { getDb } from '../../db/connection';

describe('POST /api/playlists', () => {
  beforeEach(() => {
    const db = getDb();
    db.exec('DELETE FROM playlists');
    db.exec('DELETE FROM users');
  });

  it('should create playlist with valid data', async () => {
    // Create test user first
    const userRes = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' });

    const response = await request(app)
      .post('/api/playlists')
      .send({
        name: 'Test Playlist',
        description: 'Test Description',
        user_id: userRes.body.id,
        is_public: true
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Test Playlist',
      description: 'Test Description',
      user_id: userRes.body.id,
      is_public: 1
    });
  });

  it('should return 400 for missing name', async () => {
    const response = await request(app)
      .post('/api/playlists')
      .send({ user_id: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Validation failed');
  });
});
```

## Instructions for Claude
1. First, check if test dependencies are installed. If not, install them.
2. Read the source file(s) that need to be tested.
3. Create test file(s) following the structure above.
4. Write tests covering all patterns mentioned (happy path, error cases, edge cases).
5. Ensure test file location mirrors source structure.
6. After writing tests, run them to verify they pass.

Write tests following these patterns and ensure all coverage requirements are met.
