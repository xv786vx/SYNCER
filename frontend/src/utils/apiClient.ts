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

// Base URL configuration
const API_BASE_URL = "https://syncer-26vh.onrender.com"; // Remote backend
// const API_BASE_URL = "http://localhost:8000"; // Local backend for development

// Common fetch options to use for all requests
const defaultFetchOptions: RequestInit = {
  method: "GET",
  mode: "cors",
  credentials: "include", // Important for authentication cookies
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// Generic function for API requests - using direct calls with CORS headers
async function fetchApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const fetchOptions = {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
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

// Get auto-matched songs for Spotify → YouTube
export async function syncSpToYt(playlistName: string) {
  const url = `${API_BASE_URL}/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync Spotify playlist to YouTube");
}

// Finalize playlist creation on YouTube
export async function finalizeSpToYt(playlistName: string, ytIds: string[]) {
  const url = `${API_BASE_URL}/api/finalize_sp_to_yt`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({ playlist_name: playlistName, yt_ids: ytIds }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize Spotify to YouTube sync");
}

// Manual search for a song on YouTube
export async function manualSearchSpToYt(song: string, artist: string) {
  const url = `${API_BASE_URL}/api/manual_search_sp_to_yt?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// Get auto-matched songs for YouTube → Spotify
export async function syncYtToSp(playlistName: string) {
  const url = `${API_BASE_URL}/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync YouTube playlist to Spotify");
}

// Finalize playlist creation on Spotify
export async function finalizeYtToSp(playlistName: string, spIds: string[]) {
  const url = `${API_BASE_URL}/api/finalize_yt_to_sp`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url, {
      method: "POST",
      body: JSON.stringify({ playlist_name: playlistName, sp_ids: spIds }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize YouTube to Spotify sync");
}

// Manual search for a song on Spotify
export async function manualSearchYtToSp(song: string, artist: string) {
  const url = `${API_BASE_URL}/api/manual_search_yt_to_sp?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`;
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

// Merge Spotify and YouTube playlists
export async function mergePlaylists(
  ytPlaylist: string,
  spPlaylist: string,
  mergeName: string
) {
  const url = `${API_BASE_URL}/api/merge_playlists?yt_playlist=${encodeURIComponent(ytPlaylist)}&sp_playlist=${encodeURIComponent(spPlaylist)}&merge_name=${encodeURIComponent(mergeName)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to merge playlists");
}

// Download a YouTube song
export async function downloadYtSong(songTitle: string, artists: string) {
  const url = `${API_BASE_URL}/api/download_yt_song?song_name=${encodeURIComponent(songTitle)}&artists=${encodeURIComponent(artists)}`;
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to download YouTube song");
}
