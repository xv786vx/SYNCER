import { APIErrorHandler, withErrorHandling } from "./errorHandling";

export async function getThing(url: string) {
  return withErrorHandling(async () => {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to fetch data");
}

// Get auto-matched songs for Spotify → YouTube
export async function syncSpToYt(playlistName: string) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}`,
      {
        method: "GET",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync Spotify playlist to YouTube");
}

// Finalize playlist creation on YouTube
export async function finalizeSpToYt(playlistName: string, ytIds: string[]) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/finalize_sp_to_yt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_name: playlistName, yt_ids: ytIds }),
      }
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize Spotify to YouTube sync");
}

// Manual search for a song on YouTube
export async function manualSearchSpToYt(song: string, artist: string) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/manual_search_sp_to_yt?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// Get auto-matched songs for YouTube → Spotify
export async function syncYtToSp(playlistName: string) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync YouTube playlist to Spotify");
}

// Finalize playlist creation on Spotify
export async function finalizeYtToSp(playlistName: string, spIds: string[]) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/finalize_yt_to_sp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_name: playlistName, sp_ids: spIds }),
      }
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize YouTube to Spotify sync");
}

// Manual search for a song on Spotify
export async function manualSearchYtToSp(song: string, artist: string) {
  return withErrorHandling(async () => {
    const response = await fetch(
      `https://syncer-hwgu.onrender.com/api/manual_search_yt_to_sp?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}
