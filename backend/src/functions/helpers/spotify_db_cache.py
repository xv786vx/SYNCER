from spotipy.cache_handler import CacheHandler
from src.db.spotify_token import get_spotify_token, save_spotify_token
import json

class DatabaseCacheHandler(CacheHandler):
    def __init__(self, user_id):
        self.user_id = user_id

    def get_cached_token(self):
        token_json = get_spotify_token(self.user_id)
        if token_json:
            return json.loads(token_json)
        return None

    def save_token_to_cache(self, token_info):
        save_spotify_token(self.user_id, json.dumps(token_info))