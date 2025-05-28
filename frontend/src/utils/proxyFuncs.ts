/**
 * Alternative API utility functions that use a CORS proxy to avoid CORS issues
 * during development. This file can be used as a drop-in replacement for funcs.ts
 * when facing CORS issues.
 */
import { APIErrorHandler, withErrorHandling } from "./errorHandling";

// Base URL to use for API requests - change this when switching between environments
// const API_BASE_URL = "http://localhost:8000/api/cors_proxy/"; // Local proxy
const API_BASE_URL = "https://syncer-hwgu.onrender.com/"; // Direct connection to production
// const API_DIRECT_URL = "http://localhost:8000/"; // Direct connection to local backend

/**
 * Generic fetch function for making API requests
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    method: "GET",
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  // Merge default options with provided options
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

export async function getThing(url: string) {
  return withErrorHandling(async () => {
    const response = await fetchApi(url);
    return APIErrorHandler.handleResponse(response);
  }, "Failed to fetch data");
}

// Get auto-matched songs for Spotify → YouTube
export async function syncSpToYt(playlistName: string) {
  return withErrorHandling(async () => {
    const response = await fetchApi(
      `api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync Spotify playlist to YouTube");
}

// Finalize playlist creation on YouTube
export async function finalizeSpToYt(playlistName: string, ytIds: string[]) {
  return withErrorHandling(async () => {
    const response = await fetchApi(`api/finalize_sp_to_yt`, {
      method: "POST",
      body: JSON.stringify({ playlist_name: playlistName, yt_ids: ytIds }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize Spotify to YouTube sync");
}

// Manual search for a song on YouTube
export async function manualSearchSpToYt(song: string, artist: string) {
  return withErrorHandling(async () => {
    const response = await fetchApi(
      `api/manual_search_sp_to_yt?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// Get auto-matched songs for YouTube → Spotify
export async function syncYtToSp(playlistName: string) {
  return withErrorHandling(async () => {
    const response = await fetchApi(
      `api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to sync YouTube playlist to Spotify");
}

// Finalize playlist creation on Spotify
export async function finalizeYtToSp(playlistName: string, spIds: string[]) {
  return withErrorHandling(async () => {
    const response = await fetchApi(`api/finalize_yt_to_sp`, {
      method: "POST",
      body: JSON.stringify({ playlist_name: playlistName, sp_ids: spIds }),
    });
    return APIErrorHandler.handleResponse(response);
  }, "Failed to finalize YouTube to Spotify sync");
}

// Manual search for a song on Spotify
export async function manualSearchYtToSp(song: string, artist: string) {
  return withErrorHandling(async () => {
    const response = await fetchApi(
      `api/manual_search_yt_to_sp?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`
    );
    return APIErrorHandler.handleResponse(response);
  }, "Failed to perform manual search");
}

// Check API/backend status
export async function checkStatus() {
  return withErrorHandling(async () => {
    const response = await fetchApi("");
    return APIErrorHandler.handleResponse(response);
  }, "Failed to check API status");
}

// Get YouTube quota usage
export async function getYoutubeQuota() {
  return withErrorHandling(async () => {
    const response = await fetchApi("api/youtube_quota_usage");
    return APIErrorHandler.handleResponse(response);
  }, "Failed to fetch YouTube quota usage");
}

// Test CORS configuration
export async function testCors() {
  return withErrorHandling(async () => {
    const response = await fetchApi("api/cors_test");
    return APIErrorHandler.handleResponse(response);
  }, "Failed CORS test");
}
