import os
from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
import yt_dlp
from youtubesearchpython import VideosSearch
import json
from .provider import Provider
from .provider import preprocess_title, fuzzy_match
load_dotenv()
from src.db.youtube_token import get_youtube_token, save_youtube_token
from src.db.youtube_quota import increment_quota



yt_client_id = os.getenv("YT_CLIENT_ID")
yt_project_id = os.getenv("YT_PROJECT_ID")
yt_auth_uri = os.getenv("YT_AUTH_URI")
yt_token_uri = os.getenv("YT_TOKEN_URI")
yt_auth_provider_x509_cert_url = os.getenv("YT_AUTH_PROVIDER_X509_CERT_URL")
yt_client_secret = os.getenv("YT_CLIENT_SECRET")
yt_redirect_uri = os.getenv("YT_REDIRECT_URIS")

class YoutubeProvider(Provider):
    # Remove in-memory token_store if it's not used elsewhere,
    # or ensure it's properly managed if it's a cache.
    # For now, we assume direct DB access for tokens.

    def __init__(self, user_id):
        if not user_id:
            raise ValueError("YoutubeProvider requires a user_id for token management!")
        self.user_id = user_id
        print(f"[YTProvider] Using user_id: {self.user_id}")
        scopes = ['https://www.googleapis.com/auth/youtube.readonly',
                  'https://www.googleapis.com/auth/youtube']

        # CLIENT_SECRETS_FILE logic can remain as it's for the app's credentials
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        token_dir = os.path.join(root_dir, 'src', 'auth_tokens') # This might still be needed for CLIENT_SECRETS_FILE
        os.makedirs(token_dir, exist_ok=True)
        CLIENT_SECRETS_FILE = os.path.join(token_dir, 'desktop_client_secrets.json')

        if not os.path.exists(CLIENT_SECRETS_FILE):
            print("[YTProvider] Creating client_secrets.json file from environment variables...")
            # ... (rest of client_secrets.json creation logic remains unchanged)
            yt_client_id = os.getenv("YT_CLIENT_ID")
            yt_project_id = os.getenv("YT_PROJECT_ID")
            yt_auth_uri = os.getenv("YT_AUTH_URI")
            yt_token_uri = os.getenv("YT_TOKEN_URI")
            yt_auth_provider_x509_cert_url = os.getenv("YT_AUTH_PROVIDER_X509_CERT_URL")
            yt_client_secret = os.getenv("YT_CLIENT_SECRET")
            yt_redirect_uri = os.getenv("YT_REDIRECT_URIS")
            redirect_uris = [uri.strip() for uri in yt_redirect_uri.split(',')]
            client_secrets = {
                "web": {
                    "client_id": yt_client_id,
                    "project_id": yt_project_id,
                    "auth_uri": yt_auth_uri,
                    "token_uri": yt_token_uri,
                    "auth_provider_x509_cert_url": yt_auth_provider_x509_cert_url,
                    "client_secret": yt_client_secret,
                    "redirect_uris": redirect_uris
                }
            }
            with open(CLIENT_SECRETS_FILE, 'w') as f:
                json.dump(client_secrets, f, indent=2)
            print(f"[YTProvider] Wrote client_secrets.json to: {CLIENT_SECRETS_FILE}")
            with open(CLIENT_SECRETS_FILE, 'r') as f:
                print("[YTProvider] Actual client_secrets.json file content:")
                print(f.read())
        
        print(f"[YTProvider] Initializing YouTube client for user {self.user_id}")
        self.youtube = None
        credentials = self.load_credentials_from_db()

        if credentials:
            print(f"[YTProvider] Found credentials for user {self.user_id}")
            if credentials.expired and credentials.refresh_token:
                try:
                    print(f"[YTProvider] Attempting to refresh YouTube token for user {self.user_id}...")
                    credentials.refresh(Request())
                    self.save_credentials_to_db(credentials) # Save refreshed token
                    print(f"[YTProvider] Token refreshed and saved for user {self.user_id}.")
                except RefreshError as e:
                    print(f"[YTProvider] Failed to refresh token for user {self.user_id}: {e}")
                    credentials = None 
                except Exception as e:
                    print(f"[YTProvider] An unexpected error occurred during token refresh for user {self.user_id}: {e}")
                    credentials = None
            else:
                print(f"[YTProvider] Credentials are valid and not expired for user {self.user_id}")
        else:
            print(f"[YTProvider] No credentials found for user {self.user_id}")

        if credentials and credentials.valid:
            try:
                self.youtube = build('youtube', 'v3', credentials=credentials)
                print(f"[YTProvider] YouTube API client built successfully for user {self.user_id}.")
            except Exception as e:
                print(f"[YTProvider] Error building YouTube API client for user {self.user_id}: {e}")
                self.youtube = None
        else:
            print(f"[YTProvider] No valid credentials available for user {self.user_id}")

    def load_credentials_from_db(self):
        """Load credentials from the database for the current user_id."""
        print(f"[YTProvider] Loading YouTube token from DB for user_id: {self.user_id}")
        token_json = get_youtube_token(self.user_id)
        if token_json:
            try:
                token_data = json.loads(token_json)
                print(f"[YTProvider] Successfully parsed token JSON for user_id: {self.user_id}")
                print(f"[YTProvider] Token data: {json.dumps(token_data, indent=2)}")
                creds = Credentials.from_authorized_user_info(token_data)
                print(f"[YTProvider] Successfully created Credentials object for user_id: {self.user_id}")
                print(f"[YTProvider] Token valid: {creds.valid}")
                print(f"[YTProvider] Token expired: {creds.expired}")
                print(f"[YTProvider] Has refresh token: {bool(creds.refresh_token)}")
                return creds
            except json.JSONDecodeError as e:
                print(f"[YTProvider] Failed to parse token JSON from DB for user_id {self.user_id}: {e}")
            except Exception as e:
                print(f"[YTProvider] Failed to create Credentials object from DB token for user_id {self.user_id}: {e}")
        else:
            print(f"[YTProvider] No token found in DB for user_id: {self.user_id}")
        return None

    def save_credentials_to_db(self, credentials):
        """Save credentials to the database for the current user_id."""
        print(f"Saving YouTube token to DB for user_id: {self.user_id}")
        try:
            # credentials.to_json() returns a string, which is what save_youtube_token expects
            save_youtube_token(self.user_id, credentials.to_json())
            print(f"Successfully saved token to DB for user_id: {self.user_id}")
        except Exception as e:
            print(f"Failed to save token to DB for user_id {self.user_id}: {e}")

    def _check_authenticated(self):
        """Check if the YouTube client is authenticated and ready to use."""
        print(f"[YTProvider] Checking authentication status for user {self.user_id}")
        if not hasattr(self, 'youtube') or self.youtube is None:
            print(f"[YTProvider] YouTube client not initialized for user {self.user_id}")
            return False
        
        try:
            # Try to make a simple API call to verify the token is valid
            request = self.youtube.playlists().list(part="snippet", mine=True, maxResults=1)
            response = request.execute()
            print(f"[YTProvider] Successfully verified YouTube token for user {self.user_id}")
            return True
        except Exception as e:
            print(f"[YTProvider] Error verifying YouTube token for user {self.user_id}: {e}")
            # Check if the error is specifically an authentication error
            if hasattr(e, 'resp') and hasattr(e.resp, 'status'):
                if e.resp.status in [401, 403]:
                    print(f"[YTProvider] Authentication error detected for user {self.user_id}")
                    return False
            # For other errors, we'll assume the token is still valid
            print(f"[YTProvider] Non-auth error during token verification for user {self.user_id}, assuming token is valid")
            return True

    def search_auto(self, track_name, artists) -> list:
        """algorithmically processes track_name and artists from Spotify to search for equivalent Youtube video."""
        if not self._check_authenticated():
            raise Exception("YouTube authentication required. Please authenticate via the web flow.")
        
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
            try:
                search = VideosSearch(query, limit=10)
                search_result = search.result()

                # Defensive check against None or malformed responses
                if not search_result or 'result' not in search_result:
                    print(f"YouTube search returned no result for query: {query}")
                    continue

                response = search_result['result']
                if response is None:
                    print(f"YouTube search returned 'result: None' for query: {query}")
                    continue

            except Exception as e:
                print(f"An exception occurred during YouTube search for query '{query}': {e}")
                continue

            for item in response:
                if not item or not isinstance(item, dict):
                    continue

                yt_video_title = item.get('title')
                yt_channel_info = item.get('channel')
                video_id = item.get('id')

                # Ensure essential fields are present
                if not all([yt_video_title, yt_channel_info, video_id]):
                    continue

                yt_channel_name = yt_channel_info.get('name')
                if not yt_channel_name:
                    continue
                
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

        
    def search_manual(self, track_name, artists) -> list:
        """given a user's input, manually search for a track on Youtube.

        Args:
            track_name (str): a user's desired song title.
            artists (str): a user's dsired artist name (WIP INPUTTING MULTIPLE ARTISTS).

        Returns:
            list: returns a list of potential matches, each a dict with video details.
        """

        clean_sp_title = preprocess_title(track_name, artists)
        query = f"{clean_sp_title} {artists}"

        search = VideosSearch(query, limit=6)
        response = search.result().get('result', [])

        results = []
        if response:
            for item in response:
                results.append({
                    "yt_id": item['id'],
                    "title": item['title'],
                    "artist": item['channel']['name'],
                    "thumbnail": item['thumbnails'][0]['url']
                })
            return results
        else:
            print("err: no items returned")
            return []
        
    
    def get_playlists(self, db):
        self._check_authenticated()
        """Obtains a list of the user's Youtube playlists"""
        try: # Add try...except here for detailed error on this specific call
            print("Attempting to execute self.youtube.playlists().list...")
            request = self.youtube.playlists().list(part="snippet", mine=True, maxResults=50) # Added maxResults

            # increment_quota("playlists.list")  # playlists.list costs 1 unit
            increment_quota(db, count=1)


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
    

    def get_playlist_by_name(self, playlist_name, db):
        """given a Youtube playlist name, return the playlist's information."""
        if not self._check_authenticated():
            raise Exception("YouTube authentication required.")
        
        print("Attempting to execute self.youtube.playlists().list...")
        try:
            request = self.youtube.playlists().list(
                part="snippet,contentDetails",
                mine=True,
                maxResults=50
            )
            
            while request:
                response = request.execute()
                increment_quota(db, 1) 

                for playlist in response.get('items', []):
                    if playlist['snippet']['title'].lower() == playlist_name.lower():
                        return {
                            'id': playlist['id'],
                            'title': playlist['snippet']['title'],
                            'description': playlist['snippet'].get('description', ''),
                            'itemCount': playlist['contentDetails']['itemCount']
                        }
                
                request = self.youtube.playlists().list_next(request, response)

            return None
        except Exception as e:
            print(f"Failed to get playlists: {e}")
            return None


    def get_playlist_items(self, playlist_id, db):
        """given a playlist id, return a list of all tracks in it.
        
        Args:
            playlist_id (str): a valid Youtube playlist id.

        Returns:
           list[dict]: [{'title': track title, 'id': track id, 'artist': track artist}, ...]
        """
        tracks_info = []
        
        request = self.youtube.playlistItems().list(part="snippet", playlistId=playlist_id, maxResults=25)
    
        while request:
            response = request.execute()

            # increment_quota("playlistItems.list")  # playlistItems.list costs 1 unit
            increment_quota(db, count=1)
            
            # Add the current batch of items to the playlist_items list
            for item in response['items']:
                snippet = item.get('snippet')
                if snippet and snippet.get('resourceId') and snippet.get('resourceId', {}).get('videoId'):
                    tracks_info.append({
                        'title': snippet.get('title', 'Untitled'),
                        'id': snippet['resourceId']['videoId'],
                        'artist': snippet.get('videoOwnerChannelTitle', 'Unknown Artist'),
                        'is_unplayable': False
                    })
                else:
                    tracks_info.append({
                        'title': 'Unplayable/Deleted Video',
                        'id': None,
                        'artist': 'N/A',
                        'is_unplayable': True
                    })
            
            # Check if there's a next page
            request = self.youtube.playlistItems().list_next(request, response)
    
        return tracks_info
    

    def add_to_playlist(self, playlist_id, item_ids, db) -> None:
        self._check_authenticated()
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

            # increment_quota("playlistItems.insert")
            increment_quota(db, count=50)
    

    def create_playlist(self, playlist_name, db):
        self._check_authenticated()
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

        # increment_quota("playlists.insert")
        increment_quota(db, count=50)

        print(f"Created YouTube playlist: {response['snippet']['title']} with ID: {response['id']}")
        return response
    

    def download_song(self, track_id):
        self._check_authenticated()
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
        self._check_authenticated()
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

    def get_playlist_track_count(self, playlist_name, db):
        """given a YouTube playlist name, return the number of tracks."""
        playlist = self.get_playlist_by_name(playlist_name, db)
        if playlist and 'itemCount' in playlist:
            return playlist['itemCount']
        return None