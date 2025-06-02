from helpers.yt_provider import YoutubeProvider

def download_yt_playlist(song_name, artists, user_id):
    yt = YoutubeProvider(user_id)
    yt.download_song(yt.search_manual(song_name, artists))