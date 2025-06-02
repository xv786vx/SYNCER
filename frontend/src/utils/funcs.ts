import { APIErrorHandler, withErrorHandling } from "./errorHandling";

export async function getThing(url: string) {
  return withErrorHandling(async () => {
    const response = await fetch(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to fetch data");
}

// Get auto-matched songs for Spotify → YouTube
export async function syncSpToYt(playlistName: string, userId: string) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}&user_id=${encodeURIComponent(userId)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync Spotify playlist to YouTube");
}

// Finalize playlist creation on YouTube
export async function finalizeSpToYt(
  playlistName: string,
  ytIds: string[],
  userId: string
) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/finalize_sp_to_yt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_name: playlistName,
          yt_ids: ytIds,
          user_id: userId,
        }),
      }
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize Spotify to YouTube sync");
}

// Manual search for a song on YouTube
export async function manualSearchSpToYt(
  song: string,
  artist: string,
  userId: string
) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/manual_search_sp_to_yt?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&user_id=${encodeURIComponent(userId)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// Get auto-matched songs for YouTube → Spotify
export async function syncYtToSp(playlistName: string, userId: string) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}&user_id=${encodeURIComponent(userId)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync YouTube playlist to Spotify");
}

// Finalize playlist creation on Spotify
export async function finalizeYtToSp(
  playlistName: string,
  spIds: string[],
  userId: string
) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/finalize_yt_to_sp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_name: playlistName,
          sp_ids: spIds,
          user_id: userId,
        }),
      }
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize YouTube to Spotify sync");
}

// Manual search for a song on Spotify
export async function manualSearchYtToSp(
  song: string,
  artist: string,
  userId: string
) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/manual_search_yt_to_sp?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&user_id=${encodeURIComponent(userId)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// Merge Spotify and YouTube playlists
export async function mergePlaylists(
  ytPlaylist: string,
  spPlaylist: string,
  mergeName: string,
  userId: string
) {
  const url = `https://syncer-hwgu.onrender.com/api/merge_playlists?yt_playlist=${encodeURIComponent(ytPlaylist)}&sp_playlist=${encodeURIComponent(spPlaylist)}&merge_name=${encodeURIComponent(mergeName)}&user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetch(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to merge playlists");
}

// Download a YouTube song
export async function downloadYtSong(
  songTitle: string,
  artists: string,
  userId: string
) {
  const url = `https://syncer-hwgu.onrender.com/api/download_yt_song?song_name=${encodeURIComponent(songTitle)}&artists=${encodeURIComponent(artists)}&user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetch(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to download YouTube song");
}
