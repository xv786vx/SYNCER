import * as API from "./apiClient";
import {
  Process,
  StartSyncSpToYtResponse,
  PreSyncCheckSpToYtResponse,
  StartSyncYtToSpResponse,
  PreSyncCheckYtToSpResponse,
  APIResponse,
} from "../types";

export async function handleSyncSpToYt(
  playlistName: string,
  userId: string | null,
  ensureSpotifyAuth: () => Promise<void>,
  ensureYoutubeAuth: () => Promise<void>,
  addProcess: (
    type: string,
    message: string,
    extra: Partial<
      Omit<Process, "id" | "type" | "status" | "message" | "jobId">
    >,
    jobId?: string
  ) => string,
  setOverlayState: (state: "processes" | "none") => void,
  setProcesses: React.Dispatch<React.SetStateAction<Process[]>>,
  startJobPolling: (jobId: string) => void,
  updateProcess: (
    id: string,
    status: Process["status"],
    message?: string,
    interactive?: Process["interactive"]
  ) => void,
  APIErrorHandler: { handleError: (error: Error, msg?: string) => void }
) {
  if (!userId) return;
  await ensureSpotifyAuth();
  await ensureYoutubeAuth();

  try {
    // 1. Get track count for time estimate
    const countResp = await API.getSpPlaylistTrackCount(playlistName, userId);
    const trackCount = countResp?.track_count ?? null;
    const timeEstimate = trackCount ? trackCount * 4 + 5 : undefined;

    // 2. Pre-sync check
    const preSyncResp = (await API.preSyncCheckSpToYt(
      playlistName,
      userId
    )) as PreSyncCheckSpToYtResponse;
    if (!preSyncResp || !Array.isArray(preSyncResp.tracks_to_sync)) {
      throw new Error("Failed to fetch tracks to sync.");
    }
    const { tracks_to_sync, reduced } = preSyncResp;

    // 3. Add process with quota reduction message and time estimate (no jobId yet)
    let processMsg = `Syncing '${playlistName}' from Spotify to YouTube...`;
    if (typeof timeEstimate === "number") {
      processMsg += ` (Est. ${timeEstimate}s)`;
    }
    if (reduced) {
      processMsg += `\nDue to playlist size, only the first 50 songs will be synced.`;
    }
    const processId = addProcess("sync_sp_to_yt", processMsg, {
      playlistName,
      countdownEnd:
        typeof timeEstimate === "number"
          ? Date.now() + timeEstimate * 1000
          : undefined,
    });
    setOverlayState("processes");

    // 4. Start sync job with filtered tracks
    const jobResp = (await API.startSyncSpToYt({
      playlist_name: playlistName,
      user_id: userId,
      tracks_to_sync,
    })) as StartSyncSpToYtResponse;
    if (jobResp && jobResp.job_id) {
      // Update the process to include the backend jobId (UUID)
      setProcesses((prev) =>
        prev.map((p) =>
          p.id === processId ? { ...p, jobId: jobResp.job_id } : p
        )
      );
      startJobPolling(jobResp.job_id);
    } else {
      updateProcess(processId, "error", "Failed to start sync job.");
    }
  } catch (error) {
    APIErrorHandler.handleError(error as Error, "Failed to sync playlist");
  }
}

