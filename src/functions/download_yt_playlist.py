from src.functions.helpers.yt_provider import YoutubeProvider

def download_yt_playlist(song_name, artists):
    yt = YoutubeProvider()
    yt.download_song(yt.search_manual(song_name, artists))