from src.functions.helpers.yt_provider import YoutubeProvider

def download_yt_song(song_name, artists):
    print("Downloading YouTube song...")
    yt = YoutubeProvider()
    video_id = yt.search_manual(song_name, artists)
    if video_id:
        yt.download_song(video_id)
        return f"Downloaded '{song_name}' by '{artists}' successfully!"

    else:
        return f"Could not find the song '{song_name}' by '{artists}'."
    
# Currently, this function downloads the song to the current working directory, NOT the user's music folder / downloads.
# For this reason, the function is not used in the app (right now).