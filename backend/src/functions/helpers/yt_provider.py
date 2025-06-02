from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
import yt_dlp
from youtubesearchpython import VideosSearch
import json
import uuid  # Import the uuid module

from .provider import Provider
from .provider import preprocess_title, fuzzy_match

from .quota_tracker import increment_quota

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
    # In-memory token storage
    token_store = {}

    def __init__(self, user_id):
        if not user_id:
            raise ValueError("YoutubeProvider requires a user_id for token management!")
        self.user_id = user_id
        print(f"[YTProvider] Using user_id: {self.user_id}")
        scopes = ['https://www.googleapis.com/auth/youtube.readonly',
                  'https://www.googleapis.com/auth/youtube']

        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        token_dir = os.path.join(root_dir, 'src', 'auth_tokens')
        os.makedirs(token_dir, exist_ok=True)
        CLIENT_SECRETS_FILE = os.path.join(token_dir, 'desktop_client_secrets.json')
        self.token_file = os.path.join(token_dir, f"{self.user_id}-yttoken.json")
        print(f"[YTProvider] Token file: {self.token_file}")

        # Create client_secrets JSON if it doesn't exist
        if not os.path.exists(CLIENT_SECRETS_FILE):
            print("Creating client_secrets.json file from environment variables...")
            redirect_uris = yt_redirect_uri.split(',')
            with open(CLIENT_SECRETS_FILE, 'w') as f:
                f.write(f'''{{
                    "web": {{
                        "client_id": "{yt_client_id}",
                        "project_id": "{yt_project_id}",
                        "auth_uri": "{yt_auth_uri}",
                        "token_uri": "{yt_token_uri}",
                        "auth_provider_x509_cert_url": "{yt_auth_provider_x509_cert_url}",
                        "client_secret": "{yt_client_secret}",
                        "redirect_uris": {redirect_uris}
                    }}
                }}''')

        credentials = self.load_credentials_from_memory()

        if credentials and credentials.expired and credentials.refresh_token:
            try:
                print("Refreshing expired YouTube token...")
                credentials.refresh(Request())
                self.save_credentials_to_memory(credentials)
                print("Token refreshed successfully.")
            except RefreshError as e:
                print(f"Failed to refresh token: {e}")
                credentials = None

        if not credentials or not credentials.valid:
            print("Starting new YouTube authentication flow using client secrets file...")
            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    CLIENT_SECRETS_FILE,
                    scopes=scopes
                )

                credentials = flow.run_local_server(
                    port=0,
                    access_type='offline',
                    prompt='consent'
                )

                self.save_credentials_to_memory(credentials)
                print("New authentication successful! Token saved.")

            except Exception as e:
                print(f"Authentication failed: {e}")
                raise

        try:
            self.youtube = build('youtube', 'v3', credentials=credentials)
            print("YouTube API client built successfully.")
        except Exception as e:
            print(f"Error building YouTube API client: {e}")
            raise

    def load_credentials_from_memory(self):
        """Load credentials from a user-specific file in the 'src/auth_tokens' folder."""
        if os.path.exists(self.token_file):
            try:
                with open(self.token_file, 'r') as f:
                    token_data = json.load(f)
                return Credentials.from_authorized_user_info(token_data)
            except Exception as e:
                print(f"Failed to load credentials from file: {e}")
        return None

    def save_credentials_to_memory(self, credentials):
        """Save credentials to a user-specific file in the 'src/auth_tokens' folder."""
        os.makedirs(os.path.dirname(self.token_file), exist_ok=True)
        try:
            with open(self.token_file, 'w') as f:
                json.dump(json.loads(credentials.to_json()), f)
            print(f"Credentials saved to {self.token_file}")
        except Exception as e:
            print(f"Failed to save credentials to file: {e}")

    def search_auto(self, track_name, artists) -> list:
        """algorithmically processes track_name and artists from Spotify to search for equivalent Youtube video."""
        
        # Try multiple search strategies
        search_queries = [
            f"{track_name} {artists}",
            f"{preprocess_title(track_name)} {artists}",
            f"{track_name}",  # Sometimes artist in title is enough
            f"{artists} {track_name}",  # Try artist first
        ]
        
        best_match = ["", 0, 0, "", ""]  # [video_id, title_score, artist_score, video_title, channel_name]
        all_videos_found = []
        
        for query in search_queries:
            search = VideosSearch(query, limit=10)
            response = search.result().get('result', [])
            
            if not response:
                continue
            
            for item in response:
                yt_video_title = item['title']
                yt_channel_name = item['channel']['name']
                video_id = item['id']
                
                # Skip if we've already seen this video
                if video_id in [v[0] for v in all_videos_found]:
                    continue
                
                # Multiple scoring approaches for title
                title_scores = []
                
                # Direct fuzzy match
                title_scores.append(fuzzy_match(yt_video_title.lower(), track_name.lower()))
                
                # Clean title match (without feat/ft parts and other keywords)
                clean_yt_title = preprocess_title(yt_video_title, yt_channel_name)
                clean_sp_title = preprocess_title(track_name, artists)
                title_scores.append(fuzzy_match(clean_yt_title, clean_sp_title))
                
                # Handle featured artists in track names
                if '(' in track_name and ('feat' in track_name.lower() or 'ft' in track_name.lower()):
                    main_title = track_name.split('(')[0].strip()
                    title_scores.append(fuzzy_match(yt_video_title.lower(), main_title.lower()))
                
                # Handle YouTube-specific title patterns
                yt_title_clean = yt_video_title.lower()
                for suffix in [' official video', ' official audio', ' music video', ' mv', ' lyrics']:
                    if yt_title_clean.endswith(suffix):
                        yt_title_clean = yt_title_clean[:-len(suffix)].strip()
                title_scores.append(fuzzy_match(yt_title_clean, track_name.lower()))
                
                # Check if track titles contain similar words
                yt_words = set(yt_video_title.lower().replace('(', ' ').replace(')', ' ').split())
                sp_words = set(track_name.lower().replace('(', ' ').replace(')', ' ').split())
                common_words = yt_words & sp_words
                if len(common_words) > 0:
                    word_score = (len(common_words) / max(len(yt_words), len(sp_words))) * 100
                    title_scores.append(word_score)
                
                title_score = max(title_scores)
                
                # Artist matching with multiple approaches
                artist_scores = []
                
                # Direct channel name matching
                artist_scores.append(fuzzy_match(yt_channel_name.lower(), artists.lower()))
                
                # Check if artist name appears in video title
                if artists.lower() in yt_video_title.lower():
                    artist_scores.append(90)
                
                # Check individual artist words in title or channel
                for artist_word in artists.lower().split():
                    if len(artist_word) > 2:
                        if artist_word in yt_video_title.lower():
                            artist_scores.append(85)
                        if artist_word in yt_channel_name.lower():
                            artist_scores.append(75)
                
                # Handle artist variations
                clean_channel = yt_channel_name.lower()
                for suffix in [' official', ' vevo', ' records', ' music']:
                    if clean_channel.endswith(suffix):
                        clean_channel = clean_channel[:-len(suffix)].strip()
                artist_scores.append(fuzzy_match(clean_channel, artists.lower()))
                
                # Handle multiple artists
                if ',' in artists:
                    for artist in artists.split(','):
                        artist = artist.strip()
                        if artist.lower() in yt_channel_name.lower() or artist.lower() in yt_video_title.lower():
                            artist_scores.append(80)
                
                artist_score = max(artist_scores) if artist_scores else 0
                
                # Calculate total score
                total_score = 0.7 * title_score + 0.3 * artist_score
                
                # Store all videos
                all_videos_found.append((video_id, title_score, artist_score, yt_video_title, yt_channel_name, total_score))
                
                # Update best match
                best_total_score = 0.7 * best_match[1] + 0.3 * best_match[2]
                if total_score > best_total_score:
                    best_match = [video_id, title_score, artist_score, yt_video_title, yt_channel_name]
        
        # Check thresholds
        if best_match[1] >= 60 and best_match[2] >= 40:
            print(f"final song title (yt): {best_match[3]}, song title (sp): {track_name}")
            print(f"final artist names (yt): {best_match[4]}, artist names (sp): {artists}")
            print("")
            return best_match
        elif best_match[1] >= 80:
            print(f"final song title (yt): {best_match[3]}, song title (sp): {track_name}")
            print(f"final artist names (yt): {best_match[4]}, artist names (sp): {artists}")
            print("")
            return best_match
        else:
            print("no suitable match found.")
            return None

        
    def search_manual(self, track_name, artists) -> str:
        """given a user's input, manually search for a track on Youtube.

        Args:
            track_name (str): a user's desired song title.
            artists (str): a user's dsired artist name (WIP INPUTTING MULTIPLE ARTISTS).

        Returns:
            str: returns ONLY the Youtube video id if a suitable match is found, else None.
        """

        clean_sp_title = preprocess_title(track_name, artists)
        query = f"{clean_sp_title} {artists}"

        search = VideosSearch(query, limit=6)
        response = search.result().get('result', [])

        if response:
            item = response[0]
            return item['id']
        else:
            print("err: no items returned")
            return None
        
    
    def get_playlists(self):
        """Obtains a list of the user's Youtube playlists"""
        try: # Add try...except here for detailed error on this specific call
            print("Attempting to execute self.youtube.playlists().list...")
            request = self.youtube.playlists().list(part="snippet", mine=True, maxResults=50) # Added maxResults

            increment_quota('playlists.list')

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
                    'image': pl.get('image', None),
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

            increment_quota("playlistItems.list")
            
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

            increment_quota("playlistItems.insert")
    

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

        increment_quota("playlists.insert")

        print(f"Created YouTube playlist: {response['snippet']['title']} with ID: {response['id']}")
        return response
    

    def download_song(self, track_id):
        """Downloads a song from Youtube given a video ID."""
        url = f"https://www.youtube.com/watch?v={track_id}"
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': f'songs/%(title)s.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': False,
            'noplaylist': True,
        }

        try:
            os.makedirs('songs', exist_ok=True)
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            print(f"Downloaded song from {url}")
        except Exception as e:
            print(f"Failed to download song from {url}. Error: {e}")


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