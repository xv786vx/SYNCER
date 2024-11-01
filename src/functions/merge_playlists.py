from src.functions.helpers.sp_provider import SpotifyProvider
from src.functions.helpers.yt_provider import YoutubeProvider

def merge_playlists(yt_name, sp_name, merge_name):
    yt = YoutubeProvider()
    sp = SpotifyProvider()

    ytp, spp = yt.get_playlist_by_name(yt_name), sp.get_playlist_by_name(sp_name)
    sp_pl_songs, yt_pl_songs = sp.get_playlist_items(spp['id']), yt.get_playlist_items(ytp['id'])
    
    sp_song_ids = [song['id'] for song in sp_pl_songs]
    sp_song_names = [[song['title'], song['artist']] for song in sp_pl_songs]
    yt_song_ids = [song['id'] for song in yt_pl_songs]
    yt_song_names = [[song['title'], song['artist']] for song in yt_pl_songs]



    # merge the playlists on SPOTIFY
    sp.create_playlist(merge_name)
    merge_id = sp.get_playlist_by_name(merge_name)['id']
    sp.add_to_playlist(merge_id, sp_song_ids)

    need_to_add = []
    for song in yt_song_names:
        result = sp.search_auto(song[0], song[1])
        if result is not None:
            need_to_add.append(result[0])
        else:
            print(f"A suitable match for <{song[0]}> by <{song[1]}> was not found.")
            choice = int(input(f"Would you like to (1) manually search the song, or (2) skip? "))
            if choice == 1:
                song = input("Enter the song title: ")
                artists = input("Enter the artist(s): ")
                result = sp.search_manual(song, artists)
                need_to_add.append(result)
            
            else:
                continue   
    sp.add_to_playlist(merge_id, need_to_add)



    # merge the playlists on YOUTUBE
    yt.create_playlist(merge_name)
    merge_id = yt.get_playlist_by_name(merge_name)['id']
    yt.add_to_playlist(merge_id, yt_song_ids)

    need_to_add = []
    for song in sp_song_names:
        result = yt.search_auto(song[0], song[1])
        if result is not None:
            need_to_add.append(result[0])
        else:
            print(f"A suitable match for <{song[0]}> by <{song[1]}> was not found.")
            choice = int(input(f"Would you like to (1) manually search the song, or (2) skip? "))
            if choice == 1:
                song = input("Enter the song title: ")
                artists = input("Enter the artist(s): ")
                result = yt.search_manual(song, artists)
                need_to_add.append(result)
            
            else:
                continue
    yt.add_to_playlist(merge_id, need_to_add)
