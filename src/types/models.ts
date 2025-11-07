export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Artist {
  id: number;
  name: string;
  bio: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Album {
  id: number;
  title: string;
  release_year: number | null;
  cover_art_url: string | null;
  created_at: string;
}

export interface Song {
  id: number;
  title: string;
  duration: number;
  file_url: string | null;
  album_id: number | null;
  created_at: string;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  is_public: boolean;
  created_at: string;
}

// Extended types with relations
export interface SongWithDetails extends Song {
  artists?: Artist[];
  album?: Album;
}

export interface AlbumWithDetails extends Album {
  artists?: Artist[];
  songs?: Song[];
}

export interface ArtistWithDetails extends Artist {
  songs?: Song[];
  albums?: Album[];
}

export interface PlaylistWithDetails extends Playlist {
  songs?: (Song & { position: number; added_at: string })[];
  user?: User;
}

// Create/Update DTOs (Data Transfer Objects)
export interface CreateUser {
  name: string;
  email: string;
}

export interface CreateArtist {
  name: string;
  bio?: string;
  image_url?: string;
}

export interface CreateAlbum {
  title: string;
  release_year?: number;
  cover_art_url?: string;
}

export interface CreateSong {
  title: string;
  duration: number;
  file_url?: string;
  album_id?: number;
  artist_ids?: number[];
}

export interface CreatePlaylist {
  name: string;
  description?: string;
  user_id: number;
  is_public?: boolean;
}

export interface AddSongToPlaylist {
  song_id: number;
  position: number;
}
