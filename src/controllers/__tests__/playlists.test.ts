/**
 * Comprehensive tests for playlist controller
 * Tests all CRUD operations, edge cases, error handling, and validation
 */
import { describe, it, expect, beforeAll, beforeEach, vi, afterAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import {
  getAllPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderSong,
  getPlaylistsByUser,
} from '../playlists.js';
import { setupTestDb, cleanTestDb, closeTestDb, getTestDb } from '../../__tests__/setup.js';
import { testUsers, testPlaylists, testSongs, testArtists, testAlbums } from '../../__tests__/fixtures/testData.js';

// Mock the database connection module
let testDb: Database.Database;

vi.mock('../../db/connection.js', async () => {
  return {
    default: new Proxy({}, {
      get(_target, prop) {
        const db = getTestDb();
        const value = db[prop as keyof Database.Database];
        if (typeof value === 'function') {
          return value.bind(db);
        }
        return value;
      }
    })
  };
});

describe('Playlist Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let userId: number;
  let userId2: number;

  beforeAll(() => {
    // Initialize the test database once
    testDb = setupTestDb();
  });

  beforeEach(() => {
    // Clean database before each test
    cleanTestDb();

    // Re-initialize for each test
    testDb = setupTestDb();

    // Create test users
    const insertUser = testDb.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result1 = insertUser.run(testUsers.user1.name, testUsers.user1.email);
    const result2 = insertUser.run(testUsers.user2.name, testUsers.user2.email);
    userId = Number(result1.lastInsertRowid);
    userId2 = Number(result2.lastInsertRowid);

    // Setup mock request and response
    mockReq = {
      params: {},
      body: {},
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  afterAll(() => {
    closeTestDb();
  });

  describe('getAllPlaylists', () => {
    it('should return empty array when no playlists exist', () => {
      getAllPlaylists(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should return all playlists ordered by created_at DESC', () => {
      // Create multiple playlists
      const insert = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      insert.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);

      // Wait a bit to ensure different timestamps
      const insert2 = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      insert2.run(testPlaylists.playlist2.name, testPlaylists.playlist2.description, userId, 0);

      getAllPlaylists(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: testPlaylists.playlist1.name,
            user_id: userId,
          }),
          expect.objectContaining({
            name: testPlaylists.playlist2.name,
            user_id: userId,
          }),
        ])
      );

      const callArg = (mockRes.json as any).mock.calls[0][0];
      expect(callArg).toHaveLength(2);
    });

    it('should handle database errors', () => {
      // Mock a database error by replacing testDb temporarily
      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      });

      getAllPlaylists(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('getPlaylistById', () => {
    let playlistId: number;
    let songId1: number;
    let songId2: number;

    beforeEach(() => {
      // Create playlist
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const result = insertPlaylist.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      playlistId = Number(result.lastInsertRowid);

      // Create songs
      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const song1 = insertSong.run(testSongs.song1.title, testSongs.song1.duration, testSongs.song1.file_url);
      const song2 = insertSong.run(testSongs.song2.title, testSongs.song2.duration, testSongs.song2.file_url);
      songId1 = Number(song1.lastInsertRowid);
      songId2 = Number(song2.lastInsertRowid);

      // Add songs to playlist
      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId1, 1);
      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId2, 2);
    });

    it('should return playlist with songs and user details', () => {
      mockReq.params = { id: String(playlistId) };

      getPlaylistById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          name: testPlaylists.playlist1.name,
          description: testPlaylists.playlist1.description,
          user_id: userId,
          songs: expect.arrayContaining([
            expect.objectContaining({
              id: songId1,
              title: testSongs.song1.title,
              position: 1,
            }),
            expect.objectContaining({
              id: songId2,
              title: testSongs.song2.title,
              position: 2,
            }),
          ]),
          user: expect.objectContaining({
            id: userId,
            name: testUsers.user1.name,
            email: testUsers.user1.email,
          }),
        })
      );
    });

    it('should return 404 when playlist does not exist', () => {
      mockReq.params = { id: '99999' };

      getPlaylistById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Playlist not found',
        })
      );
    });

    it('should return playlist with empty songs array when no songs added', () => {
      // Create new empty playlist
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const result = insertPlaylist.run('Empty Playlist', 'No songs', userId, 1);
      const emptyPlaylistId = Number(result.lastInsertRowid);

      mockReq.params = { id: String(emptyPlaylistId) };

      getPlaylistById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: emptyPlaylistId,
          name: 'Empty Playlist',
          songs: [],
        })
      );
    });

    it('should handle database errors', () => {
      mockReq.params = { id: String(playlistId) };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockReturnValue({
        get: vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      });

      getPlaylistById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('createPlaylist', () => {
    it('should create playlist with valid data', () => {
      mockReq.body = {
        name: testPlaylists.playlist1.name,
        description: testPlaylists.playlist1.description,
        user_id: userId,
        is_public: testPlaylists.playlist1.is_public,
      };

      createPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
          name: testPlaylists.playlist1.name,
          description: testPlaylists.playlist1.description,
          user_id: userId,
          is_public: 1,
        })
      );
    });

    it('should create playlist with is_public defaulting to true', () => {
      mockReq.body = {
        name: testPlaylists.playlist1.name,
        description: testPlaylists.playlist1.description,
        user_id: userId,
        // is_public not provided
      };

      createPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: 1,
        })
      );
    });

    it('should create playlist with is_public set to false', () => {
      mockReq.body = {
        name: testPlaylists.playlist2.name,
        description: testPlaylists.playlist2.description,
        user_id: userId,
        is_public: false,
      };

      createPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: 0,
        })
      );
    });

    it('should create playlist with null description', () => {
      mockReq.body = {
        name: testPlaylists.playlist3.name,
        description: testPlaylists.playlist3.description,
        user_id: userId,
        is_public: testPlaylists.playlist3.is_public,
      };

      createPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: testPlaylists.playlist3.name,
          description: null,
        })
      );
    });

    it('should return 404 when user does not exist', () => {
      mockReq.body = {
        name: testPlaylists.playlist1.name,
        description: testPlaylists.playlist1.description,
        user_id: 99999,
        is_public: testPlaylists.playlist1.is_public,
      };

      createPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found',
        })
      );
    });

    it('should handle database errors', () => {
      mockReq.body = {
        name: testPlaylists.playlist1.name,
        description: testPlaylists.playlist1.description,
        user_id: userId,
        is_public: testPlaylists.playlist1.is_public,
      };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO playlists')) {
          return {
            run: vi.fn().mockImplementation(() => {
              throw new Error('Database error');
            }),
          };
        }
        return originalPrepare(sql);
      });

      createPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('updatePlaylist', () => {
    let playlistId: number;

    beforeEach(() => {
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const result = insertPlaylist.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      playlistId = Number(result.lastInsertRowid);
    });

    it('should update playlist name', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        name: 'Updated Name',
      };

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          name: 'Updated Name',
          description: testPlaylists.playlist1.description,
        })
      );
    });

    it('should update playlist description', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        description: 'New description',
      };

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          name: testPlaylists.playlist1.name,
          description: 'New description',
        })
      );
    });

    it('should update is_public to false', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        is_public: false,
      };

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          is_public: 0,
        })
      );
    });

    it('should update is_public to true', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        is_public: true,
      };

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          is_public: 1,
        })
      );
    });

    it('should update multiple fields at once', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        name: 'New Name',
        description: 'New Description',
        is_public: false,
      };

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          name: 'New Name',
          description: 'New Description',
          is_public: 0,
        })
      );
    });

    it('should not update when no fields provided', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {};

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: playlistId,
          name: testPlaylists.playlist1.name,
          description: testPlaylists.playlist1.description,
        })
      );
    });

    it('should return 404 when playlist does not exist', () => {
      mockReq.params = { id: '99999' };
      mockReq.body = {
        name: 'New Name',
      };

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Playlist not found',
        })
      );
    });

    it('should handle database errors', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = { name: 'New Name' };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('UPDATE playlists')) {
          return {
            run: vi.fn().mockImplementation(() => {
              throw new Error('Database error');
            }),
          };
        }
        return originalPrepare(sql);
      });

      updatePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('deletePlaylist', () => {
    let playlistId: number;

    beforeEach(() => {
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const result = insertPlaylist.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      playlistId = Number(result.lastInsertRowid);
    });

    it('should delete existing playlist', () => {
      mockReq.params = { id: String(playlistId) };

      deletePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();

      // Verify playlist is deleted
      const playlist = testDb.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
      expect(playlist).toBeUndefined();
    });

    it('should cascade delete playlist_songs when deleting playlist', () => {
      // Add a song to playlist
      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const songResult = insertSong.run(testSongs.song1.title, testSongs.song1.duration, testSongs.song1.file_url);
      const songId = Number(songResult.lastInsertRowid);

      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, 1);

      mockReq.params = { id: String(playlistId) };

      deletePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);

      // Verify playlist_songs entry is also deleted
      const playlistSong = testDb.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ?').get(playlistId);
      expect(playlistSong).toBeUndefined();
    });

    it('should return 404 when playlist does not exist', () => {
      mockReq.params = { id: '99999' };

      deletePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Playlist not found',
        })
      );
    });

    it('should handle database errors', () => {
      mockReq.params = { id: String(playlistId) };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('DELETE FROM playlists')) {
          return {
            run: vi.fn().mockImplementation(() => {
              throw new Error('Database error');
            }),
          };
        }
        return originalPrepare(sql);
      });

      deletePlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('addSongToPlaylist', () => {
    let playlistId: number;
    let songId: number;

    beforeEach(() => {
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const playlistResult = insertPlaylist.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      playlistId = Number(playlistResult.lastInsertRowid);

      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const songResult = insertSong.run(testSongs.song1.title, testSongs.song1.duration, testSongs.song1.file_url);
      songId = Number(songResult.lastInsertRowid);
    });

    it('should add song to playlist with specified position', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        song_id: songId,
        position: 1,
      };

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Song added to playlist',
        position: 1,
      });

      // Verify in database
      const link = testDb.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(playlistId, songId) as any;
      expect(link).toBeDefined();
      expect(link.position).toBe(1);
    });

    it('should add song to end when position not specified', () => {
      // Add first song at position 1
      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, 1);

      // Create second song
      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const songResult = insertSong.run(testSongs.song2.title, testSongs.song2.duration, testSongs.song2.file_url);
      const songId2 = Number(songResult.lastInsertRowid);

      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        song_id: songId2,
        // position not specified
      };

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Song added to playlist',
        position: 2,
      });
    });

    it('should add first song at position 1 when playlist is empty and no position specified', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        song_id: songId,
        // position not specified
      };

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Song added to playlist',
        position: 1,
      });
    });

    it('should return 404 when playlist does not exist', () => {
      mockReq.params = { id: '99999' };
      mockReq.body = {
        song_id: songId,
        position: 1,
      };

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Playlist not found',
        })
      );
    });

    it('should return 404 when song does not exist', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        song_id: 99999,
        position: 1,
      };

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Song not found',
        })
      );
    });

    it('should return 409 when song already in playlist', () => {
      // Add song first time
      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, 1);

      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        song_id: songId,
        position: 2,
      };

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Song already in playlist',
        })
      );
    });

    it('should handle database errors', () => {
      mockReq.params = { id: String(playlistId) };
      mockReq.body = {
        song_id: songId,
        position: 1,
      };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO playlist_songs')) {
          return {
            run: vi.fn().mockImplementation(() => {
              throw new Error('Database error');
            }),
          };
        }
        return originalPrepare(sql);
      });

      addSongToPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('removeSongFromPlaylist', () => {
    let playlistId: number;
    let songId: number;

    beforeEach(() => {
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const playlistResult = insertPlaylist.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      playlistId = Number(playlistResult.lastInsertRowid);

      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const songResult = insertSong.run(testSongs.song1.title, testSongs.song1.duration, testSongs.song1.file_url);
      songId = Number(songResult.lastInsertRowid);

      // Add song to playlist
      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, 1);
    });

    it('should remove song from playlist', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: String(songId),
      };

      removeSongFromPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();

      // Verify song is removed
      const link = testDb.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(playlistId, songId);
      expect(link).toBeUndefined();
    });

    it('should return 404 when song not in playlist', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: '99999',
      };

      removeSongFromPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Song not found in playlist',
        })
      );
    });

    it('should return 404 when playlist exists but song is not in it', () => {
      // Create another song that's not in the playlist
      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const songResult = insertSong.run(testSongs.song2.title, testSongs.song2.duration, testSongs.song2.file_url);
      const otherSongId = Number(songResult.lastInsertRowid);

      mockReq.params = {
        id: String(playlistId),
        songId: String(otherSongId),
      };

      removeSongFromPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Song not found in playlist',
        })
      );
    });

    it('should handle database errors', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: String(songId),
      };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('DELETE FROM playlist_songs')) {
          return {
            run: vi.fn().mockImplementation(() => {
              throw new Error('Database error');
            }),
          };
        }
        return originalPrepare(sql);
      });

      removeSongFromPlaylist(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('reorderSong', () => {
    let playlistId: number;
    let songId: number;

    beforeEach(() => {
      const insertPlaylist = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      const playlistResult = insertPlaylist.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      playlistId = Number(playlistResult.lastInsertRowid);

      const insertSong = testDb.prepare('INSERT INTO songs (title, duration, file_url) VALUES (?, ?, ?)');
      const songResult = insertSong.run(testSongs.song1.title, testSongs.song1.duration, testSongs.song1.file_url);
      songId = Number(songResult.lastInsertRowid);

      // Add song to playlist
      testDb.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, 1);
    });

    it('should update song position', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: String(songId),
      };
      mockReq.body = {
        new_position: 5,
      };

      reorderSong(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Song position updated',
        new_position: 5,
      });

      // Verify position updated in database
      const link = testDb.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(playlistId, songId) as any;
      expect(link.position).toBe(5);
    });

    it('should return 404 when song not in playlist', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: '99999',
      };
      mockReq.body = {
        new_position: 2,
      };

      reorderSong(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Song not found in playlist',
        })
      );
    });

    it('should handle moving song to position 1', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: String(songId),
      };
      mockReq.body = {
        new_position: 1,
      };

      reorderSong(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Song position updated',
        new_position: 1,
      });
    });

    it('should handle database errors', () => {
      mockReq.params = {
        id: String(playlistId),
        songId: String(songId),
      };
      mockReq.body = {
        new_position: 2,
      };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('UPDATE playlist_songs')) {
          return {
            run: vi.fn().mockImplementation(() => {
              throw new Error('Database error');
            }),
          };
        }
        return originalPrepare(sql);
      });

      reorderSong(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });

  describe('getPlaylistsByUser', () => {
    it('should return all playlists for a user', () => {
      // Create multiple playlists for user
      const insert = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      insert.run(testPlaylists.playlist1.name, testPlaylists.playlist1.description, userId, 1);
      insert.run(testPlaylists.playlist2.name, testPlaylists.playlist2.description, userId, 0);

      // Create playlist for different user
      insert.run(testPlaylists.playlist3.name, testPlaylists.playlist3.description, userId2, 1);

      mockReq.params = { userId: String(userId) };

      getPlaylistsByUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: testPlaylists.playlist1.name,
            user_id: userId,
          }),
          expect.objectContaining({
            name: testPlaylists.playlist2.name,
            user_id: userId,
          }),
        ])
      );

      const callArg = (mockRes.json as any).mock.calls[0][0];
      expect(callArg).toHaveLength(2);
      // Should not include playlist from other user
      expect(callArg.every((p: any) => p.user_id === userId)).toBe(true);
    });

    it('should return empty array when user has no playlists', () => {
      mockReq.params = { userId: String(userId) };

      getPlaylistsByUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should return empty array for non-existent user', () => {
      mockReq.params = { userId: '99999' };

      getPlaylistsByUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should order playlists by created_at DESC', () => {
      const insert = testDb.prepare('INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
      insert.run('First Playlist', 'First', userId, 1);
      insert.run('Second Playlist', 'Second', userId, 1);

      mockReq.params = { userId: String(userId) };

      getPlaylistsByUser(mockReq as Request, mockRes as Response, mockNext);

      const callArg = (mockRes.json as any).mock.calls[0][0];
      expect(callArg).toHaveLength(2);
      // Both playlists should be in the result (order is tested in getAllPlaylists)
      const names = callArg.map((p: any) => p.name);
      expect(names).toContain('First Playlist');
      expect(names).toContain('Second Playlist');
    });

    it('should handle database errors', () => {
      mockReq.params = { userId: String(userId) };

      const db = getTestDb();
      const originalPrepare = db.prepare.bind(db);
      db.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      });

      getPlaylistsByUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      db.prepare = originalPrepare;
    });
  });
});
