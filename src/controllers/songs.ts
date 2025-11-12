import type { Request, Response, NextFunction } from 'express';
import db from '../db/connection.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { Song, SongWithDetails, CreateSong } from '../types/models.js';

// Get all songs
export function getAllSongs(_req: Request, res: Response, next: NextFunction) {
  try {
    const songs = db.prepare('SELECT * FROM songs ORDER BY created_at DESC').all() as Song[];
    res.json(songs);
  } catch (error) {
    next(error);
  }
}

// Get song by ID with details (artists, album)
export function getSongById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Song | undefined;

    if (!song) {
      throw new ApiError(404, 'Song not found');
    }

    // Get artists
    const artists = db.prepare(`
      SELECT a.* FROM artists a
      JOIN song_artists sa ON a.id = sa.artist_id
      WHERE sa.song_id = ?
    `).all(id) as any;

    // Get album if exists
    const album = song.album_id
      ? db.prepare('SELECT * FROM albums WHERE id = ?').get(song.album_id) as any
      : null;

    const songWithDetails: SongWithDetails = {
      ...song,
      artists,
      album: album || undefined,
    };

    res.json(songWithDetails);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new song
 *
 * Creates a new song with the provided title, duration, and artist associations.
 * Request body is validated by validateBody middleware using createSongSchema.
 *
 * @param req - Express request object with validated body
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @returns 201 - Created song object
 *
 * @remarks
 * - At least one artist must be provided (enforced by validation)
 * - Creates song-artist associations in the song_artists junction table
 * - Album association is optional
 */
export function createSong(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, duration, file_url, album_id, artist_ids }: CreateSong = req.body;

    const insert = db.prepare(
      'INSERT INTO songs (title, duration, file_url, album_id) VALUES (?, ?, ?, ?)'
    );

    const result = insert.run(title, duration, file_url || null, album_id || null);
    const songId = result.lastInsertRowid;

    // Link artists
    const linkArtist = db.prepare('INSERT INTO song_artists (song_id, artist_id) VALUES (?, ?)');
    artist_ids.forEach(artistId => {
      linkArtist.run(songId, artistId);
    });

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId) as Song;
    res.status(201).json(song);
  } catch (error) {
    next(error);
  }
}

// Update song
export function updateSong(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { title, duration, file_url, album_id } = req.body;

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
    if (!song) {
      throw new ApiError(404, 'Song not found');
    }

    const update = db.prepare(`
      UPDATE songs
      SET title = COALESCE(?, title),
          duration = COALESCE(?, duration),
          file_url = COALESCE(?, file_url),
          album_id = COALESCE(?, album_id)
      WHERE id = ?
    `);

    update.run(title, duration, file_url, album_id, id);

    const updatedSong = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Song;
    res.json(updatedSong);
  } catch (error) {
    next(error);
  }
}

// Delete song
export function deleteSong(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
    if (!song) {
      throw new ApiError(404, 'Song not found');
    }

    db.prepare('DELETE FROM songs WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// Get songs by artist
export function getSongsByArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const { artistId } = req.params;

    const songs = db.prepare(`
      SELECT s.* FROM songs s
      JOIN song_artists sa ON s.id = sa.song_id
      WHERE sa.artist_id = ?
      ORDER BY s.created_at DESC
    `).all(artistId) as Song[];

    res.json(songs);
  } catch (error) {
    next(error);
  }
}

// Get songs by album
export function getSongsByAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { albumId } = req.params;

    const songs = db.prepare(`
      SELECT * FROM songs
      WHERE album_id = ?
      ORDER BY id ASC
    `).all(albumId) as Song[];

    res.json(songs);
  } catch (error) {
    next(error);
  }
}
