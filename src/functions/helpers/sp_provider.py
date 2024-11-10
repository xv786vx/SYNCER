import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyOauthError

from .provider import Provider
from .provider import preprocessv2, preprocessv3, preprocessv4, fuzzy_matchv3

import os
from dotenv import load_dotenv

load_dotenv()

sp_client_id = os.getenv("SP_CLIENT_ID")
sp_client_secret = os.getenv("SP_CLIENT_SECRET")

class SpotifyProvider(Provider):
    def __init__(self):
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        token_dir = os.path.join(root_dir, 'auth_tokens')
        os.makedirs(token_dir, exist_ok=True)
        self.cache_path = os.path.join(token_dir, '.cache')

        self.client_id = sp_client_id  # Securely source these
        self.client_secret = sp_client_secret

        self.init_spotify_client()

    def init_spotify_client(self):
        """Initialize the Spotify client with authentication."""
        try:
            self.sp = spotipy.Spotify(auth_manager=self.get_auth_manager())
            if self.sp.current_user():
                print("Spotify authorization successful")
            else:
                print("Spotify authorization failed")
        except SpotifyOauthError as e:
            print(f"Authorization error: {e}")
            if 'invalid_client' in str(e):
                print("Invalid client credentials. Attempting to reauthorize...")
                self.reauthorize()

    def get_auth_manager(self):
        """Return a SpotifyOAuth object configured with client credentials and cache path."""
        return SpotifyOAuth(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri="http://localhost:3000/callback",
            scope="playlist-modify-private playlist-modify-public playlist-read-private playlist-read-collaborative",
            cache_path=self.cache_path
        )

    def reauthorize(self):
        """Delete the existing .cache file and prompt the user to reauthorize."""
        if os.path.exists(self.cache_path):
            os.remove(self.cache_path)
            print("Existing credentials deleted. Please authorize the application again.")

        # Reinitialize the Spotify client to trigger a new authorization flow
        self.init_spotify_client()
        print("Reauthorization complete. Follow the instructions to authorize the application.")

    
    
    def search_auto(self, track_name, artists) -> list:
        """algorithmically processes track_name and artists from YouTube to search for equivalent Spotify track.

        Args:
            track_name (str): the video title scraped from a given YouTube video.
            artists (str): a single channel name scraped from a given YouTube video.

        Returns:
            list[]: returns a 
                [song uri, track_name match score, artist match score, song title, artist names]
            if a suitable match is found, else None.
        """

        clean_track_name, artists = preprocessv3(track_name, artists)[0], preprocessv2(artists)

        query = f"{clean_track_name} {artists}"

        results = self.sp.search(q=query, limit=6, type='track')
        if results['tracks']['items']:

            best_match = ["", 0, 0, "", ""]

            for track in results['tracks']['items']:
                artist_names = [preprocessv2(artist['name']) for artist in track['artists']]
                song_title = preprocessv3(track['name'], artist_names)[0]

                clean_track_name, artists = preprocessv4(clean_track_name, artist_names, artists)

                track_names_match = max(fuzzy_matchv3(song_title, track_name), fuzzy_matchv3(song_title, clean_track_name))
                artist_match = max(fuzzy_matchv3(artist_name, artists) for artist_name in artist_names)
                
                
                if track_names_match >= best_match[1] and artist_match >= best_match[2]:
                    print(f"MATCH FOUND FOR {clean_track_name} BY {artists}")
                    print(f"{song_title} BY {artist_names}")
                    best_match[0] = track['uri']
                    best_match[1] = track_names_match
                    best_match[2] = artist_match
                    best_match[3] = song_title
                    best_match[4] = artist_names
            
            if best_match[1] > 70 and best_match[2] > 65:
                print(f"final song title (sp): {best_match[3]}, song title (yt): {track_name.lower()}")
                print(f"final artist names (sp): {best_match[4]}, artist names (yt): {artists}")
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
        """given a user's input, manually search for a track on Spotify.

        Args:
            track_name (str): a user's desired song title.
            artists (str): a user's desired artist name (WIP INPUTTING MULTIPLE ARTISTS).

        Returns:
            str: returns ONLY the Spotify track uri if a suitable match is found, else None.
        """
        clean_track_name, artists = preprocessv2(track_name), preprocessv2(artists)
        
        query = f"{clean_track_name} {artists}"

        results = self.sp.search(q=query, limit=6, type='track')
        if results['tracks']['items']:

            for track in results['tracks']['items']:
                song_title = track['name']
                artist_names = [artist['name'] for artist in track['artists']]

                choice = input(f"Is this the song you were looking for? {song_title} by {artist_names} (y/n): ")
                if choice == 'y':
                    return track['uri']
                
                else:
                    continue

        else:
            print("err: result didn't match given structure")
            input("Press Enter to continue...")
            return None
    

    def get_playlists(self):
        """Obtains a list of the user's Spotify playlists.

        Returns:
            list[]: a list containing the name, id, image, and uri of each playlist.
        """
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
        """given a Spotify playlist name, return the playlist's information.

        Args:
            playlist_name (str): a playlist name to search for.

        Returns:
            dict: {'title': playlist name, 'id': playlist id, 'description': playlist description, 'image': playlist image}
        """
        playlists = self.sp.current_user_playlists()
        for pl in playlists['items']:
            if pl['name'].lower() == playlist_name.lower():  # Case-insensitive comparison
                return {
                    'title': pl['name'],
                    'id': pl['id'],
                    'description': pl.get('description', ''),
                    'image': pl['images'][0]['url'] if pl.get('images') else 'No Image',
                }
        return None  # Return None if playlist not found
    

    def get_playlist_items(self, playlist_id) -> list:
        """Given a Spotify playlist id, return the track titles and artists of each track in the playlist.

        Args:
            playlist_id (str): a valid Spotify playlist id.

        Returns:
            list[dict]: [{'title': track title, 'artist': track artist}, ...]
        """
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
        playlist = self.sp.user_playlist_create(
            user=self.sp.current_user()['id'], 
            name=playlist_name, public=True, 
            description="made with SYNCER!"
        )
        print(f"Created Spotify playlist: {playlist['name']} with ID: {playlist['id']}")
        #return playlist

