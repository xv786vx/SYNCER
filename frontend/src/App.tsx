// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import { useState, useEffect } from 'react'
import { FaSpotify } from 'react-icons/fa'
import { SiYoutube } from 'react-icons/si'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { APIErrorHandler } from './utils/errorHandling'
import { SyncSpToYt } from './components/SyncSpToYt'
import { SyncYtToSp } from './components/SyncYtToSp'
import { MergePlaylists } from './components/MergePlaylists'
import { DownloadSong } from './components/DownloadSong'
import { SongSyncStatus } from './components/SongSyncStatus'
import { ProcessesOverlay } from './components/ProcessesOverlay'
import { Process, SongStatus, APIResponse, StatusResponse } from './types'

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
  const [data, setData] = useState<StatusResponse>({ name: '', authenticated: false })
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("1");
  const [displayedTab, setDisplayedTab] = useState("1"); // NEW: controls which tab's content is shown
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
        const res = await fetch('https://syncer-gt20.onrender.com/api/youtube_quota_usage');
        const data = await res.json();
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
      const response = await fetch('https://syncer-gt20.onrender.com/');
      const data = await APIErrorHandler.handleResponse<StatusResponse>(response);
      setData(data);
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to fetch application status');
    }
  }

  const handleSyncSpToYt = async (playlistName: string) => {
    console.log('Syncing Spotify playlist:', playlistName);
    const processId = addProcess('sync', `Syncing Spotify playlist "${playlistName}" to YouTube...`);
    try {
      const response = await fetch(`https://syncer-gt20.onrender.com/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
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

  const handleSyncYtToSp = async (playlistName: string) => {
    const processId = addProcess('sync', `Syncing YouTube playlist "${playlistName}" to Spotify...`);
    try {
      const response = await fetch(`https://syncer-gt20.onrender.com/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
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

  const handleMergePlaylists = async (ytPlaylist: string, spPlaylist: string, mergeName: string) => {
    const processId = addProcess('merge', `Merging playlists "${ytPlaylist}" and "${spPlaylist}"...`);
    try {
      const response = await fetch(`https://syncer-gt20.onrender.com/api/merge_playlists?yt_playlist=${encodeURIComponent(ytPlaylist)}&sp_playlist=${encodeURIComponent(spPlaylist)}&merge_name=${encodeURIComponent(mergeName)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
      if (data.result) {
        setToast(data.result);
        updateProcess(processId, 'completed', 'Playlists merged successfully!');
        removeProcess(processId);
        fetchQuota();
      }
    } catch (error: unknown) {
      updateProcess(processId, 'error', 'Failed to merge playlists');
      // Try to extract a user-friendly error message
      let message = "Failed to merge playlists";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && typeof error === "object" && "error" in error && typeof (error as any).error === "object" && "message" in (error as any).error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message = (error as any).error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setToast(message);
      APIErrorHandler.handleError(error as Error, message);
    }
  };

  const handleDownloadSong = async (songTitle: string, artists: string) => {
    const processId = addProcess('download', `Downloading "${songTitle}"...`);
    try {
      const response = await fetch(`https://syncer-gt20.onrender.com/api/download_yt_song?song_name=${encodeURIComponent(songTitle)}&artists=${encodeURIComponent(artists)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
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
    const response = await fetch(
      `https://syncer-gt20.onrender.com/api/manual_search_sp_to_yt?song=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}`
    );
    const data = await response.json();
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
    const ytIds = songs.filter(s => s.status === 'found' && s.yt_id).map(s => s.yt_id);
    const response = await fetch('https://syncer-gt20.onrender.com/api/finalize_sp_to_yt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlist_name: syncedSpPlaylist, yt_ids: ytIds }),
    });
    const data = await response.json();
    setToast(data.message || 'Sync complete!');
    setSongs([]);
    setSyncedSpPlaylist('');
  };

  const handleManualSearchYtToSp = async (song: SongStatus, idx: number) => {
    const response = await fetch(
      `https://syncer-gt20.onrender.com/api/manual_search_yt_to_sp?song=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}`
    );
    const data = await response.json();
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
    const response = await fetch('https://syncer-gt20.onrender.com/api/finalize_yt_to_sp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlist_name: syncedYtPlaylist, sp_ids: spIds }),
    });
    const data = await response.json();
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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const tabs = [
    { id: "1", label: "sync", icon1: <FaSpotify className="inline-block mx-1" />, icon2: <SiYoutube className="inline-block mx-1" /> },
    { id: "2", label: "sync", icon1: <SiYoutube className="inline-block mx-1" />, icon2: <FaSpotify className="inline-block mx-1" /> },
    { id: "3", label: "merge playlists" },
    // { id: "4", label: "download", icon1: <SiYoutube className="inline-block mx-1" />, label2: "song" }, // uncomment when you want to add download functionality
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
  }, [tabFade, pendingTab, activeTab]);

  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-brand-accent-1 text-white font-cascadia relative">
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
      <div className="flex flex-col flex-shrink-0 w-[144px] bg-brand-dark gap-y-2 p-3">
        <h1 className="text-white text-center text-2xl font-bold font-cascadia">syncer</h1>
        <p className="text-white text-center text-xs font-cascadia my-2">
          <SiYoutube className="inline-block mr-2 my-1" />
          API usage: {quota ? `${quota.total} / ${quota.limit}` : '...'} units
        </p>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-2 py-3 rounded text-xs flex items-center justify-center font-cascadia ${
              activeTab === tab.id
                ? "bg-brand-accent-3 text-white"
                : "bg-brand-accent-1 text-white hover:bg-brand-accent-2"
            }`}
            onClick={() => handleTabChange(tab.id)}
            disabled={!!(quota && quota.total >= quota.limit)}
          >
            {tab.id === "1" || tab.id === "2" ? (
              <>
                {tab.label} {tab.icon1} to {tab.icon2}
              </>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {/* Main Content with fade-in transition */}
      <div
        className={`w-[216px] p-6 transition-opacity duration-200 ${tabFade ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: tabFade ? 'auto' : 'none' }}
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
            {displayedTab === "1" && <SyncSpToYt onSync={handleSyncSpToYt} />}
            {displayedTab === "2" && <SyncYtToSp onSync={handleSyncYtToSp} />}
            {displayedTab === "3" && <MergePlaylists onMerge={handleMergePlaylists} />}
            {displayedTab === "4" && <DownloadSong onDownload={handleDownloadSong} />}
          </>
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 bg-green-700 text-white px-6 py-3 rounded shadow-lg z-[100]"
          style={{ minWidth: 200, textAlign: 'center', background: 'rgba(21, 128, 61, 0.7)' }}
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default App

