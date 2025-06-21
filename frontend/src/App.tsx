// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import { useEffect, useState } from 'react';
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

function getMsUntilMidnightEST() {
  // Get current time in UTC
  const now = new Date();
  // EST is UTC-5, but account for daylight saving if needed
  // For simplicity, let's use UTC-5 always
  const nowEST = new Date(now.getTime() - (now.getTimezoneOffset() + 300) * 60000);
  const nextMidnight = new Date(nowEST);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - nowEST.getTime();
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
  const [syncedSpPlaylist, setSyncedSpPlaylist] = usePersistentState<string>('syncedSpPlaylist', '')
  const [syncedYtPlaylist, setSyncedYtPlaylist] = usePersistentState<string>('syncedYtPlaylist', '')
  const [toast, setToast] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ total: number; limit: number } | null>(null);
  const [countdown, setCountdown] = useState(getMsUntilMidnightEST());
  const [tabFade, setTabFade] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [isYoutubeAuthenticated, setIsYoutubeAuthenticated] = useState<boolean | null>(null);
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState<boolean | null>(null);
  const [manualSearchSong, setManualSearchSong] = useState<SongStatus | null>(null);
  const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(null);

  // New: Ready to sync if both Spotify and YouTube are authenticated
  const isReadyToSync = isSpotifyAuthenticated && isYoutubeAuthenticated;

  // Fade in effect on tab change
  const quotaExceeded = quota && quota.total >= quota.limit;
  useEffect(() => {
    setTabFade(false);
    const timeout = setTimeout(() => setTabFade(true), 150); // match duration-500 for smooth fade
    return () => clearTimeout(timeout);
  }, [activeTab, quotaExceeded]);

  const fetchQuota = async () => {
      try {
        const data = await API.getYoutubeQuota() as { total: number; limit: number };
        console.log('[DEBUG] Quota API response:', data);
        setQuota({ total: data.total, limit: data.limit });
      } catch {
        setQuota(null);
      }
    };
  

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
  const handleSyncSpToYt = async (playlistName: string, userId: string) => {
    if (!userId) return;
    await ensureSpotifyAuth();
    await ensureYoutubeAuth();

    const processId = addProcess('sync', `Preparing to sync "${playlistName}"...`);

    try {
      // Get track count for estimation
      const countData = await API.getSpPlaylistTrackCount(playlistName, userId);
      
      if (!countData) {
        // Handle playlist not found case
        updateProcess(processId, 'error', `Spotify playlist "${playlistName}" not found.`);
        return; // Stop execution
      }

      const trackCount = countData.track_count;
      const estimatedTime = 5 + 3 * trackCount;
      const countdownEnd = Date.now() + estimatedTime * 1000;

      // Update the existing process with countdown info
      setProcesses(prev => prev.map(p => 
        p.id === processId 
          ? { ...p, playlistName, countdownEnd, status: 'in-progress' as Process['status'] } 
          : p
      ));
      
      const data = await API.syncSpToYt(playlistName, userId) as APIResponse;

      if (data.songs) {
        setSongs(data.songs);
        setSyncedSpPlaylist(playlistName);
        setProcesses(prev => prev.filter(p => p.id !== processId));
        fetchQuota();
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to sync playlist');
      APIErrorHandler.handleError(error as Error, 'Failed to sync playlist');
    }
  };
  const handleSyncYtToSp = async (playlistName: string, userId: string) => {
    if (!userId || !playlistName) return;

    await ensureSpotifyAuth();
    await ensureYoutubeAuth();

    const processId = addProcess('sync', `Preparing to sync "${playlistName}"...`);
    
    try {
      const countData = await API.getYtPlaylistTrackCount(playlistName, userId);
      if (!countData) {
        updateProcess(processId, 'error', `YouTube playlist "${playlistName}" not found. (Note: Only playlists created by you are accessible)`);
        return;
      }

      const trackCount = countData.track_count;
      const estimatedTime = 5 + 3 * trackCount;
      const countdownEnd = Date.now() + estimatedTime * 1000;

      setProcesses(prev => prev.map(p => 
        p.id === processId 
          ? { ...p, playlistName, countdownEnd, status: 'in-progress' as Process['status'] } 
          : p
      ));

      const data = await API.syncYtToSp(playlistName, userId) as APIResponse;
      if (data.songs) {
        setYtToSpSongs(data.songs);
        setSyncedYtPlaylist(playlistName);
        setProcesses(prev => prev.filter(p => p.id !== processId));
        fetchQuota();
      }
    } catch (e) {
      updateProcess(processId, 'error', 'Failed to sync playlist');
      APIErrorHandler.handleError(e as Error, 'Failed to sync playlist');
    }
  };
  const handleMergePlaylists = async (ytPlaylist: string, spPlaylist: string, mergeName: string, userId: string) => {
    if (!userId || !ytPlaylist || !spPlaylist || !mergeName) return;

    await ensureSpotifyAuth();
    await ensureYoutubeAuth();
    
    const processId = addProcess('merge', `Preparing to merge "${ytPlaylist}" and "${spPlaylist}"...`);
    
    try {
      const [ytCountData, spCountData] = await Promise.all([
        API.getYtPlaylistTrackCount(ytPlaylist, userId),
        API.getSpPlaylistTrackCount(spPlaylist, userId)
      ]);

      if (!ytCountData) {
        updateProcess(processId, 'error', `YouTube playlist "${ytPlaylist}" not found. (Note: Only playlists created by you are accessible)`);
        return;
      }
      if (!spCountData) {
        updateProcess(processId, 'error', `Spotify playlist "${spPlaylist}" not found.`);
        return;
      }

      const totalTracks = ytCountData.track_count + spCountData.track_count;
      const estimatedTime = 5 + 3 * totalTracks;
      const countdownEnd = Date.now() + estimatedTime * 1000;
      
      const mergePlaylistName = `${ytPlaylist} & ${spPlaylist}`;
      setProcesses(prev => prev.map(p => 
        p.id === processId 
          ? { ...p, playlistName: mergePlaylistName, countdownEnd, status: 'in-progress' as Process['status'] } 
          : p
      ));

      const data = await API.mergePlaylists(ytPlaylist, spPlaylist, mergeName, userId) as APIResponse;
      if (data.result) {
        setToast(data.result);
        setProcesses(prev => prev.filter(p => p.id !== processId));
        fetchQuota();
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to merge playlists');
      APIErrorHandler.handleError(error as Error, 'Failed to merge playlists');
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

  const handleSkipSpToYt = (songToSkip: SongStatus, index: number) => {
    setSongs(prev =>
      prev.map((s, i) =>
        i === index
          ? { ...s, status: 'skipped', requires_manual_search: false }
          : s
      )
    );
  };

  // Helper: Determine which overlay to show
  const getOverlayState = () => {
    if ((songs.length > 0 || ytToSpSongs.length > 0) && finalizing) {
      return 'spinner'; // Show spinner overlay
    } else if (songs.length > 0) {
      return 'songSyncStatus';
    } else if (ytToSpSongs.length > 0) {
      return 'ytToSpSongSyncStatus';
    } else if (processes.length > 0) {
      return 'processes';
    } else {
      return null;
    }
  };
  const overlayState = getOverlayState();

  // On mount, ensure overlays reflect process state
  // (No need to persist overlay state)
  // If you want to poll backend for status, add here
  // useEffect(() => { ... }, []);

  // Remove setShowProcessesOverlay, setShowSongSyncStatusOverlay, setIsSongSyncStatusFadingOut, setFinalizing
  // Instead, update finalizing as needed in finalize handlers only

  // --- Minimal fade-out for SongSyncStatus overlay ---
  const handleFinalizeSpToYt = async () => {
    setFinalizing(true); // Set finalizing at the beginning

    if (!userId || !syncedSpPlaylist) {
      alert('Missing data for finalize: ' + JSON.stringify({syncedSpPlaylist, ytIds: songs.filter(s => s.status === 'found').map(s => s.yt_id), userId}));
      setFinalizing(false); // Reset on failure
      return;
    }

    const ytIds = songs
      .filter(s => s.status === 'found' && s.yt_id)
      .map(s => s.yt_id) as string[];

    if (!ytIds.length) {
        alert("No songs were found to sync.");
        setSongs([]);
        setFinalizing(false);
        return;
    }
    
    const processId = addProcess('finalize', `Finalizing sync for "${syncedSpPlaylist}"...`);
    try {
      await API.finalizeSpToYt(syncedSpPlaylist, ytIds, userId);
      updateProcess(processId, 'completed', 'Sync complete!');
      removeProcess(processId); // Automatically removes after a 2-second delay
      setToast('Playlist finalized successfully!');
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to finalize sync');
      APIErrorHandler.handleError(error as Error, 'Failed to finalize sync');
    } finally {
      setSongs([]);
      setFinalizing(false);
      fetchQuota();
    }
  };

  const handleFinalizeYtToSp = async () => {
    setFinalizing(true);
  
    if (!userId || !syncedYtPlaylist) {
      alert('Missing data for finalize: ' + JSON.stringify({ syncedYtPlaylist, spIds: ytToSpSongs.filter(s => s.status === 'found').map(s => s.sp_id), userId }));
      setFinalizing(false);
      return;
    }
  
    const spIds = ytToSpSongs
      .filter(s => s.status === 'found' && s.sp_id)
      .map(s => s.sp_id) as string[];
  
    if (!spIds.length) {
      alert("No songs were found to sync.");
      setYtToSpSongs([]);
      setFinalizing(false);
      return;
    }
  
    const processId = addProcess('finalize', `Finalizing sync for "${syncedYtPlaylist}"...`);
    try {
      await API.finalizeYtToSp(syncedYtPlaylist, spIds, userId);
      updateProcess(processId, 'completed', 'Sync complete!');
      removeProcess(processId);
      setToast('Playlist finalized successfully!');
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to finalize sync');
      APIErrorHandler.handleError(error as Error, 'Failed to finalize sync');
    } finally {
      setYtToSpSongs([]);
      setFinalizing(false);
      fetchQuota();
    }
  };

  // Remove dismissProcesses overlay state, just clear processes
  const dismissProcesses = () => setProcesses([]);

  useEffect(() => {
    if (data.name === '') fetchStatus()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 6000); // fetch every minute
    return () => clearInterval(interval);
  }, []);

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

  // On mount or when userId changes, poll backend for sync status and update UI state
  useEffect(() => {
    if (!userId) return;
    const fetchSyncStatus = async () => {
      try {
        const status = await API.getSyncStatus(userId) as { stage: string; playlist?: string; songs?: SongStatus[]; error?: string };
        
        if (status.stage === 'finding' || status.stage === 'merging') {
          // Use a functional update to get the latest state without adding `processes` to deps
          setProcesses(currentProcesses => {
              // If a sync is already running with a countdown, don't overwrite it.
              if (currentProcesses.some(p => (p.type === 'sync' || p.type === 'merge') && p.countdownEnd)) {
                  return currentProcesses;
              }
              // Otherwise, update from backend status
              const type = status.stage === 'merging' ? 'merge' : 'sync';
              const message = status.stage === 'merging' 
                ? `Merging playlists...` 
                : `Syncing ${status.playlist}...`;
              return [{ id: type, type, status: 'in-progress', message }];
          });
          setSongs([]);
          setYtToSpSongs([]);
        } else if (status.stage === 'ready_to_finalize') {
          setProcesses([]);
          setSongs(status.songs || []);
          setYtToSpSongs([]);
        } else if (status.stage === 'finalized' || status.stage === 'idle') {
          setProcesses([]);
          setSongs([]);
          setYtToSpSongs([]);
        } else if (status.stage === 'error') {
          setProcesses([{ id: 'sync', type: 'sync', status: 'error', message: status.error || 'Sync error' }]);
        }
      } catch {
        // Ignore errors for now
      }
    };
    fetchSyncStatus();
  }, [userId, setProcesses, setSongs, setYtToSpSongs]);

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

  const handleSkipYtToSp = (songToSkip: SongStatus, index: number) => {
    setYtToSpSongs(prev =>
      prev.map((s, i) =>
        i === index
          ? { ...s, status: 'skipped', requires_manual_search: false }
          : s
      )
    );
  };

  // Countdown effect for processes
  useEffect(() => {
    const interval = setInterval(() => {
      processes.forEach(p => {
        if (p.countdownEnd && p.status === 'in-progress') {
          const remaining = Math.round((p.countdownEnd - Date.now()) / 1000);
          let message: string;
          let subMessage: string | undefined;
          let newCountdownEnd: number | undefined = p.countdownEnd;

          if (remaining > 0) {
            const verb = p.type === 'merge' ? 'Merging' : 'Syncing';
            message = `${verb} "${p.playlistName}"...`;
            subMessage = `(Estimated time: ${remaining}s)`;
          } else {
            message = `Still working on "${p.playlistName}"...`;
            newCountdownEnd = undefined; // Stop the countdown
          }

          // Only update if message or countdownEnd has changed
          if (message !== p.message || subMessage !== p.subMessage || newCountdownEnd !== p.countdownEnd) {
            setProcesses(prev =>
              prev.map(proc =>
                proc.id === p.id
                  ? { ...proc, message, subMessage, countdownEnd: newCountdownEnd }
                  : proc
              )
            );
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [processes, setProcesses]);

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
            {(songs.length > 0 || ytToSpSongs.length > 0) ? (
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
                  finalizing={finalizing}
                />
              </motion.div>
            ) : overlayState === 'processes' ? (
              <motion.div
                key="processes-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-40"
              >
                <ProcessesOverlay
                  processes={processes}
                  onDismiss={dismissProcesses}
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

