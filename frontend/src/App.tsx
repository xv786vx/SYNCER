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
import type { SongStatus, Process, APIResponse, StatusResponse } from './types';
import { motion, AnimatePresence } from 'framer-motion'
import Dither from "./components/Dither";
import { startYoutubeOAuth } from './utils/apiClient';
import { getOrCreateUserId } from './utils/userId';
import { usePersistentState } from './utils/usePersistentState';

// Define a type for our jobs
interface Job {
  job_id: string;
  status: 'pending' | 'in-progress' | 'ready_to_finalize' | 'completed' | 'error';
  result?: { songs?: SongStatus[]; result?: string };
  error?: string;
  type?: 'sync_sp_to_yt' | 'sync_yt_to_sp' | 'merge';
  playlist_name?: string;
}

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
  const [data, setData] = useState<StatusResponse>({ name: '', authenticated: false })
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = usePersistentState<string>('activeTab', "1");
  const [displayedTab, setDisplayedTab] = usePersistentState<string>('displayedTab', "1"); // controls which tab's content is shown
  const [processes, setProcesses] = usePersistentState<Process[]>('processes', [])
  const [songs, setSongs] = usePersistentState<SongStatus[]>('songs', [])
  const [ytToSpSongs, setYtToSpSongs] = usePersistentState<SongStatus[]>('ytToSpSongs', [])
  const [toast, setToast] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ total: number; limit: number } | null>(null);
  const [countdown, setCountdown] = useState(getMsUntilMidnightEST());
  const [tabFade, setTabFade] = useState(true);
  const [processFadeOut, setProcessFadeOut] = useState(false);
  const [isYoutubeAuthenticated, setIsYoutubeAuthenticated] = useState<boolean | null>(null);
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState<boolean | null>(null);
  const [manualSearchSong, setManualSearchSong] = useState<SongStatus | null>(null);
  const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(null);
  const [currentJobId, setCurrentJobId] = usePersistentState<string | null>('currentJobId', null);
  const [overlayState, setOverlayState] = useState<'none' | 'processes' | 'finalizing' | 'songSyncStatus'>('none');
  const [, setFinalizingJobId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // New: Ready to sync if both Spotify and YouTube are authenticated
  const isReadyToSync = isSpotifyAuthenticated && isYoutubeAuthenticated;

  // Fade in effect on tab change
  const quotaExceeded = quota && quota.total >= quota.limit;
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
      setIsFinalizing(false);
      setOverlayState('none');
      setFinalizingJobId(null);
    }
  };

  const handleFinalizeYtToSp = async () => {
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
    if (!job) {
      setProcesses([]);
      setSongs([]);
      setYtToSpSongs([]);
      setCurrentJobId(null);
      setOverlayState('none');
      setProcessFadeOut(false);
      setIsFinalizing(false);
      bestProcessRef.current = {};
      return;
    }

    const { job_id, status, result, error, type, playlist_name } = job;
    let timeEstimate: number | undefined;
    // Use the number of songs in the playlist for the estimate
    const numSongs = (job.result?.songs?.length ?? 0);
    if (numSongs > 0) {
      timeEstimate = numSongs * 4 + 5;
    }

    if (isFinalizing && status !== 'completed' && status !== 'error') {
      setOverlayState('finalizing');
      return;
    }

    if (status === 'in-progress' || status === 'pending') {
      const hasEstimate = typeof timeEstimate === 'number' && timeEstimate > 0;
      const prev = bestProcessRef.current[job_id];

      // If we already have a good estimate from the initial sync call,
      // don't let the first few backend polls (which might lack the song count)
      // overwrite it with a generic message.
      if (prev && prev.hasEstimate && !hasEstimate) {
        // We have a good estimate, but the current job update from the backend doesn't.
        // This is a temporary race condition. Ignore this update and keep the good one.
        return;
      }

      let message = `Syncing "${playlist_name || ''}"...`;
      if (hasEstimate) {
        message += ` (Est. ${timeEstimate}s)`;
      }
      setSongs([]);
      setYtToSpSongs([]);
      setOverlayState('processes');
      setProcessFadeOut(false);
      setIsFinalizing(false);
      
      const prevHasEstimate = prev && prev.hasEstimate;

      // This condition is now simpler because of the guard clause above,
      // but we keep it to avoid needless re-renders if the message is identical.
      if (!prev || prev.message !== message || (hasEstimate && !prevHasEstimate)) {
        let countdownEnd = undefined;
        if (hasEstimate) {
          countdownEnd = prev && prevHasEstimate
            ? prev.process.countdownEnd // keep the original countdownEnd
            : Date.now() + timeEstimate! * 1000; // set only the first time
        } else {
          // This branch should now be less common for existing jobs
          countdownEnd = prev ? prev.process.countdownEnd : Date.now() + 3600 * 1000;
        }
        const process: Process = {
          id: job_id,
          type: type || 'sync',
          status: 'in-progress',
          message,
          playlistName: playlist_name,
          countdownEnd,
        };
        bestProcessRef.current[job_id] = { message, hasEstimate, process };
        setProcesses([process]);
      }
    } else if (status === 'ready_to_finalize') {
      if (!isFinalizing) {
        setProcesses([]);
        setIsFinalizing(false);
        if (type === 'sync_yt_to_sp') {
          setYtToSpSongs(result?.songs || []);
          setSongs([]);
        } else {
          setSongs(result?.songs || []);
          setYtToSpSongs([]);
        }
        setOverlayState('songSyncStatus');
        setProcessFadeOut(false);
      }
    } else if (status === 'completed') {
      setIsFinalizing(false);
      setProcesses([{ id: job_id, type: type || 'sync', status: 'completed', message: 'Sync complete!', playlistName: playlist_name }]);
      setSongs([]);
      setYtToSpSongs([]);
      setCurrentJobId(null);
      setToast('Sync finalized successfully');
      setOverlayState('processes');
      setProcessFadeOut(false);
      bestProcessRef.current = {};
      fetchQuota();
      setTimeout(() => {
        setProcessFadeOut(true);
        setTimeout(() => {
          setOverlayState('none');
          setProcesses([]);
          setSongs([]);
          setYtToSpSongs([]);
          setProcessFadeOut(false);
        }, 400);
      }, 2000);
    } else if (status === 'error') {
      setIsFinalizing(false);
      setProcesses([{ id: job_id, type: type || 'sync', status: 'error', message: error || 'An unknown error occurred.', playlistName: playlist_name }]);
      setSongs([]);
      setYtToSpSongs([]);
      setCurrentJobId(null);
      setOverlayState('processes');
      setProcessFadeOut(false);
      bestProcessRef.current = {};
      setTimeout(() => {
        setProcessFadeOut(true);
        setTimeout(() => {
          setOverlayState('none');
          setProcesses([]);
          setSongs([]);
          setYtToSpSongs([]);
          setProcessFadeOut(false);
        }, 400);
      }, 2000);
    }
  }, [fetchQuota, setProcesses, setSongs, setYtToSpSongs, setCurrentJobId, setToast, setOverlayState, setProcessFadeOut, setIsFinalizing, isFinalizing]);
  
  // Polling logic for job status
  useEffect(() => {
    if (!currentJobId) {
      return;
    }
  
    const interval = setInterval(async () => {
      try {
        const job = await API.getJobStatus(currentJobId) as Job;
        handleJobUpdate(job);
  
        if (job.status === 'completed' || job.status === 'error') {
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

  // On mount or when userId changes, check for the latest job
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
      console.log('No userId available, cannot check YouTube auth');
      return;
    }
    console.log('Checking YouTube auth for user_id:', userId);
    try {
      // If we already know the auth status, use it
      if (isYoutubeAuthenticated === true) {
        console.log('User already authenticated with YouTube (from state)');
        return;
      }
      
      const resp = await API.getYoutubeAuthStatus(userId);
      console.log('Auth status response:', resp);
      setIsYoutubeAuthenticated(resp?.authenticated ?? false);
      
      if (!resp || !resp.authenticated) {
        console.log('User not authenticated with YouTube, starting OAuth flow...');
        await startYoutubeOAuth(userId);
        // After OAuth completes, update the auth status
        setIsYoutubeAuthenticated(true);
      } else {
        console.log('User already authenticated with YouTube');
      }
    } catch (error) {
      console.error('Error checking YouTube auth status:', error);
      setIsYoutubeAuthenticated(false);
      // Only start OAuth if we get a specific error indicating auth is needed
      if (error instanceof Error && error.message.includes('authentication')) {
        console.log('Authentication error detected, starting OAuth flow...');
        await startYoutubeOAuth(userId);
        // After OAuth completes, update the auth status
        setIsYoutubeAuthenticated(true);
      } else {
        console.error('Unexpected error during auth check:', error);
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
      <AnimatePresence mode="wait">
        <motion.div
          key={displayedTab + String(quotaExceeded)}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="w-[216px] p-6 gap-y-3"
          style={{ pointerEvents: quotaExceeded ? 'none' : 'auto' }}
        >
          {quotaExceeded ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-lg mb-4">YouTube API quota exhausted</div>
              <div className="text-sm mb-2">Quota resets in:</div>
              <div className="text-2xl font-mono mb-4">{formatMs(countdown)}</div>
              <div className="text-xs text-neutral-400">Try again after midnight EST</div>
            </div>
          ) : (
            <>
              {!isReadyToSync ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-md mb-4">Please authenticate with both Spotify and YouTube to continue.</div>
                  <button
                    className="mb-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
                    onClick={ensureSpotifyAuth}
                    disabled={!!isSpotifyAuthenticated}
                  >
                    {isSpotifyAuthenticated ? "Spotify Authenticated" : "Authenticate Spotify"}
                  </button>
                  <button
                    className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white"
                    onClick={ensureYoutubeAuth}
                    disabled={!!isYoutubeAuthenticated}
                  >
                    {isYoutubeAuthenticated ? "YouTube Authenticated" : "Authenticate YouTube"}
                  </button>
                </div>
              ) : (
                <>
                  {/* add ensureYoutubeAuth={ensureYoutubeAuth} back as a prop in the following lines for robustness */}
                  {displayedTab === "1" && userId && <SyncSpToYt onSync={handleSyncSpToYt} userId={userId as string} />}
                  {displayedTab === "2" && userId && <SyncYtToSp onSync={handleSyncYtToSp} userId={userId as string} />}
                  {displayedTab === "3" && userId && <MergePlaylists onMerge={handleMergePlaylists} userId={userId as string} />}
                  {displayedTab === "4" && userId && <DownloadSong onDownload={handleDownloadSong} userId={userId as string} />}
                </>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
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
    </div>
  )
}

export default App

