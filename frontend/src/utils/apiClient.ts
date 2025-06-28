/**
 * API Client for SYNCER application
 *
 * This module provides direct API calls to the SYNCER backend with proper CORS handling.
 *
 * CORS Solution:
 * 1. The backend server must be run with CORS development mode enabled:
 *    - Set environment variable CORS_DEV_MODE="true" before starting the server
 *    - This enables permissive CORS settings allowing requests from any origin
 *
 * 2. Frontend makes direct API calls with proper CORS headers:
 *    - mode: "cors" - Explicitly enables CORS
 *    - credentials: "include" - Allows cookies to be sent with requests
 *    - Proper Content-Type and Accept headers
 *
 * 3. API_BASE_URL can be configured to switch between:
 *    - Local backend (http://localhost:8000) for development
 *    - Remote backend (https://syncer-26vh.onrender.com) for production
 */
import { APIErrorHandler, withErrorHandling } from "./errorHandling";
import { ManualSearchResult } from "../components/ManualSearchModal";

// Base URL configuration
const API_BASE_URL = "https://syncer-26vh.onrender.com";

// Generic function for API requests - using direct calls with CORS headers
async function fetchApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const fetchOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  return fetch(url, fetchOptions);
}

// Generic GET request
export async function getThing(url: string) {
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to fetch data");
}

// Get number of tracks in a Spotify playlist
export async function getSpPlaylistTrackCount(
  playlistName: string,
  userId: string
): Promise<{ track_count: number } | null> {
  const url = `${API_BASE_URL}/api/sp_playlist_track_count?playlist_name=${encodeURIComponent(playlistName)}&user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to get Spotify playlist track count");
}

// Get number of tracks in a YouTube playlist
export async function getYtPlaylistTrackCount(
  playlistName: string,
  userId: string
): Promise<{ track_count: number } | null> {
  const url = `${API_BASE_URL}/api/yt_playlist_track_count?playlist_name=${encodeURIComponent(playlistName)}&user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to get YouTube playlist track count");
}

// Manual search for a song on YouTube
export async function manualSearchSpToYt(
  song: string,
  artist: string,
  userId: string
): Promise<ManualSearchResult[]> {
  const url = `${API_BASE_URL}/api/manual_search_sp_to_yt?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&user_id=${encodeURIComponent(userId)}`;

  const result = await withErrorHandling(async () => {
    const response = await fetchApi(url);
    const data = await APIErrorHandler.handleResponse(response);
    return data as ManualSearchResult[];
  }, "Failed to perform manual search");

  return result || [];
}

// Manual search for a song on Spotify
export async function manualSearchYtToSp(
  song: string,
  artist: string,
  userId: string
) {
  const url = `${API_BASE_URL}/api/manual_search_yt_to_sp?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// For getting application status
export async function getStatus() {
  const url = `${API_BASE_URL}/`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to get application status");
}

// For getting YouTube quota usage
export async function getYoutubeQuota() {
  const url = `${API_BASE_URL}/api/youtube_quota_usage`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to get YouTube quota usage");
}

/**
 * Set YouTube API Quota Usage Value
 *
 * This function allows manually setting the YouTube API quota usage count
 * to maintain accuracy when switching between environments.
 *
 * IMPORTANT: Use this function to synchronize quota counts between local and deployed environments:
 *
 * When to use:
 * 1. When switching from local development to deployed backend:
 *    - Check your current quota count from local backend
 *    - Set the same quota value on the deployed backend
 *
 * 2. When switching from deployed to local development:
 *    - Check the quota count from the deployed backend
 *    - Set the same quota value on your local backend
 *
 * Example:
 * ```
 * // If you know the current quota is 4332
 * await setYoutubeQuota(4332);
 * ```
 *
 * @param quotaValue The desired quota usage value to set
 * @returns API response or null if an error occurred
 */
export async function setYoutubeQuota(quotaValue: number) {
  const url = `${API_BASE_URL}/api/set_youtube_quota`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({ quota_value: quotaValue }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to set YouTube quota usage");
}

// Download a YouTube song
export async function downloadYtSong(
  songTitle: string,
  artists: string,
  userId: string
) {
  const url = `${API_BASE_URL}/api/download_yt_song?song_name=${encodeURIComponent(songTitle)}&artists=${encodeURIComponent(artists)}&user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to download YouTube song");
}

