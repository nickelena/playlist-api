/**
 * Test data fixtures for use across test suites
 */

export const testUsers = {
  user1: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  user2: {
    name: 'Jane Smith',
    email: 'jane@example.com',
  },
};

export const testArtists = {
  artist1: {
    name: 'The Beatles',
    bio: 'Legendary rock band',
    image_url: 'https://example.com/beatles.jpg',
  },
  artist2: {
    name: 'Queen',
    bio: 'Rock legends',
    image_url: 'https://example.com/queen.jpg',
  },
};

export const testAlbums = {
  album1: {
    title: 'Abbey Road',
    release_year: 1969,
    cover_art_url: 'https://example.com/abbey-road.jpg',
  },
  album2: {
    title: 'A Night at the Opera',
    release_year: 1975,
    cover_art_url: 'https://example.com/opera.jpg',
  },
};

export const testSongs = {
  song1: {
    title: 'Come Together',
    duration: 259,
    file_url: 'https://example.com/come-together.mp3',
  },
  song2: {
    title: 'Bohemian Rhapsody',
    duration: 354,
    file_url: 'https://example.com/bohemian.mp3',
  },
  song3: {
    title: 'Here Comes the Sun',
    duration: 185,
    file_url: 'https://example.com/sun.mp3',
  },
};

export const testPlaylists = {
  playlist1: {
    name: 'My Favorites',
    description: 'Best songs ever',
    is_public: true,
  },
  playlist2: {
    name: 'Workout Mix',
    description: 'High energy tracks',
    is_public: false,
  },
  playlist3: {
    name: 'Chill Vibes',
    description: null,
    is_public: true,
  },
};
