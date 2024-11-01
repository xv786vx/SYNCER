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

def preprocessv2(text):
    """filters out stopwords and non-alphanumeric characters from a given str.

    Args:
        text (str): self-explanatory.

    Returns:
        str: the clean version of the given text.
    """
    stopwords = {"feat", "featuring", "official", "music", "video", "audio", "topic", "ft", "wshh"}

    text = html.unescape(text)

    cleaned_text = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower())
    tokens = cleaned_text.split()
    filtered_tokens = [token for token in tokens if token not in stopwords]
    
    final_text = " ".join(filtered_tokens)
    
    return final_text

#%%
def preprocessv3(song_title, artists):
    """filters out stopwords and non-alphanumeric characters from a given str, and also filters out artist names from the song title that appear in artists as well.

    Args:
        text (str): a given song title
        artists (str | list[str]): the artist(s) associated with the song title.

    Returns:
        str: the clean version of the given song title.
    """
    stopwords = {"feat", "featuring", "official", "music", "video", "audio", "topic", "ft", "wshh"}
    
    song_title = html.unescape(song_title)

    # Ensure artists is a list of lowercase words
    if isinstance(artists, str):
        artists = artists.lower().split()
    else:
        artists = [artist.lower() for artist in artists]

    all_stopwords = stopwords | set(artists)
    # print(all_stopwords)

    cleaned_song_title = re.sub(r'[^a-zA-Z0-9\s]', '', song_title.lower())

    tokens = cleaned_song_title.split()
    # print(tokens)
    new_artists = ", ".join([token for token in tokens if token in all_stopwords])
    filtered_tokens = [token for token in tokens if token not in all_stopwords]
    # print(filtered_tokens)

    final_text = " ".join(filtered_tokens)
    return final_text, new_artists

def fuzzy_matchv3(str1, str2):
    """Calculates the similarity between two given strs using Levenshtein distances and tokenization.

    Args:
        str1 (str): self-explanatory.
        str2 (str): self-explanatory.

    Returns:
        int: a ratio score between 0 and 100, indicating the similarity between the two strs.
    """
    ratio = fuzz.ratio(str1, str2)
    partial_ratio = fuzz.partial_ratio(str1, str2)
    token_set_ratio = fuzz.token_set_ratio(str1, str2)
    
    # Weighted combination for refined matching, prioritizing token_set_ratio for artist mismatch tolerance
    return int(0.45 * ratio + 0.2 * partial_ratio + 0.35 * token_set_ratio)
# %%
