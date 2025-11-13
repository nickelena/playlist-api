/**
 * Test setup utilities for database initialization and cleanup
 */
import Database from 'better-sqlite3';
import { initializeDatabase } from '../db/schema.js';

let testDb: Database.Database | null = null;

/**
 * Get or create a test database instance
 * Uses in-memory SQLite database for fast, isolated tests
 */
export function getTestDb(): Database.Database {
  if (!testDb) {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    testDb.pragma('journal_mode = WAL');
  }
  return testDb;
}

/**
 * Initialize the test database with schema
 */
export function setupTestDb(): Database.Database {
  const db = getTestDb();

  // Drop all tables first
  db.exec(`
    DROP TABLE IF EXISTS playlist_songs;
    DROP TABLE IF EXISTS album_artists;
    DROP TABLE IF EXISTS song_artists;
    DROP TABLE IF EXISTS playlists;
    DROP TABLE IF EXISTS songs;
    DROP TABLE IF EXISTS albums;
    DROP TABLE IF EXISTS artists;
    DROP TABLE IF EXISTS users;
  `);

  // Recreate tables using the same schema as production
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bio TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      release_year INTEGER,
      cover_art_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration INTEGER NOT NULL,
      file_url TEXT,
      album_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      user_id INTEGER NOT NULL,
      is_public BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS song_artists (
      song_id INTEGER NOT NULL,
      artist_id INTEGER NOT NULL,
      PRIMARY KEY (song_id, artist_id),
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS album_artists (
      album_id INTEGER NOT NULL,
      artist_id INTEGER NOT NULL,
      PRIMARY KEY (album_id, artist_id),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, song_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  return db;
}

/**
 * Clean all data from test database
 */
export function cleanTestDb(): void {
  const db = getTestDb();
  db.exec('DELETE FROM playlist_songs');
  db.exec('DELETE FROM album_artists');
  db.exec('DELETE FROM song_artists');
  db.exec('DELETE FROM playlists');
  db.exec('DELETE FROM songs');
  db.exec('DELETE FROM albums');
  db.exec('DELETE FROM artists');
  db.exec('DELETE FROM users');
}

/**
 * Close test database connection
 */
export function closeTestDb(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}