export async function handleSyncYtToSp(
  playlistName: string,
  userId: string | null,
  ensureSpotifyAuth: () => Promise<void>,
  ensureYoutubeAuth: () => Promise<void>,
  addProcess: (
    type: string,
    message: string,
    extra: Partial<
      Omit<Process, "id" | "type" | "status" | "message" | "jobId">
    >,
    jobId?: string
  ) => string,
  setOverlayState: (state: "processes" | "none") => void,
  setProcesses: React.Dispatch<React.SetStateAction<Process[]>>,
  startJobPolling: (jobId: string) => void,
  updateProcess: (
    id: string,
    status: Process["status"],
    message?: string,
    interactive?: Process["interactive"]
  ) => void,
  APIErrorHandler: { handleError: (error: Error, msg?: string) => void }
) {
  if (!userId) return;
  await ensureSpotifyAuth();
  await ensureYoutubeAuth();

  try {
    // 1. Get track count for time estimate
    const countResp = await API.getYtPlaylistTrackCount(playlistName, userId);
    const trackCount = countResp?.track_count ?? null;
    const timeEstimate = trackCount ? trackCount * 4 + 5 : undefined;

    // 2. Pre-sync check
    const preSyncResp = (await API.preSyncCheckYtToSp(
      playlistName,
      userId
    )) as PreSyncCheckYtToSpResponse;
    if (!preSyncResp || !Array.isArray(preSyncResp.tracks_to_sync)) {
      throw new Error("Failed to fetch tracks to sync.");
    }
    const { tracks_to_sync, reduced } = preSyncResp;

    // 3. Add process with quota reduction message and time estimate (no jobId yet)
    let processMsg = `Syncing '${playlistName}' from YouTube to Spotify...`;
    if (typeof timeEstimate === "number") {
      processMsg += ` (Est. ${timeEstimate}s)`;
    }
    if (reduced) {
      processMsg += `\nDue to playlist size, only the first ${tracks_to_sync.length} songs will be synced.`;
    }
    const processId = addProcess("sync_yt_to_sp", processMsg, {
      playlistName,
      countdownEnd:
        typeof timeEstimate === "number"
          ? Date.now() + timeEstimate * 1000
          : undefined,
    });
    setOverlayState("processes");

    // 4. Start sync job with filtered tracks
    const jobResp = (await API.startSyncYtToSp({
      playlist_name: playlistName,
      user_id: userId,
      tracks_to_sync,
    })) as StartSyncYtToSpResponse;
    if (jobResp && jobResp.job_id) {
      // Update the process to include the backend jobId (UUID)
      setProcesses((prev) =>
        prev.map((p) =>
          p.id === processId ? { ...p, jobId: jobResp.job_id } : p
        )
      );
      startJobPolling(jobResp.job_id);
    } else {
      updateProcess(processId, "error", "Failed to start sync job.");
    }
  } catch (error) {
    APIErrorHandler.handleError(error as Error, "Failed to sync playlist");
  }
}

export async function handleMergePlaylists(
  userId: string | null,
  ytPlaylist: string,
  spPlaylist: string,
  mergeName: string,
  ensureSpotifyAuth: () => Promise<void>,
  ensureYoutubeAuth: () => Promise<void>,
  startJobPolling: (jobId: string) => void,
  APIErrorHandler: { handleError: (error: Error, msg?: string) => void }
) {
  if (!userId || !ytPlaylist || !spPlaylist || !mergeName) return;
  await ensureSpotifyAuth();
  await ensureYoutubeAuth();

  try {
    const data = (await API.startMergePlaylists(
      ytPlaylist,
      spPlaylist,
      mergeName,
      userId
    )) as { job_id: string };
    if (data.job_id) {
      startJobPolling(data.job_id);
    }
  } catch (error) {
    APIErrorHandler.handleError(error as Error, "Failed to start merge job");
  }
}

// fix this
export async function handleDownloadSong(
  userId: string | null,
  songTitle: string,
  artists: string,
  addProcess: (
    type: string,
    message: string,
    extra: Partial<
      Omit<Process, "id" | "type" | "status" | "message" | "jobId">
    >,
    jobId?: string
  ) => string,
  updateProcess: (
    id: string,
    status: Process["status"],
    message?: string,
    interactive?: Process["interactive"]
  ) => void,
  removeProcess: (id: string) => void,
  fetchQuota: () => Promise<void>,
  setToast: (message: string) => void,
  APIErrorHandler: { handleError: (error: Error, msg?: string) => void }
) {
  if (!userId) return;
  const processId = addProcess("download", `Downloading "${songTitle}"...`, {});
  try {
    const data = (await API.downloadYtSong(
      songTitle,
      artists,
      userId
    )) as APIResponse;
    if (data.result) {
      setToast(data.result);
      updateProcess(processId, "completed", "Download completed successfully!");
      removeProcess(processId);
      fetchQuota();
    }
  } catch (error) {
    updateProcess(processId, "error", "Failed to download song");
    APIErrorHandler.handleError(error as Error, "Failed to download song");
  }
}
