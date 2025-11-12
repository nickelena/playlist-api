import { Router } from 'express';
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
} from '../controllers/playlists.js';
import { validateBody } from '../middleware/validate.js';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  addSongToPlaylistSchema,
  reorderSongSchema,
} from '../validation/schemas.js';

const router = Router();

// GET /api/playlists - Get all playlists
router.get('/', getAllPlaylists);

// GET /api/playlists/user/:userId - Get playlists by user
router.get('/user/:userId', getPlaylistsByUser);

// GET /api/playlists/:id - Get playlist by ID with songs
router.get('/:id', getPlaylistById);

// POST /api/playlists - Create new playlist
router.post('/', validateBody(createPlaylistSchema), createPlaylist);

// PUT /api/playlists/:id - Update playlist
router.put('/:id', validateBody(updatePlaylistSchema), updatePlaylist);

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', deletePlaylist);

// POST /api/playlists/:id/songs - Add song to playlist
router.post('/:id/songs', validateBody(addSongToPlaylistSchema), addSongToPlaylist);

// DELETE /api/playlists/:id/songs/:songId - Remove song from playlist
router.delete('/:id/songs/:songId', removeSongFromPlaylist);

// PUT /api/playlists/:id/songs/:songId/position - Reorder song in playlist
router.put('/:id/songs/:songId/position', validateBody(reorderSongSchema), reorderSong);

export default router;
