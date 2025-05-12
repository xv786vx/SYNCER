// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import { useState, useEffect } from 'react'
import { getThing } from './get'
import { FaSpotify } from 'react-icons/fa'
import { SiYoutube } from 'react-icons/si'

function App() {
  const [data, setData] = useState({ name: '', authenticated: false })
  const [activeTab, setActiveTab] = useState("1");
  const [spPlaylist, setSpPlaylist] = useState('')
  const [result, setResult] = useState('')
  const [mergeYtPlaylist, setMergeYtPlaylist] = useState('')
  const [mergeSpPlaylist, setMergeSpPlaylist] = useState('')
  const [ytPlaylist, setYtPlaylist] = useState('')
  const [songTitle, setSongTitle] = useState('')

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
    const response = await getThing(`http://127.0.0.1:8000/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(spPlaylist)}`)
    setResult(response.result)
    setSpPlaylist('')
  }

  const syncYtToSp = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(ytPlaylist)}`)
    setResult(response.result)
    setYtPlaylist('')
  }

  const mergePlaylists = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/merge_playlists?playlist1=${encodeURIComponent(mergeYtPlaylist)}&playlist2=${encodeURIComponent(mergeSpPlaylist)}`)
    setResult(response.result)
    setMergeYtPlaylist('')
    setMergeSpPlaylist('')
  }

  const downloadYtSong = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/download_yt_song?title=${encodeURIComponent(songTitle)}`)
    setResult(response.result)
    setSongTitle('')
  }

  useEffect(() => {
    if (data.name === '') fetchStatus()
    // eslint-disable-next-line
  }, [])

  return (
    <div className="flex h-screen bg-neutral-800 text-white">
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
            {result && <div className="mt-2">{result}</div>}
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
            {result && <div className="mt-2">{result}</div>}
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
            {result && <div className="mt-2">{result}</div>}
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
            {result && <div className="mt-2">{result}</div>}
          </div>}
      </div>
    </div>
  )
}

export default App

