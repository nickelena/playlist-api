# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload (uses tsx watch)
- `npm run build` - Compile TypeScript to JavaScript (outputs to dist/)
- `npm start` - Run production server from compiled code

### Database
- `npm run db:init` - Initialize empty database with schema
- `npm run db:seed` - Initialize and seed database with sample data (recommended for setup)

### Environment
- Node.js 20+ required (for native `--env-file` support)
- Environment variables loaded via `--env-file=.env` flag
- Default database path: `./data/playlist.db`

## Architecture

### Request Flow
1. **Entry Point**: `src/server.ts` starts the Express server
2. **App Setup**: `src/app.ts` configures Express, initializes DB, registers routes
3. **Routes**: Map HTTP methods to controller functions (e.g., `/api/playlists` → `src/routes/playlists.ts`)
4. **Controllers**: Handle business logic and database queries (e.g., `src/controllers/playlists.ts`)
5. **Database**: Direct better-sqlite3 queries (synchronous, no ORM)
6. **Error Handling**: Express middleware catches errors, ApiError class for custom status codes

### Database Architecture
**Connection**: Single shared synchronous connection via `src/db/connection.ts` (better-sqlite3)

**Schema Management**:
- Schema defined in `src/db/schema.ts` with `initializeDatabase()` function
- Uses SQLite with foreign keys enabled and WAL mode for performance
- Includes indexes on foreign keys for query optimization

**Data Model**:
- Many-to-many relationships via junction tables: `song_artists`, `album_artists`, `playlist_songs`
- `playlist_songs` includes position field for ordering
- Foreign key constraints with appropriate ON DELETE behaviors (CASCADE or SET NULL)

**Query Pattern**:
- All queries are synchronous prepared statements executed directly in controllers
- Use transactions for multi-table operations
- Related data fetched with JOIN queries and returned in nested structures

### Error Handling Pattern
- Controllers wrapped in try/catch, pass errors to `next(error)`
- Use `ApiError` class (from `src/middleware/errorHandler.ts`) to throw HTTP errors with specific status codes
- Example: `throw new ApiError(404, 'Playlist not found')`
- Error middleware provides structured JSON responses with status codes

### TypeScript Configuration
- ES Modules (type: "module", .js extensions required in imports)
- Strict mode enabled with NodeNext module resolution
- Target: ES2022
- Types defined in `src/types/models.ts` (base and extended types with relations)

## Commit Convention

Follow semantic commit format from `.cursorrules`:

**Format**: `<type>(<scope>): <subject>`

**Types**: feat, fix, docs, style, refactor, perf, test, chore, ci

**Scopes**: api, db, songs, artists, albums, playlists, users, middleware, types, config

**Rules**:
- Use imperative mood: "add" not "added"
- No capitalization, no period at end
- Keep subject under 72 characters

**Examples**:
- `feat(playlists): add ability to reorder songs`
- `fix(songs): correct duration validation`
- `refactor(db): optimize query performance for playlist retrieval`

## Code Style Guidelines

- TypeScript strict mode required
- Use `const` over `let`
- Use async/await (though better-sqlite3 operations are synchronous)
- Always handle errors with try/catch in controllers
- Database queries belong in controllers (no separate repository layer)
- Use `ApiError` class for throwing HTTP errors
- Validate required fields before database operations
- Use transaction blocks for operations modifying multiple tables
- Follow REST conventions for route naming
