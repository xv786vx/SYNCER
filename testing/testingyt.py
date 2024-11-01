from src.functions.helpers.yt_provider import YoutubeProvider
from src.functions.helpers.sp_provider import SpotifyProvider

yt = YoutubeProvider()
#sp = SpotifyProvider()
# pl_id = "PLNEK6awsEHdszDF43-QRd8Re35pSFwUpG"
# test_id = yt.get_playlist_items(pl_id)[0]['id']
# print(test_id)

# yt.download_song(test_id)

print(yt.search_auto('Be Natural', 'red velvet taeyong'))
