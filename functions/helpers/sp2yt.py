from functions.sp_provider import SpotifyProvider
from functions.yt_provider import YoutubeProvider
from dotenv import load_dotenv

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os

# load_dotenv()

# sp_client_id = os.getenv("SP_CLIENT_ID")
# sp_client_secret = os.getenv("SP_CLIENT_SECRET")

# yt_client_id = os.getenv("YT_CLIENT_ID")
# yt_project_id = os.getenv("YT_PROJECT_ID")
# yt_auth_uri = os.getenv("YT_AUTH_URI")
# yt_token_uri = os.getenv("YT_TOKEN_URI")
# yt_auth_provider_x509_cert_url = os.getenv("YT_AUTH_PROVIDER_X509_CERT_URL")
# yt_client_secret = os.getenv("YT_CLIENT_SECRET")
# yt_redirect_uri = os.getenv("YT_REDIRECT_URIS")

# print(f"Client ID: {yt_client_id}")
# print(f"Project ID: {yt_project_id}")
# print(f"Auth URI: {yt_auth_uri}")
# print(f"Token URI: {yt_token_uri}")
# print(f"Auth Provider X509 Cert URL: {yt_auth_provider_x509_cert_url}")
# print(f"Client Secret: {yt_client_secret}")
# print(f"Redirect URIs: {yt_redirect_uri}")

# init spotify and youtube providers (TODO: fix YoutubeProvider not working)

# flow = InstalledAppFlow.from_client_config(
#     {
#         "web": {
#             "client_id": yt_client_id,
#             "project_id": yt_project_id,
#             "auth_uri": yt_auth_uri,
#             "token_uri": yt_token_uri,
#             "auth_provider_x509_cert_url": yt_auth_provider_x509_cert_url,
#             "client_secret": yt_client_secret,
#             "redirect_uris": [yt_redirect_uri],
#         }
#     },
#     scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube']
# )

# credentials = flow.run_local_server(port=3000)

# youtube = build('youtube', 'v3', credentials=credentials)
yt = YoutubeProvider()
spp = SpotifyProvider()

# intro sequence

print("welcome to Syncer!")
for item in spp.get_playlists(): # 1. retrieve spotify playlists
    print(f"Playlist Name: {item[0]}, Playlist ID: {item[1]}")
playlist_to_modify = input("(Step 1) Choose a playlist to sync from:")

# 2. get information about the playlist
print(spp.get_playlist_by_name(playlist_to_modify)['name'])

# 3. check if same playlist exists in youtube, if not then make it
if yt.get_playlist_by_name(playlist_to_modify) is None:
    print(f"Playlist {playlist_to_modify} not found in YouTube, creating it now...")
    yt.create_playlist(playlist_to_modify)

# for item in spp.get_playlist_items(playlist_to_modify):
    
