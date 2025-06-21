import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyOauthError

from .provider import Provider
from .provider import tokenize, preprocess_title, fuzzy_match, is_match

import os
from dotenv import load_dotenv
from .spotify_db_cache import DatabaseCacheHandler
from src.db.spotify_token import get_spotify_token
import json

load_dotenv()

sp_client_id = os.getenv("SP_CLIENT_ID")
sp_client_secret = os.getenv("SP_CLIENT_SECRET")

class SpotifyProvider(Provider):
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.client_id = sp_client_id
        self.client_secret = sp_client_secret

        # Check if we're running on Render or locally
        is_render = os.environ.get("RENDER", "false").lower() == "true"

        if is_render:
            # If deployed, use the deployed URL (add this environment variable on Render)
            self.redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI", "https://syncer-26vh.onrender.com/callback")
            print(f"Running in deployed mode, using redirect URI: {self.redirect_uri}")
        else:
            # Locally, use localhost
            self.redirect_uri = "http://localhost:3000/callback"
            print(f"Running in local mode, using redirect URI: {self.redirect_uri}")

        self.scope = "playlist-modify-private playlist-modify-public playlist-read-private playlist-read-collaborative"

        self.sp = None  # Will be set after authentication

    def get_auth_manager(self):
        """Return a SpotifyOAuth object configured to use the database cache handler."""
        return SpotifyOAuth(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            scope=self.scope,
            cache_handler=DatabaseCacheHandler(self.user_id),
            show_dialog=True # Force show dialog every time for debugging
        )

    def get_auth_url(self, state=None):
        auth_manager = self.get_auth_manager()
        return auth_manager.get_authorize_url(state=state or self.user_id)

    def handle_callback(self, code):
        auth_manager = self.get_auth_manager()
        token_info = auth_manager.get_access_token(code, as_dict=True)
        if not token_info:
            raise SpotifyOauthError("Failed to obtain Spotify token from callback.")
        self.sp = spotipy.Spotify(auth_manager=auth_manager)
        return token_info

    def ensure_client(self):
        if self.sp is not None:
            return self.sp
        auth_manager = self.get_auth_manager()
        if auth_manager.validate_token(auth_manager.cache_handler.get_cached_token()):
            self.sp = spotipy.Spotify(auth_manager=auth_manager)
            return self.sp
        else:
            raise SpotifyOauthError("No valid Spotify token found. User must authenticate.")

    def search_auto(self, track_name, artists) -> list:
        """algorithmically processes track_name and artists from YouTube to search for equivalent Spotify track."""
        self.ensure_client()
        
        # Try multiple search strategies
        search_queries = [
            f"{track_name} {artists}",
            f"{preprocess_title(track_name)} {artists}",
            f"{track_name}",  # Sometimes artist in title is enough
        ]
        
        best_match = ["", 0, 0, "", ""]  # [uri, title_score, artist_score, title, artists]
        all_tracks_found = []
        
        for query in search_queries:
            results = self.sp.search(q=query, limit=10, type='track')
            
            if not results['tracks']['items']:
                continue
            
            for track in results['tracks']['items']:
                sp_track_title = track['name']
                sp_artist_names = [artist['name'] for artist in track['artists']]
                sp_artists_str = ', '.join(sp_artist_names)
                
                # Skip if we've already seen this track
                if track['uri'] in [t[0] for t in all_tracks_found]:
                    continue
                
                # Multiple scoring approaches for title
                title_scores = []
                
                # Direct fuzzy match
                title_scores.append(fuzzy_match(sp_track_title.lower(), track_name.lower()))
                
                # Clean title match (without feat/ft parts)
                clean_sp_title = preprocess_title(sp_track_title)
                clean_yt_title = preprocess_title(track_name)
                title_scores.append(fuzzy_match(clean_sp_title, clean_yt_title))
                
                # Handle featured artists in track names
                if '(' in track_name and ('feat' in track_name.lower() or 'ft' in track_name.lower()):
                    main_title = track_name.split('(')[0].strip()
                    title_scores.append(fuzzy_match(sp_track_title.lower(), main_title.lower()))
                
                # Check if track titles contain similar words
                sp_words = set(sp_track_title.lower().replace('(', ' ').replace(')', ' ').split())
                yt_words = set(track_name.lower().replace('(', ' ').replace(')', ' ').split())
                common_words = sp_words & yt_words
                if len(common_words) > 0:
                    word_score = (len(common_words) / max(len(sp_words), len(yt_words))) * 100
                    title_scores.append(word_score)
                
                title_score = max(title_scores)
                
                # Artist matching with multiple approaches
                artist_scores = []
                
                # Direct artist name matching
                for sp_artist in sp_artist_names:
                    artist_scores.append(fuzzy_match(sp_artist.lower(), artists.lower()))
                    
                    # Check if artist name appears in YouTube title
                    if sp_artist.lower() in track_name.lower():
                        artist_scores.append(85)
                    
                    # Check individual words of artist names
                    for artist_word in sp_artist.lower().split():
                        if len(artist_word) > 2 and artist_word in artists.lower():
                            artist_scores.append(75)
                
                # Check if any part of the artist string matches
                artist_scores.append(fuzzy_match(sp_artists_str.lower(), artists.lower()))
                
                artist_score = max(artist_scores) if artist_scores else 0
                
                # Calculate total score
                total_score = 0.7 * title_score + 0.3 * artist_score
                
                # Store all tracks
                all_tracks_found.append((track['uri'], title_score, artist_score, sp_track_title, sp_artists_str, total_score))
                
                # Update best match
                best_total_score = 0.7 * best_match[1] + 0.3 * best_match[2]
                if total_score > best_total_score:
                    best_match = [track['uri'], title_score, artist_score, sp_track_title, sp_artists_str]
        
        # Check thresholds
        if best_match[1] >= 60 and best_match[2] >= 40:
            print(f"✓ Final match: '{best_match[3]}' by {best_match[4]}")
            return best_match
        elif best_match[1] >= 80:
            print(f"✓ High title match: '{best_match[3]}' by {best_match[4]}")
            return best_match
        else:
            print("✗ No suitable match found.")
            return None
        

    def search_manual(self, track_name, artists):
        """
        Given a user's input, manually search for a track on Spotify and return a list of results.
        """
        self.ensure_client()
        
        query = f"{track_name} {artists}"
        results = self.sp.search(q=query, limit=10, type='track')
        
        search_results = []
        if results['tracks']['items']:
            for track in results['tracks']['items']:
                search_results.append({
                    'sp_id': track['id'],
                    'title': track['name'],
                    'artist': ', '.join([artist['name'] for artist in track['artists']]),
                    'thumbnail': track['album']['images'][0]['url'] if track['album']['images'] else ''
                })
        return search_results
    

    def get_playlists(self):
        """Obtains a list of the user's Spotify playlists.

        Returns:
            list[]: a list containing the name, id, image, and uri of each playlist.
        """
        self.ensure_client()
        
        playlists = self.sp.current_user_playlists()
        return [
            (
                pl['name'], 
                pl['id'], 
                pl['images'][0]['url'] if pl.get('images') else 'No Image', 
                pl['uri']
            ) 
        for pl in playlists['items']]
    

    def get_playlist_by_name(self, playlist_name):
        """given a Spotify playlist name, return the playlist's information."""
        self.ensure_client()
        
        playlists = self.sp.current_user_playlists()
        while playlists:
            for pl in playlists['items']:
                if pl['name'].lower() == playlist_name.lower():  # Case-insensitive comparison
                    return {
                        'title': pl['name'],
                        'id': pl['id'],
                        'description': pl.get('description', ''),
                        'image': pl['images'][0]['url'] if pl.get('images') else 'No Image',
                    }
            if playlists['next']:
                playlists = self.sp.next(playlists)
            else:
                playlists = None
        return None  # Return None if playlist not found
    

    def get_playlist_track_count(self, playlist_name):
        """given a Spotify playlist name, return the number of tracks."""
        self.ensure_client()
        
        playlists = self.sp.current_user_playlists()
        while playlists:
            for pl in playlists['items']:
                if pl['name'].lower() == playlist_name.lower():
                    return pl['tracks']['total']
            if playlists['next']:
                playlists = self.sp.next(playlists)
            else:
                playlists = None
        return None


    def get_playlist_items(self, playlist_id) -> list:
        """DEPRECATED - given a playlist id, returns a list of all tracks in it.

        Args:
            playlist_id (str): a valid Spotify playlist id.

        Returns:
            list[dict]: [{'title': track title, 'artist': track artist}, ...]
        """
        self.ensure_client()
        
        playlist_items = self.sp.playlist_tracks(playlist_id)
        tracks_info = []
        for item in playlist_items['items']:
            track = item['track']
            
            tracks_info.append({
                'title': track['name'],
                'id': track['id'],
                'artist': ', '.join([artist['name'] for artist in track['artists']]),
            })
        
        return tracks_info


    def add_to_playlist(self, playlist_id, track_uri) -> None:
        """add a list of songs (through uri) to a Spotify playlist.

        Args:
            playlist_id (str): the playlist id corresponding to the playlist to add songs to.
            track_uri (list[str]): a list of Spotify track uris to add to the playlist.

        Returns:
            None: only mutates the playlist.
        """
        self.ensure_client()
        
        try:
            self.sp.playlist_add_items(playlist_id, track_uri)
            print('sigma')
            return True
        except spotipy.exceptions.SpotifyException as e:
            print('ligma')
            return False
    

    def create_playlist(self, playlist_name):
        """creates a Spotify playlist with the given name.

        Args:
            playlist_name (str): the desired playlist name.

        Returns:
            None?: only mutates the associated Spotify profile by making a playlist for them.
        """
        self.ensure_client()
        
        playlist = self.sp.user_playlist_create(
            user=self.sp.current_user()['id'], 
            name=playlist_name, public=True, 
            description="made with SYNCER!"
        )
        print(f"Created Spotify playlist: {playlist['name']} with ID: {playlist['id']}")
        #return playlist

def is_spotify_authenticated(user_id):
    token_json = get_spotify_token(user_id)
    if not token_json:
        print(f"[SpotifyToken] No token found in database for user_id: {user_id}")
        return False
    try:
        token_info = json.loads(token_json)
        # Check for access_token and expiry
        if 'access_token' not in token_info:
            print(f"[SpotifyToken] Token for user_id: {user_id} does not contain access_token")
            return False
        # Optionally check if token is expired
        import time
        if 'expires_at' in token_info and token_info['expires_at'] < int(time.time()):
            print(f"[SpotifyToken] Token for user_id: {user_id} is expired")
            return False
        print(f"[SpotifyToken] Found valid token for user_id: {user_id}")
        return True
    except Exception as e:
        print(f"[SpotifyToken] Error parsing token for user_id: {user_id}: {e}")
        return False

