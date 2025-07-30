import { usePersistentState } from "../utils/usePersistentState";
import { useEffect, useCallback } from "react";
import { Job, Process, SongStatus } from "../types";
import * as API from '../utils/apiClient';

// Accept all dependencies as arguments
export function useJobPolling({
  userId,
  setProcesses,
  setToast,
  setSpToYtSongs,
  setOverlayState,
  setIsFinalizing,
  APIErrorHandler,
}: {
  userId: string | null;
  setProcesses: React.Dispatch<React.SetStateAction<Process[]>>;
  setToast: (msg: string) => void;
  setSpToYtSongs: React.Dispatch<React.SetStateAction<SongStatus[]>>;
  setOverlayState: (state: 'none' | 'processes' | 'finalizing' | 'songSyncStatus') => void;
  setIsFinalizing: (v: boolean) => void;
  APIErrorHandler: { handleError: (error: Error, msg?: string) => void };
}) {
  const [currentJobId, setCurrentJobId] = usePersistentState<string | null>('currentJobId', null);

  const startJobPolling = (jobId: string) => {
    setCurrentJobId(jobId);
  };

  const handleJobUpdate = useCallback((job: Job) => {
    // ...existing code for job update logic...
    console.log("Handling job update", job);
    if (job.status === "ready_to_finalize") {
      console.log("[DEBUG] job.result.songs:", job.result?.songs);
    }

    const errorMessage = job.error || 'An unknown error occurred.';

    if (job.status === "completed") {
      const toastMessage = job.job_notes
        ? job.job_notes
        : `Sync of '${job.playlist_name}' complete.`;
      setToast(toastMessage);
      setIsFinalizing(false);
      setOverlayState('processes');
    } else if (job.status === "error") {
      if (job.result?.songs && job.result.songs.length > 0) {
        setSpToYtSongs(job.result.songs);
        setOverlayState('songSyncStatus');
      }
      setToast(job.job_notes ? job.job_notes : `Error in job ${job.job_id}: ${errorMessage}`);
      setIsFinalizing(false);
      if (!job.result?.songs || job.result.songs.length === 0) {
        setOverlayState('processes');
      }
    } else if (job.status === "ready_to_finalize") {
      setSpToYtSongs(job.result?.songs || []);
      setOverlayState('songSyncStatus');
    }

    setProcesses((prevProcesses) =>
      prevProcesses.map((p) => {
        if (p.id === currentJobId) {
          if (job.status === "completed") {
            const processMessage = job.job_notes
              ? job.job_notes
              : `Sync of '${job.playlist_name}' complete.`;
            const subMessage = job.result?.songs
              ? `${job.result.songs.length} songs synced.`
              : "";
            return {
              ...p,
              status: "completed",
              message: processMessage,
              subMessage: subMessage,
            };
          }
          if (job.status === "error") {
            return {
              ...p,
              status: "error",
              message: job.job_notes ? job.job_notes : errorMessage,
              subMessage: job.result?.songs ? `${job.result.songs.length} songs synced before error.` : undefined,
            };
          }
          if (job.status === "ready_to_finalize") {
            return {
              ...p,
              status: "done",
              message: `Sync ready for review.`,
            };
          }
        }
        return p;
      })
    );
  }, [setProcesses, setToast, setSpToYtSongs, setOverlayState, setIsFinalizing, currentJobId]);

  // Polling effect
  useEffect(() => {
    if (!currentJobId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const job = await API.getJobStatus(currentJobId) as Job;
        handleJobUpdate(job);

        if (job.status === 'completed' || job.status === 'error' || job.status === 'ready_to_finalize') {
          clearInterval(interval);
        }
      } catch (error) {
        APIErrorHandler.handleError(error as Error, `Polling failed for job ${currentJobId}`);
        clearInterval(interval);
        setCurrentJobId(null); // Stop polling on error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentJobId, handleJobUpdate, setCurrentJobId, APIErrorHandler]);

  // Resume latest job effect
  useEffect(() => {
    if (!userId) return;
    if (currentJobId) return;

    const resumeLatestJob = async () => {
      try {
        const latestJob = await API.getLatestJob(userId) as Job | null;
        if (latestJob && (latestJob.status === 'in-progress' || latestJob.status === 'ready_to_finalize')) {
          setCurrentJobId(latestJob.job_id);
          handleJobUpdate(latestJob);
        }
      } catch {
        // Silently fail
      }
    };
    resumeLatestJob();
  }, [userId, currentJobId, handleJobUpdate, setCurrentJobId]);

  // Job status check on mount/popup open
  useEffect(() => {
    if (!currentJobId) return;
    API.getJobStatus(currentJobId).then((jobRaw) => {
      const job = jobRaw as Job | null;
      if (job) handleJobUpdate(job);
    });
  }, [currentJobId, handleJobUpdate]);

  // Overlay restore on extension reopen
  useEffect(() => {
    if (!currentJobId) return;
    API.getJobStatus(currentJobId).then((value) => {
      const job = value as Job;
      if (job && (job.status === 'pending' || job.status === 'in-progress')) {
        setOverlayState('processes');
      }
    });
  }, [currentJobId, setOverlayState]);

  return {
    currentJobId,
    setCurrentJobId,
    startJobPolling,
    handleJobUpdate,
  };
}