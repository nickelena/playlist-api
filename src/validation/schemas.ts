/**
 * Zod validation schemas for request body validation
 *
 * This module defines Zod schemas for validating incoming API requests.
 * Each schema corresponds to a specific endpoint and validates the shape
 * and constraints of the request body data.
 *
 * @module validation/schemas
 */

import { z } from 'zod';

// ============================================================================
// User Schemas
// ============================================================================

/**
 * Schema for creating a new user
 *
 * Validates:
 * - name: Required string, 1-255 characters
 * - email: Required valid email format
 *
 * @example
 * ```json
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com"
 * }
 * ```
 */
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email format'),
});

/**
 * Schema for updating an existing user
 *
 * Validates:
 * - name: Optional string, 1-255 characters
 * - email: Optional valid email format
 *
 * @remarks All fields are optional to allow partial updates
 */
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(255, 'Name must be less than 255 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

// ============================================================================
// Artist Schemas
// ============================================================================

/**
 * Schema for creating a new artist
 *
 * Validates:
 * - name: Required string, 1-255 characters
 * - bio: Optional string, max 1000 characters
 * - image_url: Optional valid URL format
 */
export const createArtistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  image_url: z.string().url('Invalid URL format').optional(),
});

/**
 * Schema for updating an existing artist
 *
 * Validates:
 * - name: Optional string, 1-255 characters
 * - bio: Optional/nullable string, max 1000 characters
 * - image_url: Optional/nullable valid URL format
 *
 * @remarks All fields are optional to allow partial updates. Nullable fields can be set to null.
 */
export const updateArtistSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(255, 'Name must be less than 255 characters').optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional().nullable(),
  image_url: z.string().url('Invalid URL format').optional().nullable(),
});

// ============================================================================
// Album Schemas
// ============================================================================

/**
 * Schema for creating a new album
 *
 * Validates:
 * - title: Required string, 1-255 characters
 * - release_year: Optional integer between 1900 and current year + 1
 * - cover_art_url: Optional valid URL format
 */
export const createAlbumSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  release_year: z.number().int('Release year must be an integer').min(1900, 'Release year must be 1900 or later').max(new Date().getFullYear() + 1, 'Release year cannot be in the future').optional(),
  cover_art_url: z.string().url('Invalid URL format').optional(),
});

/**
 * Schema for updating an existing album
 *
 * Validates:
 * - title: Optional string, 1-255 characters
 * - release_year: Optional/nullable integer between 1900 and current year + 1
 * - cover_art_url: Optional/nullable valid URL format
 *
 * @remarks All fields are optional to allow partial updates. Nullable fields can be set to null.
 */
export const updateAlbumSchema = z.object({
  title: z.string().min(1, 'Title must not be empty').max(255, 'Title must be less than 255 characters').optional(),
  release_year: z.number().int('Release year must be an integer').min(1900, 'Release year must be 1900 or later').max(new Date().getFullYear() + 1, 'Release year cannot be in the future').optional().nullable(),
  cover_art_url: z.string().url('Invalid URL format').optional().nullable(),
});

/**
 * Schema for adding an artist to an album
 *
 * Validates:
 * - artist_id: Required positive integer
 */
export const addArtistToAlbumSchema = z.object({
  artist_id: z.number().int('Artist ID must be an integer').positive('Artist ID must be positive'),
});

// ============================================================================
// Song Schemas
// ============================================================================

/**
 * Schema for creating a new song
 *
 * Validates:
 * - title: Required string, 1-255 characters
 * - duration: Required positive integer (in seconds)
 * - file_url: Optional valid URL format
 * - album_id: Optional positive integer
 * - artist_ids: Required non-empty array of positive integers
 *
 * @example
 * ```json
 * {
 *   "title": "Bohemian Rhapsody",
 *   "duration": 354,
 *   "file_url": "https://example.com/song.mp3",
 *   "album_id": 1,
 *   "artist_ids": [1, 2]
 * }
 * ```
 */
export const createSongSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  duration: z.number().int('Duration must be an integer').positive('Duration must be positive'),
  file_url: z.string().url('Invalid URL format').optional(),
  album_id: z.number().int('Album ID must be an integer').positive('Album ID must be positive').optional(),
  artist_ids: z.array(z.number().int('Artist ID must be an integer').positive('Artist ID must be positive')).min(1, 'At least one artist is required'),
});

