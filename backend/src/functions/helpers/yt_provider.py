from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
import yt_dlp
import json

from .provider import Provider
from .provider import preprocessv2, preprocessv3, preprocessv4, fuzzy_matchv3

import os
from dotenv import load_dotenv

load_dotenv()

yt_client_id = os.getenv("YT_CLIENT_ID")
yt_project_id = os.getenv("YT_PROJECT_ID")
yt_auth_uri = os.getenv("YT_AUTH_URI")
yt_token_uri = os.getenv("YT_TOKEN_URI")
yt_auth_provider_x509_cert_url = os.getenv("YT_AUTH_PROVIDER_X509_CERT_URL")
yt_client_secret = os.getenv("YT_CLIENT_SECRET")
yt_redirect_uri = os.getenv("YT_REDIRECT_URIS")

class YoutubeProvider(Provider):
    def __init__(self):
        scopes =   ['https://www.googleapis.com/auth/youtube.readonly',
                    'https://www.googleapis.com/auth/youtube']
        

        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        token_dir = os.path.join(root_dir, 'auth_tokens')
        os.makedirs(token_dir, exist_ok=True)
        TOKEN_FILE = os.path.join(token_dir, 'token.json')
        CLIENT_SECRETS_FILE = os.path.join(token_dir, 'desktop_client_secrets.json')


        credentials = None
        
        # load credentials from token file if it exists
        if os.path.exists(TOKEN_FILE):
            try:
                print("Found existing token, attempting to use it...")
                credentials = Credentials.from_authorized_user_file(TOKEN_FILE, scopes=scopes)
                # Try refreshing ONLY if expired
                if credentials and credentials.expired and credentials.refresh_token:
                    try:
                        print("Refreshing expired token...")
                        credentials.refresh(Request())
                        print("Successfully refreshed existing token.")
                        # Save the refreshed credentials
                        with open(TOKEN_FILE, "w") as token_file:
                            token_file.write(credentials.to_json())
                    except RefreshError as re:
                        print(f"Refresh token failed during load: {re}. Deleting token and starting new auth flow.")
                        credentials = None
                        if os.path.exists(TOKEN_FILE):
                            os.remove(TOKEN_FILE)
                # --- ADDED: Check if token is valid even if not expired ---
                elif credentials and not credentials.valid:
                     print("Existing token is invalid. Deleting token and starting new auth flow.")
                     credentials = None
                     if os.path.exists(TOKEN_FILE):
                         os.remove(TOKEN_FILE)

            except Exception as e:
                print(f"Error loading credentials: {e}. Deleting token and starting new auth flow.")
                credentials = None
                if os.path.exists(TOKEN_FILE):
                    os.remove(TOKEN_FILE)
        # --- End of token loading ---

        # Start new auth flow if needed
        if not credentials or not credentials.valid:
            print("Starting new YouTube authentication flow using client secrets file...")
            try:
                if not os.path.exists(CLIENT_SECRETS_FILE):
                     raise FileNotFoundError(f"Client secrets file not found at {CLIENT_SECRETS_FILE}.")

                flow = InstalledAppFlow.from_client_secrets_file(
                    CLIENT_SECRETS_FILE,
                    scopes=scopes
                )

                credentials = flow.run_local_server(
                    port=0,
                    access_type='offline',
                    prompt='consent'
                )

                # --- REMOVED Immediate Refresh Check ---

                # Save the new credentials
                with open(TOKEN_FILE, "w") as token_file:
                    token_file.write(credentials.to_json())
                print("New authentication successful! Token saved.")

            except Exception as e:
                print(f"Authentication failed: {e}")
                raise

        # Build the YouTube API client ONCE
        try:
            self.youtube = build('youtube', 'v3', credentials=credentials)
            # --- REMOVED ALL API TESTS FROM __init__ ---
            print("YouTube API client built successfully.")
        except Exception as e:
            error_details = f"Error: {e}"
            if hasattr(e, 'resp') and hasattr(e.resp, 'status'):
                 error_details = f"Status: {e.resp.status}, Reason: {e.resp.reason}, Content: {e.content}"
            print(f"Error building YouTube API client: {error_details}")
            raise
        
        # Build the YouTube API client
        try:
            self.youtube = build('youtube', 'v3', credentials=credentials)
            # Test connection 1: Channels
            print("Testing YouTube API connection (Channels)...")
            test_request_channels = self.youtube.channels().list(part="snippet", mine=True, maxResults=1)
            test_response_channels = test_request_channels.execute()
            print("YouTube API connection successful (Channels)!")

            # --- ADDED: Test connection 2: Playlists ---
            print("Testing YouTube API connection (Playlists)...")
            test_request_playlists = self.youtube.playlists().list(part="snippet", mine=True, maxResults=1)
            test_response_playlists = test_request_playlists.execute()
            print("YouTube API connection successful (Playlists)!")
            # --- END OF ADDED TEST ---

        except Exception as e:
            error_details = f"Error: {e}"
            if hasattr(e, 'resp') and hasattr(e.resp, 'status'):
                 error_details = f"Status: {e.resp.status}, Reason: {e.resp.reason}, Content: {e.content}"
            # Be more specific about which test failed
            if 'test_request_playlists' in locals():
                 print(f"CRITICAL ERROR during Playlists API test after successful Channels test: {error_details}")
            elif 'test_request_channels' in locals():
                 print(f"Error connecting to YouTube API during initial Channels test: {error_details}")
            else:
                 print(f"Error building YouTube API client or during initial connection: {error_details}")
            raise
        
        # Build the YouTube API client
        # self.youtube = build('youtube', 'v3', credentials=credentials)


    def search_auto(self, track_name, artists) -> list:
        """algorithmically processes track_name and artists from Spotify to search for equivalent Youtube video.

        Args:
            track_name (str): the song title scraped from a given Spotify track.
            artists (str?): the artists scraped from a given Spotify track.

        Returns:
            list[]: returns a 
                [video id, track_name match score, artist match score, video title, artist names]
            if a suitable match is found, else None.
        """


        clean_track_name, artists = preprocessv3(track_name, artists)[0], preprocessv2(artists)
        query = f"{clean_track_name} {artists}"

        request = self.youtube.search().list(q=query, part="snippet", type="video", maxResults=1)
        response = request.execute()
        if response['items']:

            best_match = ["", 0, 0, "", ""]

            for item in response['items']:
                artist_names = preprocessv2(item['snippet']['channelTitle'])
                video_title, artist_names = preprocessv4(preprocessv2(item['snippet']['title']), artists, artist_names)
   
                track_names_match = max(fuzzy_matchv3(video_title, track_name), fuzzy_matchv3(video_title, clean_track_name))       
                artist_match = fuzzy_matchv3(artist_names, artists)


                if track_names_match >= best_match[1] and artist_match >= best_match[2]:
                    print(f"MATCH FOUND FOR {track_name} BY {artists}")
                    print(f"{video_title} BY {artist_names}")
                    best_match[0] = item['id']['videoId']
                    best_match[1] = track_names_match
                    best_match[2] = artist_match
                    best_match[3] = video_title
                    best_match[4] = artist_names

            if best_match[1] > 70 and best_match[2] > 65:
                print(f"final song title (yt): {best_match[3]}, song title (sp): {track_name.lower()}")
                print(f"final artist names (yt): {best_match[4]}, artist names (sp): {artists}")
                print("")
                return best_match
            
            else: 
                print("no suitable match found.")
                return None
        else:
            print("err: result didn't match given structure")
            input("Press Enter to continue...")
            return None

        
    def search_manual(self, track_name, artists) -> str:
        """given a user's input, manually search for a track on Youtube.

        Args:
            track_name (str): a user's desired song title.
            artists (str): a user's dsired artist name (WIP INPUTTING MULTIPLE ARTISTS).

        Returns:
            str: returns ONLY the Youtube video id if a suitable match is found, else None.
        """

        clean_track_name, artists = preprocessv2(track_name), preprocessv2(artists)

        query = f"{clean_track_name} {artists}"

        request = self.youtube.search().list(q=query, part="snippet", type="video", maxResults=6)
        response = request.execute()

        if response['items']:
            for item in response['items']:
                video_title = item['snippet']['title']
                artist_names = item['snippet']['channelTitle']
                
                # check if the video title or description contains the song title
                choice = input(f"Is this the song you were looking for? {video_title} by {artist_names} (y/n): ")
                if choice == 'y':
                    return item['id']['videoId']
                
                else:
                    continue
            # If you loop through all options and say 'n' to everything:
            print(f"Could not find the song '{track_name}' by '{artists}'.")
            return None
        else:
            print("err: result didn't match given structure")
            input("Press Enter to continue...")
            return None


    # def get_playlists(self):
    #     """Obtains a list of the user's Youtube playlists

    #     Returns:
    #         list[]: a list containing the name, id, description, and image of each playlist.
    #     """
    #     request = self.youtube.playlists().list(part="snippet", mine=True)
    #     response = request.execute()
    #     return [
    #         {
    #             'title': pl['snippet']['title'],
    #             'id': pl['id'],
    #             'description': pl['snippet'].get('description', ""),
    #             'image': pl['snippet']['thumbnails']['default']['url']
    #         }
    #         for pl in response.get("items", [])]
    
    def get_playlists(self):
        """Obtains a list of the user's Youtube playlists"""
        try: # Add try...except here for detailed error on this specific call
            print("Attempting to execute self.youtube.playlists().list...")
            request = self.youtube.playlists().list(part="snippet", mine=True, maxResults=50) # Added maxResults
            response = request.execute()
            print(f"Successfully executed playlists().list. Found {len(response.get('items', []))} items.")
            return [
                {
                    'title': pl['snippet']['title'],
                    'id': pl['id'],
                    'description': pl['snippet'].get('description', ""),
                    'image': pl['snippet']['thumbnails']['default']['url']
                }
                for pl in response.get("items", [])]
        except Exception as e:
             error_details = f"Error: {e}"
             if hasattr(e, 'resp') and hasattr(e.resp, 'status'):
                  error_details = f"Status: {e.resp.status}, Reason: {e.resp.reason}, Content: {e.content}"
             print(f"ERROR IN get_playlists during playlists().list execution: {error_details}")
             return None # Return None on error
    

    def get_playlist_by_name(self, playlist_name):
        """given a Youtube playlist name, return the playlist's information.

        Args:
            playlist_name (str): a playlist name to search for.

        Returns:
            dict: {'title': playlist name, 'id': playlist id, 'description': playlist description, 'image': playlist image}
        """
        playlists = self.get_playlists()
        if playlists is None:
            print(f"Could not retrieve playlists. Please check your authorization.")
            return None
        
        for pl in playlists:
            if pl['title'].lower() == playlist_name.lower():  # Case-insensitive comparison
                return {
                    'title': pl['title'],
                    'id': pl['id'],
                    'description': pl.get('description', ''),
                    'image': pl.get('thumbnail', None),
                }
        return None 


    def get_playlist_items(self, playlist_id):
        """Given a Youtube playlist id, return the track's title, artists and id of each track in the playlist.

        Args:
            playlist_id (str): a valid Youtube playlist id.

        Returns:
           list[dict]: [{'title': track title, 'id': track id, 'artist': track artist}, ...]
        """
        playlist_items = []
        request = self.youtube.playlistItems().list(part="snippet", playlistId=playlist_id, maxResults=25)
    
        while request:
            response = request.execute()
            
            # Add the current batch of items to the playlist_items list
            playlist_items.extend([
                {
                    'title': item['snippet']['title'],
                    'id': item['snippet']['resourceId']['videoId'],
                    'artist': item['snippet']['videoOwnerChannelTitle']
                }
                for item in response['items']
            ])
            
            # Check if there's a next page
            request = self.youtube.playlistItems().list_next(request, response)
    
        return playlist_items
    

    def add_to_playlist(self, playlist_id, item_ids) -> None:
        """add a list of videos (through id) to a Youtube playlist.

        Args:
            playlist_id (str): the playlist id corresponding to the playlist to add videos to.
            item_id (list[str]): a list of video ids to add to the playlist.

        Returns:
            None: only mutates the playlist.
        """
        for item_id in item_ids:
            request = self.youtube.playlistItems().insert(
                part="snippet",
                body={
                    "snippet": {
                        "playlistId": playlist_id,
                        "resourceId": {
                            "kind": "youtube#video",
                            "videoId": item_id
                        }
                    }
                }
            )
            request.execute()
    

    def create_playlist(self, playlist_name):
        """creates a YouTube playlist with the given name.

        Args:
            playlist_name (str): the desired playlist name.

        Returns:
            None?: only mutates the associated YouTube profile by making a playlist for them.
        """
        request = self.youtube.playlists().insert(
            part="snippet,status",
            body={
                "snippet": {
                    "title": playlist_name,
                    "description": "made with SYNCER!"
                },
                "status": {
                    "privacyStatus": "public"  # can be "private" or "unlisted"
                }
            }
        )
        response = request.execute()
        print(f"Created YouTube playlist: {response['snippet']['title']} with ID: {response['id']}")
        return response
    

    def download_song(self, track_id):
        """YT_PROVIDER EXCLUSIVE. Downloads a song from Youtube given a video id.
            ***FFMPEG IS REQUIRED FOR INSTALLATION, WORKING ON BUNDLING THIS INTO THE PACKAGE***

        Args:
            track_id (str): a track id corresponding to a Youtube video.
        """
        video_url = f"https://www.youtube.com/watch?v={track_id}"

        ydl_opts = {
            'format': 'bestaudio[ext=mp4]',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': 'Downloads/%(title)s.%(ext)s',
        }

        yt_dlp.YoutubeDL(ydl_opts).download([video_url])


    def download_playlist(self, playlist_id, playlist_name):
        """YT_PROVIDER EXCLUSIVE. Downloads a playlist from Youtube given a video id.
            ***FFMPEG IS REQUIRED FOR INSTALLATION, WORKING ON BUNDLING THIS INTO THE PACKAGE***

        Args:
            playlist_id (str): a playlist id corresponding to a Youtube playlist.
            playlist_name (str): the name of the playlist to download to.
        """
        playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
        dl_folder = os.makedirs(os.path.join('Downloads', f"{playlist_name}_from_SYNCER"), exist_ok=True)

        ydl_opts = {
            'format': 'bestaudio',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(dl_folder,'%(title)s.%(ext)s'),
            'noplaylist': False,  # Make sure to download the whole playlist
        }

        yt_dlp.YoutubeDL(ydl_opts).download([playlist_url]) 