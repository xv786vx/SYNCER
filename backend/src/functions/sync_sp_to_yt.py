from src.functions.helpers.sp_provider import SpotifyProvider
from src.functions.helpers.yt_provider import YoutubeProvider


def sync_sp_to_yt(playlist_to_modify, sp: SpotifyProvider, db):
    yt = YoutubeProvider(sp.user_id)

    # Use the provided SpotifyProvider instance
    pl_info = sp.get_playlist_by_name(playlist_to_modify)
    if pl_info is None:
        print(f"Could not find or access playlist '{playlist_to_modify}'")
        return

    print(f"SPOTIFY playlist chosen: {pl_info['title']}")

    # 3. check if same playlist exists in youtube, if not then make it
    print(f"Checking if {pl_info['title']} exists in YouTube account...")
    if yt.get_playlist_by_name(playlist_to_modify, db) is None:
        print(f"Playlist {playlist_to_modify} not found in YouTube, creating it now...")
        yt.create_playlist(playlist_to_modify, db)

    # 4. Add each song from spotify to youtube playlist
    print(f"(Step 2) Syncing {pl_info['title']}, {pl_info['id']} to Youtube...")
    t_to_sync_sp = sp.get_playlist_items(pl_info['id'])

    t_to_sync_yt = []
    for track in t_to_sync_sp:
        song = track['title']
        artists = track['artist']

        result = yt.search_auto(song, artists)

        if result is not None:
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
                "requires_manual_search": True
            })

    return t_to_sync_yt


# test case: Free Kutter (feat. Jay Electronica)

