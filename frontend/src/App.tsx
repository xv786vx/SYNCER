// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import { useEffect, useState, useCallback, useRef } from 'react';
import { FaSpotify } from 'react-icons/fa';
import { SiYoutube } from 'react-icons/si';
import './App.css';
import { APIErrorHandler } from './utils/errorHandling';
import * as API from './utils/apiClient'; // Use direct API calls with proper CORS headers
import { SyncSpToYt } from './components/SyncSpToYt';
import { SyncYtToSp } from './components/SyncYtToSp';
import { MergePlaylists } from './components/MergePlaylists';
import { ProcessesOverlay } from './components/ProcessesOverlay';
import { DownloadSong } from './components/DownloadSong';
import { SongSyncStatus } from './components/SongSyncStatus';
import { ToastContainer } from './components/Toast';
import { ToastNotification } from './components/ToastNotification';
import { ManualSearchModal, ManualSearchResult } from './components/ManualSearchModal';
import type { SongStatus, Process, APIResponse, StatusResponse, Job } from './types';
import { motion, AnimatePresence } from 'framer-motion'
import Dither from "./components/Dither";
import { startYoutubeOAuth } from './utils/apiClient';
import { getOrCreateUserId } from './utils/userId';
import { usePersistentState } from './utils/usePersistentState';

// New state for backend status
enum BackendStatus {
  CONNECTING,
  ONLINE,
  OFFLINE,
}

// Define a type for our jobs
// interface Job {
//   job_id: string;
//   status: 'pending' | 'in-progress' | 'ready_to_finalize' | 'completed' | 'error';
//   result?: { songs?: SongStatus[]; result?: string };
//   error?: string;
//   type?: 'sync_sp_to_yt' | 'sync_yt_to_sp' | 'merge';
//   playlist_name?: string;
// }

