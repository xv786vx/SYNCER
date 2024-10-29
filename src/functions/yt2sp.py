from helpers.sp_provider import SpotifyProvider
from helpers.yt_provider import YoutubeProvider

yt = YoutubeProvider()
sp = SpotifyProvider()

# intro sequence

print("welcome to Syncer!")
playlist_to_modify = input("(Step 1) Choose a YOUTUBE playlist to sync from: ")

# 2. get information about the playlist
pl_info = yt.get_playlist_by_name(playlist_to_modify)
print(f"YOUTUBE playlist chosen: {pl_info['title']}")

# 3. check if same playlist exists in spotify, if not then make it
print(f"Checking if {pl_info['title']} exists in Spotify account...")
if sp.get_playlist_by_name(playlist_to_modify) is None:
    print(f"Playlist {playlist_to_modify} not found in Spotify, creating it now...")
    sp.create_playlist(playlist_to_modify)
    
# 4. Add each song from youtube to spotify playlist
print(f"(Step 2) Syncing {pl_info['title']}, {pl_info['id']} to Spotify...")
t_to_sync_yt = yt.get_playlist_items(pl_info['id'])

t_to_sync_sp = []
for track in t_to_sync_yt:
    song = track['title']
    artists = track['artist']
    video_id = track['id']
    # print(f"YT: {song}, {artists}")
    # print(f"SP: {sp.searchv2(song, artists)[0]['name']}, {sp.searchv2(song, artists)[1]}...")
    result = sp.search_auto(song, artists)
    if result is not None:
        t_to_sync_sp.append(result[0])
    else:
        print(f"A suitable match for <{song}> by <{artists}> was not found.")
        choice = int(input(f"Would you like to (1) Smart Sync (NOT IMPLEMENTED), (2) manually search the song, or (3) skip? "))
        if choice == 1:
            sp.add_to_playlist(sp.get_playlist_by_name(pl_info['title'])['id'], t_to_sync_sp)
            t_to_sync_sp.clear()
            yt.download_song(video_id)
            print("The song has been downloaded to your Downloads folder!")
            print(" Please add it to your local files on Spotify, then to the playlist you wish to sync before continuing.")
            input("Press Enter to continue...")
        
        elif choice == 2:
            song = input("Enter the song title: ")
            artists = input("Enter the artist(s): ")
            result = sp.search_manual(song, artists)
            t_to_sync_sp.append(result)

        else:
            continue
                
    
sp.add_to_playlist(sp.get_playlist_by_name(pl_info['title'])['id'], t_to_sync_sp)