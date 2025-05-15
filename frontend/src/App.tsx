// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import { useState, useEffect } from 'react'
import { getThing } from './get'
import { FaSpotify } from 'react-icons/fa'
import { SiYoutube } from 'react-icons/si'

type SongStatus = {
  name: string;
  artist: string;
  status: 'found' | 'not_found' | 'skipped';
  yt_id?: string; // For Spotify → YouTube
  sp_id?: string; // For YouTube → Spotify
  requires_manual_search?: boolean;
};

interface Process {
  id: string;
  type: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message: string;
  interactive?: {
    type: 'search' | 'skip';
    songName: string;
    onSearch: () => void;
    onSkip: () => void;
  };
}

function App() {
  const [data, setData] = useState({ name: '', authenticated: false })
  const [activeTab, setActiveTab] = useState("1");
  const [spPlaylist, setSpPlaylist] = useState('')
  const [mergeYtPlaylist, setMergeYtPlaylist] = useState('')
  const [mergeSpPlaylist, setMergeSpPlaylist] = useState('')
  const [ytPlaylist, setYtPlaylist] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [processes, setProcesses] = useState<Process[]>([])
  const [songs, setSongs] = useState<SongStatus[]>([]);
  const [syncedSpPlaylist, setSyncedSpPlaylist] = useState('');
  const [ytToSpSongs, setYtToSpSongs] = useState<SongStatus[]>([]);
  const [syncedYtPlaylist, setSyncedYtPlaylist] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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
    const response = await getThing('http://127.0.0.1:8000/')
    setData(response)
  }

  const tabs = [
    { id: "1", label: "Sync", icon1: <FaSpotify className="inline-block mx-1" />, icon2: <SiYoutube className="inline-block mx-1" /> },
    { id: "2", label: "Sync", icon1: <SiYoutube className="inline-block mx-1" />, icon2: <FaSpotify className="inline-block mx-1" /> },
    { id: "3", label: "Merge Playlists" },
    { id: "4", label: "Download", icon1: <SiYoutube className="inline-block mx-1" />, label2: "song" },
  ];

  // const authenticate = async () => {
  //   const response = await getThing('http://127.0.0.1:8000/api/authenticate')
  //   setData(prev => ({ ...prev, authenticated: response.authenticated }))
  // }

  const syncSpToYt = async () => {
    const processId = addProcess('sync', `Syncing Spotify playlist "${spPlaylist}" to YouTube...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(spPlaylist)}`);
      const data = await response.json();
      setSongs(data.songs);
      setSyncedSpPlaylist(spPlaylist);
      updateProcess(processId, 'completed', 'Sync analysis complete!');
      setSpPlaylist('');
      setToast(data.message || 'Sync complete!');
    } catch {
      updateProcess(processId, 'error', 'Failed to sync playlist');
    }
  };

  const syncYtToSp = async () => {
    const processId = addProcess('sync', `Syncing YouTube playlist "${ytPlaylist}" to Spotify...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(ytPlaylist)}`);
      const data = await response.json();
      setYtToSpSongs(data.songs);
      setSyncedYtPlaylist(ytPlaylist);
      updateProcess(processId, 'completed', 'Sync analysis complete!');
      setYtPlaylist('');
      setToast(data.message || 'Sync complete!');
    } catch {
      updateProcess(processId, 'error', 'Failed to sync playlist');
    }
  };

  const mergePlaylists = async () => {
    const processId = addProcess('merge', `Merging playlists "${mergeYtPlaylist}" and "${mergeSpPlaylist}"...`);
    try {
      const response = await getThing(`http://127.0.0.1:8000/api/merge_playlists?playlist1=${encodeURIComponent(mergeYtPlaylist)}&playlist2=${encodeURIComponent(mergeSpPlaylist)}`)
      setToast(response.result)
      updateProcess(processId, 'completed', 'Playlists merged successfully!')
      removeProcess(processId)
      setMergeYtPlaylist('')
      setMergeSpPlaylist('')
    } catch {
      updateProcess(processId, 'error', 'Failed to merge playlists')
      setToast('Error: Failed to merge playlists')
    }
  }

  const downloadYtSong = async () => {
    const processId = addProcess('download', `Downloading "${songTitle}"...`);
    try {
      const response = await getThing(`http://127.0.0.1:8000/api/download_yt_song?title=${encodeURIComponent(songTitle)}`)
      setToast(response.result)
      updateProcess(processId, 'completed', 'Download completed successfully!')
      removeProcess(processId)
      setSongTitle('')
    } catch {
      updateProcess(processId, 'error', 'Failed to download song')
      setToast('Error: Failed to download song')
    }
  }

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

  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-neutral-800 text-white relative">
      {/* Overlay logic: Show Song Sync Status overlay for SP->YT or YT->SP, else show Processes overlay if any */}
      {songs.length > 0 ? (
        <div className="absolute inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="w-full max-w-[400px] p-6 bg-neutral-900 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Song Sync Status</h3>
            <ul>
              {songs.map((song, idx) => (
                <li key={idx} className="flex items-center gap-2 mb-1">
                  <span>{song.name} by {song.artist}</span>
                  {song.status === 'found' && <span className="text-green-400">✔️</span>}
                  {song.status === 'not_found' && <span className="text-red-400">❌</span>}
                  {song.status === 'skipped' && <span className="text-gray-400">⏭️</span>}
                  {song.requires_manual_search && (
                    <>
                      <button
                        className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded"
                        onClick={() => handleManualSearch(song, idx)}
                      >
                        Manual Search
                      </button>
                      <button
                        className="ml-1 px-2 py-1 bg-gray-600 text-xs rounded"
                        onClick={() => handleSkip(song, idx)}
                      >
                        Skip
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <button
              className="mt-4 px-4 py-2 bg-green-700 rounded"
              disabled={songs.some(s => s.status === 'not_found' && !s.requires_manual_search)}
              onClick={handleFinalize}
            >
              Finalize Sync
            </button>
          </div>
        </div>
      ) : ytToSpSongs.length > 0 ? (
        <div className="absolute inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="w-full max-w-[400px] p-6 bg-neutral-900 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Song Sync Status</h3>
            <ul>
              {ytToSpSongs.map((song, idx) => (
                <li key={idx} className="flex items-center gap-2 mb-1">
                  <span>{song.name} by {song.artist}</span>
                  {song.status === 'found' && <span className="text-green-400">✔️</span>}
                  {song.status === 'not_found' && <span className="text-red-400">❌</span>}
                  {song.status === 'skipped' && <span className="text-gray-400">⏭️</span>}
                  {song.requires_manual_search && (
                    <>
                      <button
                        className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded"
                        onClick={() => handleManualSearchYtToSp(song, idx)}
                      >
                        Manual Search
                      </button>
                      <button
                        className="ml-1 px-2 py-1 bg-gray-600 text-xs rounded"
                        onClick={() => handleSkipYtToSp(song, idx)}
                      >
                        Skip
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <button
              className="mt-4 px-4 py-2 bg-green-700 rounded"
              disabled={ytToSpSongs.some(s => s.status === 'not_found' && !s.requires_manual_search)}
              onClick={handleFinalizeYtToSp}
            >
              Finalize Sync
            </button>
          </div>
        </div>
      ) : (
        processes.length > 0 && (
          <div
            className="absolute inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
            onClick={dismissProcesses}
            style={{ cursor: 'pointer' }}
          >
            <div
              className="w-full max-w-[360px] p-4"
              onClick={e => e.stopPropagation()}
              style={{ cursor: 'default' }}
            >
              <h3 className="text-lg font-semibold mb-4 text-center">Processes</h3>
              <div className="space-y-3">
                {processes.map(process => (
                  <div
                    key={process.id}
                    className={`text-sm p-3 rounded-lg ${
                      process.status === 'completed' ? 'bg-green-900' :
                      process.status === 'error' ? 'bg-red-900' :
                      process.status === 'in-progress' ? 'bg-blue-900' :
                      'bg-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{process.message}</span>
                      {process.status === 'in-progress' && !process.interactive && (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        {activeTab === "1" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-6 w-40 mx-auto">
              <p className="text-md text-center">Enter the name of your Spotify playlist below!</p>
              <input
                type="text"
                value={spPlaylist}
                onChange={(e) => setSpPlaylist(e.target.value)}
                placeholder="..."
                className="bg-transparent border-0 border-b-2 border-green-600 focus:border-green-500 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
              />
              <button
                onClick={syncSpToYt}
                className="w-full py-2 bg-red-700 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Sync to <SiYoutube className="inline-block align-text-bottom ml-0.5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "2" && <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-6 w-40 mx-auto">
              <p className="text-md text-center">Enter the name of your YouTube playlist below!</p>
              <input
                type="text"
                value={ytPlaylist}
                onChange={(e) => setYtPlaylist(e.target.value)}
                placeholder="..."
                className="bg-transparent border-0 border-b-2 border-red-700 focus:border-red-600 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
              />
              <button
                onClick={syncYtToSp}
                className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Sync to <FaSpotify className="inline-block align-middle ml-1" />
              </button>
            </div>
          </div>}

        {activeTab === "3" && <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 w-40 mx-auto">
              <p className="text-md text-center">Enter the names of the Spotify and YouTube playlists you want to merge!</p>
              <input
                type="text"
                value={mergeYtPlaylist}
                onChange={(e) => setMergeYtPlaylist(e.target.value)}
                placeholder="YouTube Playlist name..."
                className="text-sm bg-transparent border-0 border-b-2 border-red-700 focus:border-red-600 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
              />
              <input
                type="text"
                value={mergeSpPlaylist}
                onChange={(e) => setMergeSpPlaylist(e.target.value)}
                placeholder="Spotify Playlist name..."
                className="text-sm bg-transparent border-0 border-b-2 border-green-600 focus:border-green-500 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
              />
              <button
                onClick={mergePlaylists}
                className="w-full py-2 mt-6 bg-neutral-600 text-white rounded-md hover:bg-neutral-500 focus:outline-none focus:ring-2 focus:ring-white"
              >
                Merge Playlists
              </button>
            </div>
          </div>}

        {activeTab === "4" && <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-6 w-40 mx-auto">
              <p className="text-md text-center">Enter the name of the YouTube song you want to download!</p>
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Song title..."
                className="bg-transparent border-0 border-b-2 border-red-700 focus:border-red-600 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
              />
              <button
                onClick={downloadYtSong}
                className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Download <SiYoutube className="inline-block align-middle ml-1" />
              </button>
            </div>
          </div>}
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

