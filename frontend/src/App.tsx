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
import type { SongStatus, Process, APIResponse, StatusResponse } from './types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion'
import Dither from "./components/Dither";

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
  // Persist userId in localStorage to ensure consistent user/session identity
  const [userId] = useState(() => {
    let stored = localStorage.getItem('userId');
    if (!stored) {
      stored = uuidv4();
      localStorage.setItem('userId', stored);
    }
    return stored;
  });
  const [data, setData] = useState<StatusResponse>({ name: '', authenticated: false })
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("1");
  const [displayedTab, setDisplayedTab] = useState("1"); // controls which tab's content is shown
  const [processes, setProcesses] = useState<Process[]>([])
  const [songs, setSongs] = useState<SongStatus[]>([])
  const [ytToSpSongs, setYtToSpSongs] = useState<SongStatus[]>([])
  const [syncedSpPlaylist, setSyncedSpPlaylist] = useState('')
  const [syncedYtPlaylist, setSyncedYtPlaylist] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ total: number; limit: number } | null>(null);
  const [countdown, setCountdown] = useState(getMsUntilMidnightEST());
  const [tabFade, setTabFade] = useState(true);

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
  

  const addProcess = (type: string, message: string) => {
    const id = Date.now().toString();
    setProcesses(prev => [...prev, { id, type, status: 'pending', message }]);
    return id;
  };

  const updateProcess = (id: string, status: Process['status'], message?: string, interactive?: Process['interactive']) => {
    setProcesses(prev => prev.map(p => 
      p.id === id ? { ...p, status, message: message || p.message, interactive } : p
    ));
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
    console.log('Syncing Spotify playlist:', playlistName);
    const processId = addProcess('sync', `Syncing Spotify playlist "${playlistName}" to YouTube...`);
    updateProcess(processId, 'in-progress', `Syncing Spotify playlist "${playlistName}" to YouTube...`);
    try {
      const data = await API.syncSpToYt(playlistName, userId) as APIResponse;
      if (data.songs) {
        for (let i = 0; i < data.songs.length; i++) {
          const song = data.songs[i];
          updateProcess(
            processId,
            'in-progress',
            `Syncing "${song.name} by ${song.artist}" (${i + 1}/${data.songs.length})`
          );
          // Simulate per-song sync delay (remove this if backend is already per-song)
          await new Promise(res => setTimeout(res, 150)); // 150ms per song for demo
        }
        setSongs(data.songs);
        setSyncedSpPlaylist(playlistName);
        updateProcess(processId, 'completed', 'Sync complete!');
        setToast(data.message || 'Sync complete!');
        fetchQuota();
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to sync playlist');
      APIErrorHandler.handleError(error as Error, 'Failed to sync playlist');
    }
  };
  const handleSyncYtToSp = async (playlistName: string, userId: string) => {
    const processId = addProcess('sync', `Syncing YouTube playlist "${playlistName}" to Spotify...`);
    try {
      const data = await API.syncYtToSp(playlistName, userId) as APIResponse;
      if (data.songs) {
        for (let i = 0; i < data.songs.length; i++) {
          const song = data.songs[i];
          updateProcess(
            processId,
            'in-progress',
            `Syncing "${song.name} by ${song.artist}" (${i + 1}/${data.songs.length})`
          );
          // Simulate per-song sync delay (remove this if backend is already per-song)
          await new Promise(res => setTimeout(res, 150)); // 150ms per song for demo
        }
        setYtToSpSongs(data.songs);
        setSyncedYtPlaylist(playlistName);
        updateProcess(processId, 'completed', 'Sync complete!');
        setToast(data.message || 'Sync complete!');
        fetchQuota();
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to sync playlist');
      APIErrorHandler.handleError(error as Error, 'Failed to sync playlist');
    }
  };
  const handleMergePlaylists = async (ytPlaylist: string, spPlaylist: string, mergeName: string, userId: string) => {
    const processId = addProcess('merge', `Merging playlists "${ytPlaylist}" and "${spPlaylist}"...`);
    try {
      const data = await API.mergePlaylists(ytPlaylist, spPlaylist, mergeName, userId) as APIResponse;
      if (data.result) {
        setToast(data.result);
        updateProcess(processId, 'completed', 'Playlists merged successfully!');
        removeProcess(processId);
        fetchQuota();
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to merge playlists');
      APIErrorHandler.handleError(error as Error, 'Failed to merge playlists');
    }
  };
  const handleDownloadSong = async (songTitle: string, artists: string, userId: string) => {
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
  const handleManualSearch = async (song: SongStatus, idx: number) => {
    const data = await API.manualSearchSpToYt(song.name, song.artist, userId) as { status: string; yt_id?: string };
    setSongs(prev =>
      prev.map((s, i) =>
        i === idx
          ? data.status === 'found'
            ? { ...s, status: 'found', yt_id: data.yt_id, requires_manual_search: false }
            : s
          : s
      )
    );
  };

  const handleSkip = (_song: SongStatus, idx: number) => {
    setSongs(prev =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, status: 'skipped', requires_manual_search: false }
          : s
      )
    );
  };

  const handleFinalize = async () => {
    const ytIds = songs.filter(s => s.status === 'found' && s.yt_id).map(s => s.yt_id!);
    const data = await API.finalizeSpToYt(syncedSpPlaylist, ytIds, userId) as { message?: string };
    setToast(data.message || 'Sync complete!');
    setSongs([]);
    setSyncedSpPlaylist('');
  };

  const handleManualSearchYtToSp = async (song: SongStatus, idx: number) => {
    const data = await API.manualSearchYtToSp(song.name, song.artist, userId) as { status: string; sp_id?: string };
    setYtToSpSongs(prev =>
      prev.map((s, i) =>
        i === idx
          ? data.status === 'found'
            ? { ...s, status: 'found', sp_id: data.sp_id, requires_manual_search: false }
            : s
          : s
      )
    );
  };

  const handleSkipYtToSp = (_song: SongStatus, idx: number) => {
    setYtToSpSongs(prev =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, status: 'skipped', requires_manual_search: false }
          : s
      )
    );
  };

  const handleFinalizeYtToSp = async () => {
    const spIds = ytToSpSongs.filter(s => s.status === 'found' && s.sp_id).map(s => s.sp_id!);
    const data = await API.finalizeYtToSp(syncedYtPlaylist, spIds, userId) as { message?: string };
    setToast(data.message || 'Sync complete!');
    setYtToSpSongs([]);
    setSyncedYtPlaylist('');
  };

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
  }, [tabFade, pendingTab, activeTab]);  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-brand-dark text-white font-cascadia" style={{ 
      width: '360px', 
      position: 'relative',
      overflow: 'hidden',
      height: '360px', // Match height from index.css
      display: 'flex',
      flexDirection: 'row'
    }}>
      <ToastContainer />
      {/* Overlay logic: Show Song Sync Status overlay for SP->YT or YT->SP, else show Processes overlay if any */}
      {songs.length > 0 ? (
        <SongSyncStatus
          songs={songs}
          onManualSearch={handleManualSearch}
          onSkip={handleSkip}
          onFinalize={handleFinalize}
        />
      ) : ytToSpSongs.length > 0 ? (
        <SongSyncStatus
          songs={ytToSpSongs}
          onManualSearch={handleManualSearchYtToSp}
          onSkip={handleSkipYtToSp}
          onFinalize={handleFinalizeYtToSp}
        />
      ) : (
        processes.length > 0 && (
          <ProcessesOverlay
            processes={processes}
            onDismiss={dismissProcesses}
          />
        )
      )}

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
              <div className="text-3xl font-bold mb-2">yabba dabba doo!</div>
              <div className="text-lg mb-4">YouTube API quota exhausted</div>
              <div className="text-sm mb-2">Quota resets in:</div>
              <div className="text-2xl font-mono mb-4">{formatMs(countdown)}</div>
              <div className="text-xs text-neutral-400">Try again after midnight EST</div>
            </div>
          ) : (
            <>
              {displayedTab === "1" && <SyncSpToYt onSync={handleSyncSpToYt} userId={userId} />}
              {displayedTab === "2" && <SyncYtToSp onSync={handleSyncYtToSp} userId={userId} />}
              {displayedTab === "3" && <MergePlaylists onMerge={handleMergePlaylists} userId={userId} />}
              {displayedTab === "4" && <DownloadSong onDownload={handleDownloadSong} userId={userId} />}
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
    </div>
  )
}

export default App

