from src.functions.helpers.yt_provider import YoutubeProvider

def download_yt_song(song_name, artists):
    print("Downloading YouTube song...")
    yt = YoutubeProvider()
    video_id = yt.search_manual(song_name, artists)
    if video_id:
        yt.download_song(video_id)
        print("Download complete!")
    else:
        print(f"Could not find the song '{song_name}' by '{artists}'.")