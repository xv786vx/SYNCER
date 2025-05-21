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

function App() {
  const [data, setData] = useState<StatusResponse>({ name: '', authenticated: false })
  const [activeTab, setActiveTab] = useState("1");
  const [processes, setProcesses] = useState<Process[]>([])
  const [songs, setSongs] = useState<SongStatus[]>([])
  const [ytToSpSongs, setYtToSpSongs] = useState<SongStatus[]>([])
  const [syncedSpPlaylist, setSyncedSpPlaylist] = useState('')
  const [syncedYtPlaylist, setSyncedYtPlaylist] = useState('')
  const [toast, setToast] = useState<string | null>(null)

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
      const response = await fetch('http://127.0.0.1:8000/');
      const data = await APIErrorHandler.handleResponse<StatusResponse>(response);
      setData(data);
    } catch (error) {
      APIErrorHandler.handleError(error as Error, 'Failed to fetch application status');
    }
  }

  const handleSyncSpToYt = async (playlistName: string) => {
    const processId = addProcess('sync', `Syncing Spotify playlist "${playlistName}" to YouTube...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
      if (data.songs) {
        setSongs(data.songs);
        setSyncedSpPlaylist(playlistName);
        updateProcess(processId, 'completed', 'Sync analysis complete!');
        setToast(data.message || 'Sync complete!');
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to sync playlist');
      APIErrorHandler.handleError(error as Error, 'Failed to sync playlist');
    }
  };

  const handleSyncYtToSp = async (playlistName: string) => {
    const processId = addProcess('sync', `Syncing YouTube playlist "${playlistName}" to Spotify...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
      if (data.songs) {
        setYtToSpSongs(data.songs);
        setSyncedYtPlaylist(playlistName);
        updateProcess(processId, 'completed', 'Sync analysis complete!');
        setToast(data.message || 'Sync complete!');
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to sync playlist');
      APIErrorHandler.handleError(error as Error, 'Failed to sync playlist');
    }
  };

  const handleMergePlaylists = async (ytPlaylist: string, spPlaylist: string, mergeName: string) => {
    const processId = addProcess('merge', `Merging playlists "${ytPlaylist}" and "${spPlaylist}"...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/merge_playlists?yt_playlist=${encodeURIComponent(ytPlaylist)}&sp_playlist=${encodeURIComponent(spPlaylist)}&merge_name=${encodeURIComponent(mergeName)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
      if (data.result) {
        setToast(data.result);
        updateProcess(processId, 'completed', 'Playlists merged successfully!');
        removeProcess(processId);
      }
    } catch (error: any) {
      updateProcess(processId, 'error', 'Failed to merge playlists');
      // Try to extract a user-friendly error message
      let message = "Failed to merge playlists";
      if (error?.error?.message) {
        message = error.error.message;
      } else if (error.message) {
        message = error.message;
      }
      setToast(message);
      APIErrorHandler.handleError(error as Error, message);
    }
  };

  const handleDownloadSong = async (songTitle: string) => {
    const processId = addProcess('download', `Downloading "${songTitle}"...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/download_yt_song?song_name=${encodeURIComponent(songTitle)}`);
      const data = await APIErrorHandler.handleResponse<APIResponse>(response);
      if (data.result) {
        setToast(data.result);
        updateProcess(processId, 'completed', 'Download completed successfully!');
        removeProcess(processId);
      }
    } catch (error) {
      updateProcess(processId, 'error', 'Failed to download song');
      APIErrorHandler.handleError(error as Error, 'Failed to download song');
    }
  };

  const handleManualSearch = async (song: SongStatus, idx: number) => {
    const response = await fetch(
      `http://127.0.0.1:8000/api/manual_search_sp_to_yt?song=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}`
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

  const handleSkip = (song: SongStatus, idx: number) => {
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
    const response = await fetch('http://127.0.0.1:8000/api/finalize_sp_to_yt', {
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
      `http://127.0.0.1:8000/api/manual_search_yt_to_sp?song=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}`
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

  const handleSkipYtToSp = (song: SongStatus, idx: number) => {
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
    const response = await fetch('http://127.0.0.1:8000/api/finalize_yt_to_sp', {
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
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const tabs = [
    { id: "1", label: "Sync", icon1: <FaSpotify className="inline-block mx-1" />, icon2: <SiYoutube className="inline-block mx-1" /> },
    { id: "2", label: "Sync", icon1: <SiYoutube className="inline-block mx-1" />, icon2: <FaSpotify className="inline-block mx-1" /> },
    { id: "3", label: "Merge Playlists" },
    { id: "4", label: "Download", icon1: <SiYoutube className="inline-block mx-1" />, label2: "song" },
  ];

  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-neutral-800 text-white relative">
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
      <div className="flex flex-col flex-shrink-0 w-[144px] bg-neutral-700 gap-y-2 p-3">
        <h1 className="text-white text-center text-2xl font-bold">SYNCER</h1>
        <p className="text-white text-center text-xs">I'm like hey whats up hello</p>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-2 py-3 rounded text-xs flex items-center justify-center ${
              activeTab === tab.id
                ? "bg-neutral-800 text-white"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id === "1" || tab.id === "2" ? (
              <>
                {tab.label} {tab.icon1} to {tab.icon2}
              </>
            ) : tab.id === "4" ? (
              <>
                {tab.label} {tab.icon1} {tab.label2}
              </>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      
      {/* Main Content */}
      <div className="w-[216px] p-6">
        {activeTab === "1" && <SyncSpToYt onSync={handleSyncSpToYt} />}
        {activeTab === "2" && <SyncYtToSp onSync={handleSyncYtToSp} />}
        {activeTab === "3" && <MergePlaylists onMerge={handleMergePlaylists} />}
        {activeTab === "4" && <DownloadSong onDownload={handleDownloadSong} />}
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

