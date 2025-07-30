// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import { useEffect, useState, useRef } from 'react';
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
import { ManualSearchModal } from './components/ManualSearchModal';
import type { SongStatus, Process, StatusResponse, Job, ManualSearchResult } from './types';
import { motion, AnimatePresence } from 'framer-motion'
import Dither from "./components/Dither";

import { getOrCreateUserId } from './utils/userId';
import { usePersistentState } from './utils/usePersistentState';
import NoSongsToSync from './components/NoSongsToSync';

import { useBackendStatus } from './hooks/useBackendStatus';
import { handleMergePlaylists, handleSyncSpToYt, handleSyncYtToSp, handleDownloadSong } from './utils/syncUtils';
import { ensureYoutubeAuth, ensureSpotifyAuth } from './utils/authUtils';

import { useYoutubeQuota } from './hooks/useYoutubeQuota';
import { useToast } from './hooks/useToast';
import { useProcesses } from './hooks/useProcesses';
import { useTab } from './hooks/useTab';
import { useManualSearch } from './hooks/useManualSearch';
import { useJobPolling } from './hooks/useJobPolling';
import { useFinalizeSync } from './hooks/useFinalizeSync';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useNoSongsToSyncFade } from './hooks/useNoSongsToSyncFade';

// New state for backend status
enum BackendStatus {
  CONNECTING,
  ONLINE,
  OFFLINE,
}


