import type { Request, Response, NextFunction } from 'express';
import db from '../db/connection.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { Album, AlbumWithDetails, CreateAlbum } from '../types/models.js';

// Get all albums
export function getAllAlbums(_req: Request, res: Response, next: NextFunction) {
  try {
    const albums = db.prepare('SELECT * FROM albums ORDER BY release_year DESC, title ASC').all() as Album[];
    res.json(albums);
  } catch (error) {
    next(error);
  }
}

// Get album by ID with artists and songs
export function getAlbumById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album | undefined;

    if (!album) {
      throw new ApiError(404, 'Album not found');
    }

    // Get artists
    const artists = db.prepare(`
      SELECT a.* FROM artists a
      JOIN album_artists aa ON a.id = aa.artist_id
      WHERE aa.album_id = ?
    `).all(id) as any;

    // Get songs
    const songs = db.prepare(`
      SELECT * FROM songs
      WHERE album_id = ?
      ORDER BY id ASC
    `).all(id) as any;

    const albumWithDetails: AlbumWithDetails = {
      ...album,
      artists,
      songs,
    };

    res.json(albumWithDetails);
  } catch (error) {
    next(error);
  }
}

// Create new album
export function createAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, release_year, cover_art_url }: CreateAlbum = req.body;

    if (!title) {
      throw new ApiError(400, 'Title is required');
    }

    const insert = db.prepare(
      'INSERT INTO albums (title, release_year, cover_art_url) VALUES (?, ?, ?)'
    );

    const result = insert.run(title, release_year || null, cover_art_url || null);
    const albumId = result.lastInsertRowid;

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(albumId) as Album;
    res.status(201).json(album);
  } catch (error) {
    next(error);
  }
}

// Update album
export function updateAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { title, release_year, cover_art_url } = req.body;

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
    if (!album) {
      throw new ApiError(404, 'Album not found');
    }

    const update = db.prepare(`
      UPDATE albums
      SET title = COALESCE(?, title),
          release_year = COALESCE(?, release_year),
          cover_art_url = COALESCE(?, cover_art_url)
      WHERE id = ?
    `);

    update.run(title, release_year, cover_art_url, id);

    const updatedAlbum = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album;
    res.json(updatedAlbum);
  } catch (error) {
    next(error);
  }
}

// Delete album
export function deleteAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
    if (!album) {
      throw new ApiError(404, 'Album not found');
    }

    db.prepare('DELETE FROM albums WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// Link artist to album
export function addArtistToAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { artist_id } = req.body;

    if (!artist_id) {
      throw new ApiError(400, 'artist_id is required');
    }

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
    if (!album) {
      throw new ApiError(404, 'Album not found');
    }

    const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(artist_id);
    if (!artist) {
      throw new ApiError(404, 'Artist not found');
    }

    try {
      db.prepare('INSERT INTO album_artists (album_id, artist_id) VALUES (?, ?)').run(id, artist_id);
      res.status(201).json({ message: 'Artist added to album' });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ApiError(409, 'Artist already linked to this album');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
}