// YouTube OAuth: Get auth URL
export async function getYoutubeAuthUrl(userId: string) {
  const url = `${API_BASE_URL}/api/youtube_auth_url?user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    const data = await APIErrorHandler.handleResponse(response);
    return (data as { auth_url: string }).auth_url;
  }, "Failed to get YouTube auth URL");
}

// Add a function to trigger YouTube OAuth from the frontend
export async function startYoutubeOAuth(userId: string) {
  const authUrl = await getYoutubeAuthUrl(userId);
  if (authUrl) {
    window.open(authUrl, "_blank");
  } else {
    throw new Error("Failed to get YouTube OAuth URL");
  }
}

// Check YouTube authentication status for a user
export async function getYoutubeAuthStatus(
  userId: string
): Promise<{ authenticated: boolean } | null> {
  const url = `${API_BASE_URL}/api/youtube_auth_status?user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to check YouTube authentication status");
}

export async function getSpotifyAuthStatus(
  userId: string
): Promise<{ authenticated: boolean } | null> {
  const url = `${API_BASE_URL}/api/spotify_auth_status?user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to check Spotify authentication status");
}

export async function getSpotifyAuthUrl(userId: string) {
  const url = `${API_BASE_URL}/api/spotify_auth_url?user_id=${encodeURIComponent(userId)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    const data = await APIErrorHandler.handleResponse(response);
    return (data as { auth_url: string }).auth_url;
  }, "Failed to get Spotify auth URL");
}

export async function startSpotifyOAuth(userId: string) {
  const authUrl = await getSpotifyAuthUrl(userId);
  if (authUrl) {
    window.open(authUrl, "_blank");
  } else {
    throw new Error("Failed to get Spotify OAuth URL");
  }
}

// --- NEW ASYNC JOB-BASED FUNCTIONS ---

// Start a Spotify to YouTube sync job
export async function startSyncSpToYt(playlistName: string, userId: string) {
  const url = `${API_BASE_URL}/jobs/sync_sp_to_yt`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({ playlist_name: playlistName, user_id: userId }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to start Spotify to YouTube sync job");
}

// Start a YouTube to Spotify sync job
export async function startSyncYtToSp(playlistName: string, userId: string) {
  const url = `${API_BASE_URL}/jobs/sync_yt_to_sp`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({ playlist_name: playlistName, user_id: userId }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to start YouTube to Spotify sync job");
}

// Start a merge playlists job
export async function startMergePlaylists(
  ytPlaylist: string,
  spPlaylist: string,
  mergeName: string,
  userId: string
) {
  const url = `${API_BASE_URL}/jobs/merge_playlists`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({
        yt_playlist: ytPlaylist,
        sp_playlist: spPlaylist,
        new_playlist_name: mergeName,
        user_id: userId,
      }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to start merge playlists job");
}

// Get the status of a running job
export async function getJobStatus(jobId: string) {
  const url = `${API_BASE_URL}/jobs/${jobId}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to get job status");
}

// Get the latest job for a user
export async function getLatestJob(userId: string) {
  const url = `${API_BASE_URL}/jobs/latest/${userId}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    // It's okay if this fails with a 404, so we handle that gracefully
    if (response.status === 404) {
      return null;
    }
    return APIErrorHandler.handleResponse(response);
  }, "Failed to get the latest job");
}

// Finalize a job
export async function finalizeJob(jobId: string) {
  const url = `${API_BASE_URL}/jobs/${jobId}/finalize`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({}), // Finalize might not need a body
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize job");
}

// Health check for the backend
export async function healthCheck(): Promise<{ status: string } | null> {
  const url = `${API_BASE_URL}/health`;
  // Don't use withErrorHandling here, as we want to handle the error differently
  try {
    const response = await fetchApi(url);
    if (!response.ok) {
      return null;
    }
    return APIErrorHandler.handleResponse(response);
  } catch {
    return null;
  }
}
