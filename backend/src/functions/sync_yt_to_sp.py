from src.functions.helpers.sp_provider import SpotifyProvider
from src.functions.helpers.yt_provider import YoutubeProvider


def sync_yt_to_sp(playlist_to_modify, yt: YoutubeProvider, db):
    sp = SpotifyProvider(yt.user_id)

    # Use the provided SpotifyProvider instance
    pl_info = yt.get_playlist_by_name(playlist_to_modify, db)
    if pl_info is None:
        print(f"Could not find or access playlist '{playlist_to_modify}'")
        return

    print(f"YOUTUBE playlist chosen: {pl_info['title']}")

    # 3. check if same playlist exists in spotify, if not then make it
    print(f"Checking if {pl_info['title']} exists in Spotify account...")
    if sp.get_playlist_by_name(playlist_to_modify) is None:
        print(f"Playlist {playlist_to_modify} not found in Spotify, creating it now...")
        sp.create_playlist(playlist_to_modify)

    # 4. Add each song from youtube to spotify playlist
    print(f"(Step 2) Syncing {pl_info['title']}, {pl_info['id']} to Spotify...")
    t_to_sync_yt = yt.get_playlist_items(pl_info['id'], db)

    t_to_sync_sp = []
    for track in t_to_sync_yt:
        if track.get('is_unplayable'):
            t_to_sync_sp.append({
                "name": track['title'],
                "artist": track['artist'],
                "status": "not_found",
                "sp_id": None,
                "requires_manual_search": True,
                "reason": "Unplayable video on YouTube. Search for a replacement?"
            })
            continue

        song = track['title']
        artists = track['artist']

        result = sp.search_auto(song, artists)

        if result is not None:
            t_to_sync_sp.append({
                "name": song,
                "artist": artists,
                "status": "found",
                "sp_id": result[0],
                "sp_title": result[3],
                "sp_artist": result[4],
                "requires_manual_search": False
            })
        else:
            t_to_sync_sp.append({
                "name": song,
                "artist": artists,
                "status": "not_found",
                "sp_id": None,
                "requires_manual_search": True
            })
            
    return t_to_sync_sp