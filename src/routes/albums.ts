import { Router } from 'express';
import {
  getAllAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addArtistToAlbum,
} from '../controllers/albums.js';

const router = Router();

// GET /api/albums - Get all albums
router.get('/', getAllAlbums);

// GET /api/albums/:id - Get album by ID with artists and songs
router.get('/:id', getAlbumById);

// POST /api/albums - Create new album
router.post('/', createAlbum);

// PUT /api/albums/:id - Update album
router.put('/:id', updateAlbum);

// DELETE /api/albums/:id - Delete album
router.delete('/:id', deleteAlbum);

// POST /api/albums/:id/artists - Add artist to album
router.post('/:id/artists', addArtistToAlbum);

export default router;
