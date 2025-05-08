// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { useState } from 'react'

export async function getThing(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('error')
  return res.json()
}

function App() {
  const [data, setData] = useState({ name: '', authenticated: false })
  const [result, setResult] = useState('')
  const [ytPlaylist, setYtPlaylist] = useState('')
  const [spPlaylist, setSpPlaylist] = useState('')
  const [mergePlaylist1, setMergePlaylist1] = useState('')
  const [mergePlaylist2, setMergePlaylist2] = useState('')
  const [songTitle, setSongTitle] = useState('')

  const fetchStatus = async () => {
    const response = await getThing('http://127.0.0.1:8000/')
    setData(response)
  }

  const authenticate = async () => {
    const response = await getThing('http://127.0.0.1:8000/api/authenticate')
    setData(prev => ({ ...prev, authenticated: response.authenticated }))
  }

  const syncYtToSp = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(ytPlaylist)}`)
    setResult(response.result)
    setYtPlaylist('')
  }

  const syncSpToYt = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(spPlaylist)}`)
    setResult(response.result)
    setSpPlaylist('')
  }

  const mergePlaylists = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/merge_playlists?playlist1=${encodeURIComponent(mergePlaylist1)}&playlist2=${encodeURIComponent(mergePlaylist2)}`)
    setResult(response.result)
    setMergePlaylist1('')
    setMergePlaylist2('')
  }

  const downloadYtSong = async () => {
    const response = await getThing(`http://127.0.0.1:8000/api/download_yt_song?title=${encodeURIComponent(songTitle)}`)
    setResult(response.result)
    setSongTitle('')
  }

  if (data.name === '') fetchStatus()

  return (
    <div>
      <h1>SYNCER</h1>
      {!data.authenticated ? (
        <button onClick={authenticate}>Get Started</button>
      ) : (
        <div>
          <div>
            <input
              type="text"
              placeholder="YouTube Playlist Name"
              value={ytPlaylist}
              onChange={e => setYtPlaylist(e.target.value)}
            />
            <button onClick={syncYtToSp} disabled={!ytPlaylist}>Sync YT to SP</button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Spotify Playlist Name"
              value={spPlaylist}
              onChange={e => setSpPlaylist(e.target.value)}
            />
            <button onClick={syncSpToYt} disabled={!spPlaylist}>Sync SP to YT</button>
          </div>

          <div>
            <input
              type="text"
              placeholder="First Playlist Name"
              value={mergePlaylist1}
              onChange={e => setMergePlaylist1(e.target.value)}
            />
            <input
              type="text"
              placeholder="Second Playlist Name"
              value={mergePlaylist2}
              onChange={e => setMergePlaylist2(e.target.value)}
            />
            <button onClick={mergePlaylists} disabled={!mergePlaylist1 || !mergePlaylist2}>Merge Playlists</button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Song Title"
              value={songTitle}
              onChange={e => setSongTitle(e.target.value)}
            />
            <button onClick={downloadYtSong} disabled={!songTitle}>Download YT Song</button>
          </div>

          {result && <p>{result}</p>}
        </div>
      )}
    </div>
  )
}

export default App

