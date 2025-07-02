from src.functions.helpers.provider import preprocess_title
from src.functions.helpers.sp_provider import SpotifyProvider
from src.functions.helpers.yt_provider import YoutubeProvider
import time


def sync_sp_to_yt(playlist_to_modify, sp: SpotifyProvider, db, song_limit: int | None = None, tracks_to_sync: list | None = None):
    yt = YoutubeProvider(sp.user_id)

    pl_info = sp.get_playlist_by_name(playlist_to_modify)
    print(f"pl_info: {pl_info}")
    if pl_info is None:
        print(f"Could not find or access playlist '{playlist_to_modify}'")
        return []

    print(f"SPOTIFY playlist chosen: {pl_info['title']}")

    # 3. check if same playlist exists in youtube, if not then make it
    print(f"Checking if {pl_info['title']} exists in YouTube account...")
    yt_playlist = yt.get_playlist_by_name(playlist_to_modify, db)
    if yt_playlist is None:
        print(f"Playlist {playlist_to_modify} not found in YouTube, creating it now...")
        yt.create_playlist(playlist_to_modify, db)
        # Retry logic: wait and retry fetching the playlist up to 5 times
        for attempt in range(5):
            time.sleep(1.5)  # Wait 1.5 seconds between attempts
            yt_playlist = yt.get_playlist_by_name(playlist_to_modify, db)
            print(f"[Retry {attempt+1}/5] yt.get_playlist_by_name returned: {yt_playlist}")
            if yt_playlist is not None:
                break

    # Get items from the YouTube playlist to check for existing songs
    yt_playlist_items = []
    if yt_playlist:
        print(f"Fetching items from YouTube playlist '{yt_playlist['title']}'...")
        yt_playlist_items = yt.get_playlist_items(yt_playlist['id'], db)
    else:
        print(f"Could not find or create YouTube playlist '{playlist_to_modify}'.")
        return []

    # Create a set of preprocessed titles for efficient lookup
    existing_yt_titles = {preprocess_title(track['title']) for track in yt_playlist_items if 'title' in track}
    print(f"Found {len(existing_yt_titles)} existing tracks in the YouTube playlist.")

    # --- Use provided tracks_to_sync if given, else fetch all from Spotify ---
    if tracks_to_sync is not None:
        t_to_sync_sp = tracks_to_sync
        print(f"Using provided tracks_to_sync: {len(t_to_sync_sp)} tracks")
    else:
        # 4. Add each song from spotify to youtube playlist
        print(f"(Step 2) Syncing {pl_info['title']}, {pl_info['id']} to Youtube...")
        t_to_sync_sp = sp.get_playlist_items(pl_info['id'])
        print(f"Fetched {len(t_to_sync_sp) if t_to_sync_sp else 0} tracks from Spotify playlist '{pl_info['title']}'")
        if t_to_sync_sp:
            for track in t_to_sync_sp:
                print(f"Track: {track}")

        # Extra safeguard against None return
        if t_to_sync_sp is None:
            print(f"Error: get_playlist_items returned None for playlist ID {pl_info['id']}")
            t_to_sync_sp = []

    # --- Apply song limit if provided ---
    if song_limit is not None and song_limit > 0:
        print(f"Applying song limit: processing first {song_limit} of {len(t_to_sync_sp)} songs.")
        t_to_sync_sp = t_to_sync_sp[:song_limit]

    t_to_sync_yt = []
    for track in t_to_sync_sp:
        if track.get('is_unplayable'):
            t_to_sync_yt.append({
                "name": track['title'],
                "artist": track['artist'],
                "status": "not_found",
                "yt_id": None,
                "requires_manual_search": True,
                "reason": "Unplayable song on Spotify. Search for a replacement?"
            })
            continue

        song = track['title']
        artists = track['artist']

        result = yt.search_auto(song, artists)

        if result is not None:
            found_yt_title = result[3]
            processed_found_title = preprocess_title(found_yt_title)
            if processed_found_title in existing_yt_titles:
                print(f"Found song '{found_yt_title}' which already exists in the YouTube playlist. Skipping.")
                continue
            
            t_to_sync_yt.append({
                "name": song,
                "artist": artists,
                "status": "found",
                "yt_id": result[0],
                "yt_title": result[3],
                "yt_artist": result[4],
                "requires_manual_search": False
            })
        else:
            t_to_sync_yt.append({
                "name": song,
                "artist": artists,
                "status": "not_found",
                "yt_id": None,
                "requires_manual_search": True,
                "reason": "Could not find a matching YouTube video."
            })
    return t_to_sync_yt

