import type { Request, Response, NextFunction } from 'express';
import db from '../db/connection.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { Playlist, PlaylistWithDetails, CreatePlaylist } from '../types/models.js';

// Get all playlists
export function getAllPlaylists(_req: Request, res: Response, next: NextFunction) {
  try {
    const playlists = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all() as Playlist[];
    res.json(playlists);
  } catch (error) {
    next(error);
  }
}

// Get playlist by ID with songs
export function getPlaylistById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Playlist | undefined;

    if (!playlist) {
      throw new ApiError(404, 'Playlist not found');
    }

    // Get songs with playlist-specific data (position, added_at)
    const songs = db.prepare(`
      SELECT s.*, ps.position, ps.added_at
      FROM songs s
      JOIN playlist_songs ps ON s.id = ps.song_id
      WHERE ps.playlist_id = ?
      ORDER BY ps.position ASC
    `).all(id) as any;

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(playlist.user_id) as any;

    const playlistWithDetails: PlaylistWithDetails = {
      ...playlist,
      songs,
      user,
    };

    res.json(playlistWithDetails);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new playlist
 *
 * Creates a new playlist with the provided name, description, and privacy setting.
 * Request body is validated by validateBody middleware using createPlaylistSchema.
 *
 * @param req - Express request object with validated body
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @throws {ApiError} 404 - If the specified user does not exist
 * @returns 201 - Created playlist object
 *
 * @remarks
 * - Verifies user existence before creating playlist
 * - Boolean is_public is converted to 0/1 for SQLite compatibility
 * - Defaults is_public to true if not provided
 */
export function createPlaylist(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, user_id, is_public }: CreatePlaylist = req.body;

    // Verify user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const insert = db.prepare(
      'INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)'
    );

    const result = insert.run(name, description || null, user_id, (is_public ?? true) ? 1 : 0);
    const playlistId = result.lastInsertRowid;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId) as Playlist;
    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
}

// Update playlist
export function updatePlaylist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, is_public } = req.body;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) {
      throw new ApiError(404, 'Playlist not found');
    }

    const update = db.prepare(`
      UPDATE playlists
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          is_public = COALESCE(?, is_public)
      WHERE id = ?
    `);

    update.run(name, description, is_public !== undefined ? (is_public ? 1 : 0) : undefined, id);

    const updatedPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Playlist;
    res.json(updatedPlaylist);
  } catch (error) {
    next(error);
  }
}

// Delete playlist
export function deletePlaylist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) {
      throw new ApiError(404, 'Playlist not found');
    }

    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// Add song to playlist
export function addSongToPlaylist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { song_id, position } = req.body;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) {
      throw new ApiError(404, 'Playlist not found');
    }

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(song_id);
    if (!song) {
      throw new ApiError(404, 'Song not found');
    }

    // If no position provided, add at the end
    let finalPosition = position;
    if (!finalPosition) {
      const maxPosition = db.prepare(
        'SELECT MAX(position) as max_pos FROM playlist_songs WHERE playlist_id = ?'
      ).get(id) as { max_pos: number | null };
      finalPosition = (maxPosition.max_pos || 0) + 1;
    }

    try {
      db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(
        id,
        song_id,
        finalPosition
      );
      res.status(201).json({ message: 'Song added to playlist', position: finalPosition });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ApiError(409, 'Song already in playlist');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

// Remove song from playlist
export function removeSongFromPlaylist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, songId } = req.params;

    const link = db.prepare(
      'SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?'
    ).get(id, songId);

    if (!link) {
      throw new ApiError(404, 'Song not found in playlist');
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(id, songId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// Reorder song in playlist
export function reorderSong(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, songId } = req.params;
    const { new_position } = req.body;

    const link = db.prepare(
      'SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?'
    ).get(id, songId);

    if (!link) {
      throw new ApiError(404, 'Song not found in playlist');
    }

    db.prepare('UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?').run(
      new_position,
      id,
      songId
    );

    res.json({ message: 'Song position updated', new_position });
  } catch (error) {
    next(error);
  }
}

// Get playlists by user
export function getPlaylistsByUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const playlists = db.prepare(`
      SELECT * FROM playlists
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as Playlist[];

    res.json(playlists);
  } catch (error) {
    next(error);
  }
}
