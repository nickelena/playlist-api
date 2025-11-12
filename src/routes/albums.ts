import { Router } from 'express';
import {
  getAllAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addArtistToAlbum,
} from '../controllers/albums.js';
import { validateBody } from '../middleware/validate.js';
import { createAlbumSchema, updateAlbumSchema, addArtistToAlbumSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/albums - Get all albums
router.get('/', getAllAlbums);

// GET /api/albums/:id - Get album by ID with artists and songs
router.get('/:id', getAlbumById);

// POST /api/albums - Create new album
router.post('/', validateBody(createAlbumSchema), createAlbum);

// PUT /api/albums/:id - Update album
router.put('/:id', validateBody(updateAlbumSchema), updateAlbum);

// DELETE /api/albums/:id - Delete album
router.delete('/:id', deleteAlbum);

// POST /api/albums/:id/artists - Add artist to album
router.post('/:id/artists', validateBody(addArtistToAlbumSchema), addArtistToAlbum);

export default router;
