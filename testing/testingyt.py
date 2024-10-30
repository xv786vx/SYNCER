from src.functions.helpers.yt_provider import YoutubeProvider
from src.functions.helpers.sp_provider import SpotifyProvider

yt = YoutubeProvider()
#sp = SpotifyProvider()
pl_id = "PLNEK6awsEHdszDF43-QRd8Re35pSFwUpG"
test_id = yt.get_playlist_items(pl_id)[0]['id']
print(test_id)

yt.download_song(test_id)
# for track in t_to_sync_yt:
#     print(track['title'])
#     print(track['artist'])
#     print(track['id'])

# works type shi
# song = tracks_to_sync[0]['title']
# artists = tracks_to_sync[0]['artist']
# print(f"Song ID: {yt.search(song, artists)}")
# print()
# yt.add_to_playlist(yt.get_playlist_by_name(pl_info['title'])['id'], yt.search(song, artists))