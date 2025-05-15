export async function getThing(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("error");
  return res.json();
}

// Get auto-matched songs for Spotify → YouTube
export async function syncSpToYt(playlistName: string) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/sync_sp_to_yt?playlist_name=${encodeURIComponent(playlistName)}`
  );
  return response.json();
}

// Finalize playlist creation on YouTube
export async function finalizeSpToYt(playlistName: string, ytIds: string[]) {
  const response = await fetch(`http://127.0.0.1:8000/api/finalize_sp_to_yt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlist_name: playlistName, yt_ids: ytIds }),
  });
  return response.json();
}

// Manual search for a song on YouTube
export async function manualSearchSpToYt(song: string, artist: string) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/manual_search_sp_to_yt?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`
  );
  return response.json();
}

// Get auto-matched songs for Spotify → YouTube
export async function syncYtToSp(playlistName: string) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/sync_yt_to_sp?playlist_name=${encodeURIComponent(playlistName)}`
  );
  return response.json();
}

// Finalize playlist creation on YouTube
export async function finalizeYtToSp(playlistName: string, ytIds: string[]) {
  const response = await fetch(`http://127.0.0.1:8000/api/finalize_yt_to_sp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlist_name: playlistName, yt_ids: ytIds }),
  });
  return response.json();
}

// Manual search for a song on YouTube
export async function manualSearchYtToSp(song: string, artist: string) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/manual_search_yt_to_sp?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`
  );
  return response.json();
}
