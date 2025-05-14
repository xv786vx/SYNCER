import re
from fuzzywuzzy import fuzz
import html

class Provider:
    def search_auto(self, query):
        """Search for tracks or videos."""
        raise NotImplementedError("Subclasses should implement this!")

    def convert_mp3(self, item_id):
        """Convert a (Youtube) video or (Spotify) song to mp3 so it can be uploaded onto the respective platform."""
        raise NotImplementedError("Subclasses should implement this!")

    def get_playlists(self):
        """Get user playlists."""
        raise NotImplementedError("Subclasses should implement this!")
    
    def get_playlist_items(self, playlist_id):
        """Get items in a playlist."""
        raise NotImplementedError("Subclasses should implement this!")

    def add_to_playlist(self, playlist_id, item_id):
        """Add a track or video to a playlist."""
        raise NotImplementedError("Subclasses should implement this!")
    
    def create_playlist(self, name):
        """Create a new playlist."""
        raise NotImplementedError("Subclasses should implement this!")


# Stopwords
BASE_STOPWORDS = {
    "feat", "featuring", "official", "music", "video", "audio", "topic",
    "ft", "wshh", "mv", "ver", "lyrics", "live", "album", "cover"
}

#%%
def tokenize(text):
    return re.findall(r'\b\w+\b', text.lower())

#%%
def preprocess_title(title, *artist_groups):

    title = html.unescape(title)
    title_tokens = tokenize(title)

    all_artist_tokens = set()
    for group in artist_groups:
        if isinstance(group, str):
            all_artist_tokens |= set(tokenize(group))
        elif isinstance(group, list):
            for item in group:
                all_artist_tokens |= set(tokenize(item))
    
    all_stopwords = BASE_STOPWORDS | all_artist_tokens
    filtered = [token for token in title_tokens if token not in all_stopwords]
    return " ".join(filtered)

#%%
def fuzzy_match(str1, str2, override_threshold=90):
    ratio = fuzz.ratio(str1, str2)
    partial_ratio = fuzz.partial_ratio(str1, str2)
    token_set_ratio = fuzz.token_set_ratio(str1, str2)

    if token_set_ratio >= override_threshold:
        return 100
    return int(0.2 * ratio + 0.2 * partial_ratio + 0.6 * token_set_ratio)


#%%
def is_match(sp_title, sp_artists, yt_title, yt_artists, threshold=85):
    clean_sp = preprocess_title(sp_title, sp_artists)
    clean_yt = preprocess_title(yt_title, yt_artists)

    score = fuzzy_match(clean_sp, clean_yt)

    return score >= threshold