function getMsUntilMidnightEST() {
  const now = new Date();
  // Get the current time in the America/New_York timezone
  const nowInEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  // Create a new date for the next midnight in that timezone
  const nextMidnightEST = new Date(nowInEST);
  nextMidnightEST.setHours(24, 0, 0, 0);
  // Return the difference in milliseconds
  return nextMidnightEST.getTime() - nowInEST.getTime();
}

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function App() {
  // Use persistent userId from Chrome storage or localStorage
  const [userId, setUserId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(BackendStatus.CONNECTING);
  const [data, setData] = useState<StatusResponse>({ name: '', authenticated: false })
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = usePersistentState<string>('activeTab', "1");
  const [displayedTab, setDisplayedTab] = usePersistentState<string>('displayedTab', "1"); // controls which tab's content is shown
  const [processes, setProcesses] = usePersistentState<Process[]>('processes', [])
  const processesRef = useRef(processes);
  processesRef.current = processes;
  const [songs, setSongs] = usePersistentState<SongStatus[]>('songs', [])
  const [ytToSpSongs, setYtToSpSongs] = usePersistentState<SongStatus[]>('ytToSpSongs', [])
  const [toast, setToast] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ total: number; limit: number } | null>(null);
  const [countdown, setCountdown] = useState(getMsUntilMidnightEST());
  const [tabFade, setTabFade] = useState(true);
  const [processFadeOut, ] = useState(false);
  const [isYoutubeAuthenticated, setIsYoutubeAuthenticated] = useState<boolean | null>(null);
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState<boolean | null>(null);
  const [manualSearchSong, setManualSearchSong] = useState<SongStatus | null>(null);
  const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(null);
  const [currentJobId, setCurrentJobId] = usePersistentState<string | null>('currentJobId', null);
  const [overlayState, setOverlayState] = useState<'none' | 'processes' | 'finalizing' | 'songSyncStatus'>('none');
  const [, setFinalizingJobId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const isFinalizingRef = useRef(false);

  // New: Ready to sync if both Spotify and YouTube are authenticated
  const isReadyToSync = isSpotifyAuthenticated && isYoutubeAuthenticated;

  // Health check effect
  useEffect(() => {
    const checkBackend = async () => {
      const result = await API.healthCheck();
      if (result && result.status === 'ok') {
        setBackendStatus(BackendStatus.ONLINE);
      } else {
        setBackendStatus(BackendStatus.OFFLINE);
      }
    };

    // Check immediately on mount
    checkBackend();

    // Then check every 5 seconds
    const interval = setInterval(checkBackend, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fade in effect on tab change
  const quotaExceeded = !!(quota && quota.total >= quota.limit);
  useEffect(() => {
    setTabFade(false);
    const timeout = setTimeout(() => setTabFade(true), 150); // match duration-500 for smooth fade
    return () => clearTimeout(timeout);
  }, [activeTab, quotaExceeded]);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await API.getYoutubeQuota() as { total: number; limit: number };
      console.log('[DEBUG] Quota API response:', data);
      setQuota({ total: data.total, limit: data.limit });
    } catch {
      setQuota(null);
    }
  }, []);
  

  const addProcess = (type: string, message: string, extra: Partial<Omit<Process, 'id' | 'type' | 'status' | 'message'>> = {}) => {
    const id = Date.now().toString();
    setProcesses(prev => [...prev, { id, type, status: 'pending', message, ...extra }]);
    return id;
  };

  const updateProcess = (id: string, status: Process['status'], message?: string, interactive?: Process['interactive']) => {
    setProcesses(prev => {
      const process = prev.find(p => p.id === id);
      // Only update if the message or status has changed
      if (process && process.status === status && process.message === message) {
        return prev;
      }
      return prev.map(p =>
        p.id === id ? { ...p, status, message: message || p.message, interactive } : p
      );
    });
  };

  const removeProcess = (id: string) => {
    setTimeout(() => {
      setProcesses(prev => prev.filter(p => p.id !== id));
    }, 2000);
  };

  const fetchStatus = async () => {
    try {
      const data = await API.getStatus() as StatusResponse;
      setData(data);
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to fetch application status');
    }
  }

  // Remove unused parameters from startJobPolling
  const startJobPolling = (jobId: string) => {
    setCurrentJobId(jobId);
  };

  const handleSyncSpToYt = async (playlistName: string, userId: string) => {
    if (!userId) return;
    await ensureSpotifyAuth();
    await ensureYoutubeAuth();

    try {
      // Get all info before showing anything.
      const countResp = await API.getSpPlaylistTrackCount(playlistName, userId);
      const trackCount = countResp?.track_count ?? null;
      const timeEstimate = trackCount ? (trackCount * 4 + 5) : undefined;

      const data = await API.startSyncSpToYt(playlistName, userId) as { job_id: string };
      
      if (data.job_id) {
        const { job_id } = data;
        const hasEstimate = typeof timeEstimate === 'number';
        let message = `Syncing "${playlistName}"...`;
        if (hasEstimate) {
          message += ` (Est. ${timeEstimate}s)`;
        }
        
        const process: Process = {
          id: job_id,
          type: 'sync_sp_to_yt',
          status: 'in-progress',
          message,
          playlistName: playlistName,
          countdownEnd: hasEstimate ? Date.now() + timeEstimate! * 1000 : undefined,
        };

        // Store this as the "best" state so polling doesn't overwrite it
        bestProcessRef.current[job_id] = { message, hasEstimate, process };
        
        // Show the overlay now, with all correct info.
        setOverlayState('processes');
        setProcesses([process]);
        
        // Start polling
        startJobPolling(job_id);
      }
    } catch (error) {
      setProcesses([]);
      setOverlayState('none');
      // Type guard to check if it's an API error with a response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number; data?: { detail?: string } } };
        if (axiosError.response && axiosError.response.status === 429) {
          const detail = axiosError.response.data?.detail || 'Insufficient YouTube API quota. Please try again later.';
          setToast(detail);
          return; // Stop further processing
        }
      }
      // Fallback to the generic error handler
      APIErrorHandler.handleError(error as Error, 'Failed to start sync job');
    }
  };

  const handleSyncYtToSp = async (playlistName: string, userId: string) => {
    if (!userId || !playlistName) return;
    await ensureSpotifyAuth();
    await ensureYoutubeAuth();

    try {
      // Get all info before showing anything.
      const countResp = await API.getYtPlaylistTrackCount(playlistName, userId);
      const trackCount = countResp?.track_count ?? null;
      const timeEstimate = trackCount ? (trackCount * 4 + 5) : undefined;

      const data = await API.startSyncYtToSp(playlistName, userId) as { job_id: string };
      
      if (data.job_id) {
        const { job_id } = data;
        const hasEstimate = typeof timeEstimate === 'number';
        let message = `Syncing "${playlistName}"...`;
        if (hasEstimate) {
          message += ` (Est. ${timeEstimate}s)`;
        }
        
        const process: Process = {
          id: job_id,
          type: 'sync_yt_to_sp',
          status: 'in-progress',
          message,
          playlistName: playlistName,
          countdownEnd: hasEstimate ? Date.now() + timeEstimate! * 1000 : undefined,
        };

        // Store this as the "best" state so polling doesn't overwrite it
        bestProcessRef.current[job_id] = { message, hasEstimate, process };
        
        // Show the overlay now, with all correct info.
        setOverlayState('processes');
        setProcesses([process]);
        
        // Start polling
        startJobPolling(job_id);
      }
    } catch (e) {
      setProcesses([]);
      setOverlayState('none');
      APIErrorHandler.handleError(e as Error, 'Failed to start sync job');
    }
  };

  const handleMergePlaylists = async (ytPlaylist: string, spPlaylist: string, mergeName: string, userId: string) => {
    if (!userId || !ytPlaylist || !spPlaylist || !mergeName) return;
    await ensureSpotifyAuth();
    await ensureYoutubeAuth();
    
    try {
      const data = await API.startMergePlaylists(ytPlaylist, spPlaylist, mergeName, userId) as { job_id: string };
      if (data.job_id) {
        startJobPolling(data.job_id);
      }
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to start merge job');
    }
  };

  const handleDownloadSong = async (songTitle: string, artists: string, userId: string) => {
    if (!userId) return;
    const processId = addProcess('download', `Downloading "${songTitle}"...`);
    try {
      const data = await API.downloadYtSong(songTitle, artists, userId) as APIResponse;
      if (data.result) {
        setToast(data.result);
        updateProcess(processId, 'completed', 'Download completed successfully!');
        removeProcess(processId);
        fetchQuota();
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to download song');
      APIErrorHandler.handleError(error as Error, 'Failed to download song');
    }
  };
  const handleManualSearch = (song: SongStatus, index: number) => {
    setManualSearchSong(song);
    setManualSearchIndex(index);
  };

  const handleSelectManualSearch = (_originalSong: SongStatus, newSongDetails: ManualSearchResult) => {
    if (manualSearchIndex === null) return;
    setSongs(prev =>
      prev.map((s, i) =>
        i === manualSearchIndex
          ? {
              ...s,
              status: 'found',
              yt_id: newSongDetails.yt_id,
              yt_title: newSongDetails.title,
              yt_artist: newSongDetails.artist,
              requires_manual_search: false,
            }
          : s
      )
    );
    setManualSearchSong(null);
    setManualSearchIndex(null);
  };

  const handleSkipSpToYt = (_songToSkip: SongStatus, index: number) => {
    setSongs(prev =>
      prev.map((s, i) =>
        i === index
          ? { ...s, status: 'skipped', requires_manual_search: false }
          : s
      )
    );
    setManualSearchSong(null);
    setManualSearchIndex(null);
  };

  // On mount, ensure overlays reflect process state
  // (No need to persist overlay state)
  // If you want to poll backend for status, add here
  // useEffect(() => { ... }, []);

  // --- Minimal fade-out for SongSyncStatus overlay ---
  const handleFinalizeSpToYt = async () => {
    isFinalizingRef.current = true;
    setIsFinalizing(true);
    setOverlayState('finalizing');
    setFinalizingJobId(currentJobId);
    if (!currentJobId) {
      alert('Cannot finalize: No active job found.');
      setIsFinalizing(false);
      setOverlayState('none');
      setFinalizingJobId(null);
      return;
    }
    try {
      await API.finalizeJob(currentJobId);
      // Don't set isFinalizing to false here, let the polling handle it
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to finalize sync');
      isFinalizingRef.current = false;
      setIsFinalizing(false);
      setOverlayState('none');
      setFinalizingJobId(null);
    }
  };

  const handleFinalizeYtToSp = async () => {
    isFinalizingRef.current = true;
    setIsFinalizing(true);
    setOverlayState('finalizing');
    setFinalizingJobId(currentJobId);
    if (!currentJobId) {
      alert('Cannot finalize: No active job found.');
      setIsFinalizing(false);
      setOverlayState('none');
      setFinalizingJobId(null);
      return;
    }
    try {
      await API.finalizeJob(currentJobId);
      // Don't set isFinalizing to false here, let the polling handle it
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to finalize sync');
      isFinalizingRef.current = false;
      setIsFinalizing(false);
      setOverlayState('none');
      setFinalizingJobId(null);
    }
  };

  // Remove dismissProcesses overlay state, just clear processes
  const dismissProcesses = () => {
    setProcesses([]);
    setCurrentJobId(null); // This will clear the job from storage and stop polling
  };

  useEffect(() => {
    if (data.name === '') fetchStatus()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 6000); // fetch every minute
    return () => clearInterval(interval);
  }, [fetchQuota]);

  useEffect(() => {
    if (quota && quota.total >= quota.limit) {
      const interval = setInterval(() => {
        setCountdown(getMsUntilMidnightEST());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quota]);
  // State to track toast fade-out animation
  const [toastFading, setToastFading] = useState(false);

  useEffect(() => {
    if (toast) {
      // Reset fade state when a new toast appears
      setToastFading(false);
      
      // Start fade-out after 4.5 seconds
      const fadeTimer = setTimeout(() => {
        setToastFading(true);
      }, 4500);
      
      // Remove toast after fade completes (total 5s = 4.5s display + 0.5s fade)
      const removeTimer = setTimeout(() => {
        setToast(null);
        setToastFading(false);
      }, 5000);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [toast]);

  const tabs = [
    { id: "1", label: "sync", icon1: <FaSpotify className="inline-block mx-1" />, icon2: <SiYoutube className="inline-block mx-1" /> },
    { id: "2", label: "sync", icon1: <SiYoutube className="inline-block mx-1" />, icon2: <FaSpotify className="inline-block mx-1" /> },
    { id: "3", label: "merge playlists" },
    // { id: "4", label: "download", icon1: <SiYoutube className="inline-block mx-1" />, label2: "song" },
  ];

  // Fade out, then switch tab, then fade in
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setTabFade(false); // start fade out
    setPendingTab(tabId);
  };

  useEffect(() => {
    if (!tabFade && pendingTab && pendingTab !== activeTab) {
      // Wait for fade-out to finish (match duration-200)
      const timeout = setTimeout(() => {
        setActiveTab(pendingTab); // update activeTab for button highlight
        setDisplayedTab(pendingTab); // switch content only after fade-out
        setTabFade(true); // fade in new content
        setPendingTab(null);
      }, 150); // match duration-200
      return () => clearTimeout(timeout);
    }
  }, [tabFade, pendingTab, activeTab, setActiveTab, setDisplayedTab]); 

  // On mount, get or create userId
  useEffect(() => {
    getOrCreateUserId().then(setUserId);
  }, []);

  // Track the best process state for the current job
  const bestProcessRef = useRef<{ [jobId: string]: { message: string; hasEstimate: boolean; process: Process } }>({});

  const handleJobUpdate = useCallback((job: Job) => {
    console.log("Handling job update", job);
    const errorMessage = job.error || 'An unknown error occurred.';

    if (job.status === "completed") {
      const toastMessage = job.job_notes
        ? job.job_notes
        : `Sync of '${job.playlist_name}' complete.`;
      setToast(toastMessage);
      setIsFinalizing(false);
      setOverlayState('processes');
    } else if (job.status === "error") {
      // If there are partial results, show them in SongSyncStatus overlay
      if (job.result?.songs && job.result.songs.length > 0) {
        setSongs(job.result.songs);
        setOverlayState('songSyncStatus');
      }
      // Show error toast with job_notes if present
      setToast(job.job_notes ? job.job_notes : `Error in job ${job.job_id}: ${errorMessage}`);
      setIsFinalizing(false);
      // If no partial results, show processes overlay
      if (!job.result?.songs || job.result.songs.length === 0) {
        setOverlayState('processes');
      }
    } else if (job.status === "ready_to_finalize") {
      setSongs(job.result?.songs || []);
      setOverlayState('songSyncStatus');
    }

    setProcesses((prevProcesses) =>
      prevProcesses.map((p) => {
        if (p.id === job.job_id) {
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
  }, [setProcesses, setToast, setSongs, setOverlayState, setIsFinalizing]);

  // Polling logic for job status
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
    }, 3000); // Poll every 3 seconds
  
    return () => clearInterval(interval);
  }, [currentJobId, handleJobUpdate, setCurrentJobId]);

  // On mount, or when userId changes, check for the latest job
  useEffect(() => {
    if (!userId) return;

    // If there's already a job being polled, don't check for a new one.
    if (currentJobId) return;

    const resumeLatestJob = async () => {
      try {
        const latestJob = await API.getLatestJob(userId) as Job | null;
        if (latestJob && (latestJob.status === 'in-progress' || latestJob.status === 'ready_to_finalize')) {
            setCurrentJobId(latestJob.job_id);
            handleJobUpdate(latestJob); // Immediately update UI with the job's state
        }
      } catch {
        // Silently fail, no need to bother the user
      }
    };
    resumeLatestJob();
  }, [userId, currentJobId, handleJobUpdate, setCurrentJobId]);

  // On mount or popup open, always check the current job status and update overlay state and persistent state accordingly
  useEffect(() => {
    if (!currentJobId) return;
    API.getJobStatus(currentJobId).then((jobRaw) => {
      const job = jobRaw as Job | null;
      if (job) handleJobUpdate(job);
    });
  }, [currentJobId, handleJobUpdate]);

  // Only check auth and trigger OAuth if userId is loaded
  useEffect(() => {
    if (!userId) {
      console.log('No userId available yet, skipping auth check');
      return;
    }
    console.log('Checking initial YouTube auth status for userId:', userId);
    // Check auth status on mount, but don't trigger OAuth automatically
    const checkAuth = async () => {
      try {
        console.log('Making API call to check YouTube auth status...');
        const resp = await API.getYoutubeAuthStatus(userId);
        console.log('Initial auth status check response:', resp);
        setIsYoutubeAuthenticated(resp?.authenticated ?? false);
        if (!resp || !resp.authenticated) {
          console.log('User not authenticated with YouTube');
          // Don't trigger OAuth here - wait for user action
        } else {
          console.log('User is authenticated with YouTube');
        }
      } catch (error) {
        console.error('Error checking initial YouTube auth status:', error);
        setIsYoutubeAuthenticated(false);
        // Don't trigger OAuth here - wait for user action
      }
    };
    checkAuth();
  }, [userId]);

  // Handler to check auth and trigger OAuth only when needed
  const ensureYoutubeAuth = async () => {
    if (!userId) {
      // console.log('No userId available, cannot check YouTube auth');
      return;
    }
    // console.log('Checking YouTube auth for user_id:', userId);
    try {
      // If we already know the auth status, use it
      if (isYoutubeAuthenticated === true) {
        // console.log('User already authenticated with YouTube (from state)');
        return;
      }
      
      const resp = await API.getYoutubeAuthStatus(userId);
      // console.log('Auth status response:', resp);
      setIsYoutubeAuthenticated(resp?.authenticated ?? false);
      
      if (!resp || !resp.authenticated) {
        // console.log('User not authenticated with YouTube, starting OAuth flow...');
        await startYoutubeOAuth(userId);
        // After OAuth completes, update the auth status
        setIsYoutubeAuthenticated(true);
      } else {
        // console.log('User already authenticated with YouTube');
      }
    } catch (error) {
      // console.error('Error checking YouTube auth status:', error);
      setIsYoutubeAuthenticated(false);
      // Only start OAuth if we get a specific error indicating auth is needed
      if (error instanceof Error && error.message.includes('authentication')) {
        // console.log('Authentication error detected, starting OAuth flow...');
        await startYoutubeOAuth(userId);
        // After OAuth completes, update the auth status
        setIsYoutubeAuthenticated(true);
      } else {
        // console.error('Unexpected error during auth check:', error);
        throw error; // Re-throw other errors
      }
    }
  };

  // Check Spotify auth on mount
  useEffect(() => {
    if (!userId) return;
    const checkSpotifyAuth = async () => {
      try {
        const resp = await API.getSpotifyAuthStatus(userId);
        setIsSpotifyAuthenticated(resp?.authenticated ?? false);
      } catch {
        setIsSpotifyAuthenticated(false);
      }
    };
    checkSpotifyAuth();
  }, [userId]);

  // Handler to check auth and trigger OAuth only when needed
  const ensureSpotifyAuth = async () => {
    if (!userId) return;
    if (isSpotifyAuthenticated === true) return;
    const resp = await API.getSpotifyAuthStatus(userId);
    setIsSpotifyAuthenticated(resp?.authenticated ?? false);
    if (!resp || !resp.authenticated) {
      await API.startSpotifyOAuth(userId);
      setIsSpotifyAuthenticated(true); // Optionally, re-check after OAuth
    }
  };

  const handleManualSearchYtToSp = (song: SongStatus, index: number) => {
    setManualSearchSong(song);
    setManualSearchIndex(index);
  };

  const handleSelectManualSearchYtToSp = (_originalSong: SongStatus, newSongDetails: ManualSearchResult) => {
    if (manualSearchIndex === null) return;
    setYtToSpSongs(prev =>
      prev.map((s, i) =>
        i === manualSearchIndex
          ? {
              ...s,
              status: 'found',
              sp_id: newSongDetails.sp_id,
              sp_title: newSongDetails.title,
              sp_artist: newSongDetails.artist,
              requires_manual_search: false,
            }
          : s
      )
    );
    setManualSearchSong(null);
    setManualSearchIndex(null);
  };

  const handleSkipYtToSp = (_songToSkip: SongStatus, index: number) => {
    setYtToSpSongs(prev =>
      prev.map((s, i) =>
        i === index
          ? { ...s, status: 'skipped', requires_manual_search: false }
          : s
      )
    );
    setManualSearchSong(null);
    setManualSearchIndex(null);
  };

  type YtToSpSearchResult = {
    sp_id: string;
    title: string;
    artist: string;
    thumbnail: string;
  };

  const wrappedManualSearchYtToSp = async (query: string, artist: string, userId: string): Promise<ManualSearchResult[]> => {
    const results = await API.manualSearchYtToSp(query, artist, userId) as YtToSpSearchResult[];
    return results.map(r => ({
      yt_id: '', // yt_id is not available in this context
      sp_id: r.sp_id,
      title: r.title,
      artist: r.artist,
      thumbnail: r.thumbnail,
    }));
  };

  useEffect(() => {
    if (!currentJobId) return;
    // On extension reopen, restore overlay if job is in progress or pending
    API.getJobStatus(currentJobId).then((value) => {
      const job = value as Job;
      if (job && (job.status === 'pending' || job.status === 'in-progress')) {
        setOverlayState('processes');
      }
    });
  }, [currentJobId]);

  if (backendStatus === BackendStatus.CONNECTING) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-brand-dark text-white">
        <span>Connecting to backend...</span>
      </div>
    );
  }

  if (backendStatus === BackendStatus.OFFLINE) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-brand-dark text-white">
        <span>Backend is offline. Please try again later.</span>
      </div>
    );
  }

  if (!userId) {
    // Show a loading spinner or message until userId is loaded
    return (
      <div className="flex items-center justify-center h-full w-full bg-brand-dark text-white">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-brand-dark text-white font-cascadia" style={{ 
      width: '360px', 
      position: 'relative',
      overflow: 'hidden',
      height: '360px', // Match height from index.css
      display: 'flex',
      flexDirection: 'row'
    }}>
      <ToastContainer />
      {/* Overlay logic: Only show overlays if ready to sync */}
      <AnimatePresence>
        {isReadyToSync && (
          <>
            {isFinalizing ? (
              <motion.div
                key="finalizing-spinner-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-40"
              >
                <SongSyncStatus
                  songs={songs.length > 0 ? songs : ytToSpSongs}
                  onManualSearch={songs.length > 0 ? handleManualSearch : handleManualSearchYtToSp}
                  onSkip={songs.length > 0 ? handleSkipSpToYt : handleSkipYtToSp}
                  onFinalize={ytToSpSongs.length > 0 ? handleFinalizeYtToSp : handleFinalizeSpToYt}
                  finalizing={true}
                />
              </motion.div>
            ) : overlayState === 'processes' && processes.length > 0 ? (
              <motion.div
                key="processes-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: processFadeOut ? 0 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-40"
              >
                <ProcessesOverlay
                  processes={processes.map(p => ({
                    ...p,
                    message: p.message?.replace('undefined', p.playlistName || '') || `Syncing "${p.playlistName || ''}"...`,
                  }))}
                  onDismiss={dismissProcesses}
                />
              </motion.div>
            ) : overlayState === 'songSyncStatus' ? (
              <motion.div
                key={songs.length > 0 ? "song-sync-status-overlay" : "yt-song-sync-status-overlay"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-40"
              >
                <SongSyncStatus
                  songs={songs.length > 0 ? songs : ytToSpSongs}
                  onManualSearch={songs.length > 0 ? handleManualSearch : handleManualSearchYtToSp}
                  onSkip={songs.length > 0 ? handleSkipSpToYt : handleSkipYtToSp}
                  onFinalize={ytToSpSongs.length > 0 ? handleFinalizeYtToSp : handleFinalizeSpToYt}
                  finalizing={false}
                />
              </motion.div>
            ) : null}
          </>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className="relative flex flex-col flex-shrink-0 w-[144px] gap-y-2 p-3 overflow-hidden">
        <Dither pixelSize={2} colorNum={4}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none"
          }}
        />
        <div className="relative z-10 flex flex-col gap-y-3">
          <h1 className="text-white text-center text-2xl font-cascadia font-bold">syncer</h1>
          <p className="text-white text-center text-xs font-cascadia my-2">
            <SiYoutube className="inline-block mr-2 my-1" />
            API usage: {quota ? `${quota.total} / ${quota.limit}` : '...'} units
          </p>
          <div className="flex flex-col mt-4 gap-y-2">
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                className={`w-full h-10 px-2 py-3 rounded text-xs flex items-center justify-center font-cascadia font-light relative z-10 ${
                  activeTab === tab.id
                    ? "bg-brand-gray-1 text-brand-dark"
                    : "bg-brand-accent-1 text-brand-gray-2 hover:bg-brand-accent-2"
                }`}
                onClick={() => handleTabChange(tab.id)}
                disabled={!!(quota && quota.total >= quota.limit)}
                initial={false}
                whileTap={{ scale: 0.8, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                {tab.id === "1" || tab.id === "2" ? (
                  <>
                    {tab.label}
                    {tab.id === "1" ? (
                      <FaSpotify className={`inline-block mx-1 align-middle relative ${activeTab === "1" ? "text-green-500" : "text-brand-gray-2"}`} />
                    ) : (
                      <SiYoutube className={`inline-block mx-1 align-middle relative ${activeTab === "2" ? "text-red-500" : "text-brand-gray-2"}`} />
                    )}
                    <span className="mx-1 text-lg align-middle relative -top-0.5">→</span>
                    {tab.id === "1" ? (
                      <SiYoutube className={`inline-block mx-1 align-middle relative ${activeTab === "1" ? "text-red-500" : "text-brand-gray-2"}`} />
                    ) : (
                      <FaSpotify className={`inline-block mx-1 align-middle relative ${activeTab === "2" ? "text-green-500" : "text-brand-gray-2"}`} />
                    )}
                  </>
                ) : (
                  tab.label
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content with motion enter animation */}
      <div className={`relative flex-1 flex flex-col bg-brand-darker transition-opacity duration-150 ${tabFade ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex-grow overflow-y-auto pb-30 p-6"> 
          <AnimatePresence mode="wait">
            <motion.div
              key={displayedTab}
              className={`transition-opacity duration-150 ${tabFade ? 'opacity-100' : 'opacity-0'}`}
            >
            {!isReadyToSync ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-sm mb-4">Please authenticate with both Spotify and YouTube to continue.</div>
                    <button
                      className="mb-2 px-4 py-2 text-sm bg-green-700 hover:bg-green-600 rounded text-white"
                      onClick={ensureSpotifyAuth}
                      disabled={!!isSpotifyAuthenticated}
                    >
                      {isSpotifyAuthenticated ? "Spotify Authenticated" : "Authenticate Spotify"}
                    </button>
                    <button
                      className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded text-white"
                      onClick={ensureYoutubeAuth}
                      disabled={!!isYoutubeAuthenticated}
                    >
                      {isYoutubeAuthenticated ? "YouTube Authenticated" : "Authenticate YouTube"}
                    </button>
                  </div>
                ) : (
                  <>
              {displayedTab === "1" && 
                <SyncSpToYt 
                onSync={handleSyncSpToYt} 
                userId={userId || ''}
                quotaExceeded={quotaExceeded}
                quota={quota}
                countdown={countdown}
                formatMs={formatMs}
                isReadyToSync={isReadyToSync}
                />   
              }
              {displayedTab === "2" && 
                <SyncYtToSp 
                onSync={handleSyncYtToSp} 
                userId={userId || ''}
                quotaExceeded={quotaExceeded}
                quota={quota}
                countdown={countdown}
                formatMs={formatMs}
                isReadyToSync={isReadyToSync}
                />
              }
              {displayedTab === "3" && <MergePlaylists onMerge={handleMergePlaylists} userId={userId || ''} />}
              {displayedTab === "4" && <DownloadSong onDownload={handleDownloadSong} userId={userId || ''} />}
              </>
            )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 bg-opacity-50 backdrop-blur-sm p-2 border-t border-brand-gray-2">
          <div className="flex justify-between text-xs font-cascadia">
            <span>v1.0.7</span>
            <div className="flex gap-x-2">
              <a href="https://github.com/xv786vx/SYNCER" target="_blank" rel="noopener noreferrer" className="hover:underline">
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>

      {toast && (
        <ToastNotification 
          message={toast} 
          onClose={() => setToast(null)} 
          isFading={toastFading} 
        />
      )}
      <AnimatePresence>
        {manualSearchSong && (
          <ManualSearchModal
            song={manualSearchSong}
            onClose={() => setManualSearchSong(null)}
            onSelectSong={ytToSpSongs.length > 0 ? handleSelectManualSearchYtToSp : handleSelectManualSearch}
            manualSearchApi={ytToSpSongs.length > 0 ? wrappedManualSearchYtToSp : API.manualSearchSpToYt}
            userId={userId!}
          />
        )}
      </AnimatePresence>

      {/* Quota Exceeded Banner */}
      {quotaExceeded && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-700 text-white text-center py-2 text-xs font-bold animate-pulse">
          YouTube API quota exceeded. Please try again after midnight EST.<br />
          <span className="font-mono">Time until reset: {formatMs(countdown)}</span>
        </div>
      )}
    </div>
  )
}

export default App