/**
 * Schema for updating an existing song
 *
 * Validates:
 * - title: Optional string, 1-255 characters
 * - duration: Optional positive integer (in seconds)
 * - file_url: Optional/nullable valid URL format
 * - album_id: Optional/nullable positive integer
 *
 * @remarks All fields are optional to allow partial updates. Artist updates are not supported via this endpoint.
 */
export const updateSongSchema = z.object({
  title: z.string().min(1, 'Title must not be empty').max(255, 'Title must be less than 255 characters').optional(),
  duration: z.number().int('Duration must be an integer').positive('Duration must be positive').optional(),
  file_url: z.string().url('Invalid URL format').optional().nullable(),
  album_id: z.number().int('Album ID must be an integer').positive('Album ID must be positive').optional().nullable(),
});

// ============================================================================
// Playlist Schemas
// ============================================================================

/**
 * Schema for creating a new playlist
 *
 * Validates:
 * - name: Required string, 1-255 characters
 * - description: Optional string, max 1000 characters
 * - user_id: Required positive integer (owner of the playlist)
 * - is_public: Optional boolean (defaults to true in controller)
 */
export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  user_id: z.number().int('User ID must be an integer').positive('User ID must be positive'),
  is_public: z.boolean().optional(),
});

/**
 * Schema for updating an existing playlist
 *
 * Validates:
 * - name: Optional string, 1-255 characters
 * - description: Optional/nullable string, max 1000 characters
 * - is_public: Optional boolean
 *
 * @remarks All fields are optional to allow partial updates. User ID cannot be changed.
 */
export const updatePlaylistSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(255, 'Name must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional().nullable(),
  is_public: z.boolean().optional(),
});

/**
 * Schema for adding a song to a playlist
 *
 * Validates:
 * - song_id: Required positive integer
 * - position: Optional positive integer (if not provided, song is added at the end)
 */
export const addSongToPlaylistSchema = z.object({
  song_id: z.number().int('Song ID must be an integer').positive('Song ID must be positive'),
  position: z.number().int('Position must be an integer').positive('Position must be positive').optional(),
});

/**
 * Schema for reordering a song within a playlist
 *
 * Validates:
 * - new_position: Required positive integer (1-indexed position in playlist)
 */
export const reorderSongSchema = z.object({
  new_position: z.number().int('Position must be an integer').positive('Position must be positive'),
});

// ============================================================================
// TypeScript Types (Inferred from Schemas)
// ============================================================================

/**
 * Type definitions inferred from Zod schemas
 * These types can be used for type-safe request handling in controllers
 */

/** Type for creating a new user (inferred from createUserSchema) */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Type for updating an existing user (inferred from updateUserSchema) */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Type for creating a new artist (inferred from createArtistSchema) */
export type CreateArtistInput = z.infer<typeof createArtistSchema>;

/** Type for updating an existing artist (inferred from updateArtistSchema) */
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;

/** Type for creating a new album (inferred from createAlbumSchema) */
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;

/** Type for updating an existing album (inferred from updateAlbumSchema) */
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

/** Type for adding an artist to an album (inferred from addArtistToAlbumSchema) */
export type AddArtistToAlbumInput = z.infer<typeof addArtistToAlbumSchema>;

/** Type for creating a new song (inferred from createSongSchema) */
export type CreateSongInput = z.infer<typeof createSongSchema>;

/** Type for updating an existing song (inferred from updateSongSchema) */
export type UpdateSongInput = z.infer<typeof updateSongSchema>;

/** Type for creating a new playlist (inferred from createPlaylistSchema) */
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;

/** Type for updating an existing playlist (inferred from updatePlaylistSchema) */
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;

/** Type for adding a song to a playlist (inferred from addSongToPlaylistSchema) */
export type AddSongToPlaylistInput = z.infer<typeof addSongToPlaylistSchema>;

/** Type for reordering a song in a playlist (inferred from reorderSongSchema) */
export type ReorderSongInput = z.infer<typeof reorderSongSchema>;