function getMsUntilMidnightEST() {
  const now = new Date();
  // Get the current time in the America/New_York timezone
  const nowInEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  // Create a new date for the next 3am in that timezone
  const nextReset = new Date(nowInEST);
  if (nowInEST.getHours() < 3) {
    // If before 3am, reset is today at 3am
    nextReset.setHours(3, 0, 0, 0);
  } else {
    // If after 3am, reset is tomorrow at 3am
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(3, 0, 0, 0);
  }
  // Return the difference in milliseconds
  return nextReset.getTime() - nowInEST.getTime();
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
  const [processes, setProcesses] = usePersistentState<Process[]>('processes', [])
  const processesRef = useRef(processes);
  processesRef.current = processes;
  const [spToYtSongs, setSpToYtSongs] = usePersistentState<SongStatus[]>('songs', [])
  const [ytToSpSongs, setYtToSpSongs] = usePersistentState<SongStatus[]>('ytToSpSongs', [])
  const [countdown, setCountdown] = useState(getMsUntilMidnightEST());
  const [processFadeOut, ] = useState(false);
  const [isYoutubeAuthenticated, setIsYoutubeAuthenticated] = useState<boolean | null>(null);
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState<boolean | null>(null);
  // const [currentJobId, setCurrentJobId] = usePersistentState<string | null>('currentJobId', null);
  const [overlayState, setOverlayState] = useState<'none' | 'processes' | 'finalizing' | 'songSyncStatus'>('none');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const isFinalizingRef = useRef(false);

  // New: Ready to sync if both Spotify and YouTube are authenticated
  const isReadyToSync = isSpotifyAuthenticated && isYoutubeAuthenticated;

  // Health check effect
  const backendStatus = useBackendStatus()

  const { toast, setToast, toastFading } = useToast();

  // Use useProcesses hook with the persistent processes state
  const { addProcess, updateProcess, removeProcess } = useProcesses(processes, setProcesses);

  const {
        manualSearchSong,
        setManualSearchSong,
        handleManualSearchSpToYt,
        handleSelectManualSearchSpToYt,
        handleSkipSpToYt,
        handleManualSearchYtToSp,
        handleSelectManualSearchYtToSp,
        handleSkipYtToSp,
    } = useManualSearch(setSpToYtSongs, setYtToSpSongs)

  const {
      currentJobId,
      setCurrentJobId,
      startJobPolling,
    } = useJobPolling({
      userId,
      setProcesses,
      setToast,
      setSpToYtSongs,
      setOverlayState,
      setIsFinalizing,
      APIErrorHandler,
  });

  // Fade in effect on tab change
  const {quota, fetchQuota} = useYoutubeQuota();
  const quotaExceeded = !!(quota && quota.total >= quota.limit);

const {
  activeTab,
  displayedTab,
  tabFade,
  handleTabChange,
} = useTab(quotaExceeded);

  

  const fetchStatus = async () => {
    try {
      const data = await API.getStatus() as StatusResponse;
      setData(data);
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to fetch application status');
    }
  }

  const onSyncSpToYt = async (playlistName: string, userId: string) => {
    await handleSyncSpToYt(
      playlistName,
      userId,
      ensureSpotifyAuthHandler,
      ensureYoutubeAuthHandler,
      addProcess,
      setOverlayState,
      setProcesses,
      startJobPolling,
      updateProcess,
      APIErrorHandler
  );
  }

  const onSyncYtToSp = async (playlistName: string, userId: string) => {
    await handleSyncYtToSp(
      playlistName,
      userId,
      ensureSpotifyAuthHandler,
      ensureYoutubeAuthHandler,
      addProcess,
      setOverlayState,
      setProcesses,
      startJobPolling,
      updateProcess,
      APIErrorHandler
    )
  }

  const onMergePlaylists = async (ytPlaylist: string, spPlaylist: string, mergeName: string, userId: string) => {
    await handleMergePlaylists(
      userId,
      ytPlaylist,
      spPlaylist,
      mergeName,
      ensureSpotifyAuthHandler,
      ensureYoutubeAuthHandler,
      startJobPolling,
      APIErrorHandler
    )
  }

  const onDownloadSong = async (songTitle: string, artists: string, userId: string) => {
    await handleDownloadSong(
      userId,
      songTitle,
      artists,
      addProcess,
      updateProcess,
      removeProcess,
      fetchQuota,
      setToast,
      APIErrorHandler
    )
  };

  const {
    handleFinalizeSpToYt,
    handleFinalizeYtToSp
  } = useFinalizeSync({
    currentJobId,
    setCurrentJobId,
    setIsFinalizing,
    isFinalizingRef,
    setOverlayState,
    setToast,
    API
  });

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

  const tabs = [
    { id: "1", label: "sync", icon1: <FaSpotify className="inline-block mx-1" />, icon2: <SiYoutube className="inline-block mx-1" /> },
    { id: "2", label: "sync", icon1: <SiYoutube className="inline-block mx-1" />, icon2: <FaSpotify className="inline-block mx-1" /> },
    { id: "3", label: "merge playlists" },
    // { id: "4", label: "download", icon1: <SiYoutube className="inline-block mx-1" />, label2: "song" },
  ];


  // On mount, get or create userId
  useEffect(() => {
    getOrCreateUserId().then(setUserId);
  }, []);


  // Use custom hook to check YouTube and Spotify auth status
  useAuthStatus(userId, setIsSpotifyAuthenticated, setIsYoutubeAuthenticated);

  const ensureYoutubeAuthHandler = async () => {
    await ensureYoutubeAuth(userId, isYoutubeAuthenticated, setIsYoutubeAuthenticated);
  };

  const ensureSpotifyAuthHandler = async () => {
    await ensureSpotifyAuth(userId, isSpotifyAuthenticated, setIsSpotifyAuthenticated);
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


  const { showNoSongsToSync, noSongsFade } = useNoSongsToSyncFade({
      overlayState,
      setOverlayState,
      spToYtSongs,
      setSpToYtSongs,
      ytToSpSongs,
      setYtToSpSongs,
      currentJobId,
      setCurrentJobId,
  })
  // Cleanup orphaned processes whose jobs no longer exist (use jobId for backend calls)
  useEffect(() => {
    const cleanupOrphanedProcesses = async () => {
      if (!processes || processes.length === 0) return;
      if (overlayState !== 'processes') return;
      const updatedProcesses = await Promise.all(
        processes.map(async (p) => {
          // Only check for processes with a backend jobId (UUID)
          if (!p.jobId) return p;
          try {
            await API.getJobStatus(p.jobId);
            return p; // Job exists
          } catch (err: unknown) {
            if (
              err &&
              typeof err === 'object' &&
              'status' in err &&
              typeof (err as { status?: unknown }).status === 'number' &&
              (err as { status: number }).status === 404
            ) {
              return null;
            }
            return p; // Keep on other errors
          }
        })
      );
      const filtered = updatedProcesses.filter((p): p is Process => p !== null);
      if (filtered.length !== processes.length) {
        setProcesses(filtered);
      }
    };
    cleanupOrphanedProcesses();
  }, [overlayState, processes, setProcesses]);

  if (backendStatus === BackendStatus.CONNECTING) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-brand-dark text-white font-cascadia">
        <span>Connecting to backend...</span>
      </div>
    );
  }

  if (backendStatus === BackendStatus.OFFLINE) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-brand-dark text-white font-cascadia">
        <span>Backend is offline. Please try again later.</span>
      </div>
    );
  }

  if (!userId) {
    // Show a loading spinner or message until userId is loaded
    return (
      <div className="flex items-center justify-center h-full w-full bg-brand-dark text-white font-cascadia">
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
                  songs={spToYtSongs.length > 0 ? spToYtSongs : ytToSpSongs}
                  onManualSearch={spToYtSongs.length > 0 ? handleManualSearchSpToYt : handleManualSearchYtToSp}
                  onSkip={spToYtSongs.length > 0 ? handleSkipSpToYt : handleSkipYtToSp}
                  onFinalize={ytToSpSongs.length > 0 ? handleFinalizeYtToSp : handleFinalizeSpToYt}
                  finalizing={true}
                />
              </motion.div>
            ) : overlayState === 'songSyncStatus' && (spToYtSongs.length > 0 || ytToSpSongs.length > 0) ? (
              <motion.div
                key={spToYtSongs.length > 0 ? "song-sync-status-overlay" : "yt-song-sync-status-overlay"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-40"
              >
                <SongSyncStatus
                  songs={spToYtSongs.length > 0 ? spToYtSongs : ytToSpSongs}
                  onManualSearch={spToYtSongs.length > 0 ? handleManualSearchSpToYt : handleManualSearchYtToSp}
                  onSkip={spToYtSongs.length > 0 ? handleSkipSpToYt : handleSkipYtToSp}
                  onFinalize={ytToSpSongs.length > 0 ? handleFinalizeYtToSp : handleFinalizeSpToYt}
                  finalizing={false}
                />
              </motion.div>
            ) : overlayState === 'songSyncStatus' && showNoSongsToSync ? (
              <motion.div
                key="no-songs-to-sync-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: noSongsFade ? 0 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-40"
              >
                <NoSongsToSync />
              </motion.div>
            ) : overlayState === 'processes' ? (
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
                      onClick={ensureSpotifyAuthHandler}
                      disabled={!!isSpotifyAuthenticated}
                    >
                      {isSpotifyAuthenticated ? "Spotify Authenticated" : "Authenticate Spotify"}
                    </button>
                    <button
                      className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded text-white"
                      onClick={ensureYoutubeAuthHandler}
                      disabled={!!isYoutubeAuthenticated}
                    >
                      {isYoutubeAuthenticated ? "YouTube Authenticated" : "Authenticate YouTube"}
                    </button>
                  </div>
                ) : (
                  <>
              {displayedTab === "1" && 
                <SyncSpToYt 
                onSync={onSyncSpToYt} 
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
                onSync={onSyncYtToSp} 
                userId={userId || ''}
                quotaExceeded={quotaExceeded}
                quota={quota}
                countdown={countdown}
                formatMs={formatMs}
                isReadyToSync={isReadyToSync}
                />
              }
              {displayedTab === "3" && <MergePlaylists onMerge={onMergePlaylists} userId={userId || ''} />}
              {displayedTab === "4" && <DownloadSong onDownload={onDownloadSong} userId={userId || ''} />}
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
            onSelectSong={ytToSpSongs.length > 0 ? handleSelectManualSearchYtToSp : handleSelectManualSearchSpToYt}
            manualSearchApi={ytToSpSongs.length > 0 ? wrappedManualSearchYtToSp : API.manualSearchSpToYt}
            userId={userId!}
          />
        )}
      </AnimatePresence>

      {/* Quota Exceeded Banner */}
      {quotaExceeded && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-700 text-white text-center py-2 text-xs font-bold animate-pulse">
          YouTube API quota exceeded. Please try again after 3am EST.<br />
          <span className="font-mono">Time until reset: {formatMs(countdown)}</span>
        </div>
      )}
    </div>
  )
}

export default App