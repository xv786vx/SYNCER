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
    stopwords = {"feat", "featuring", "official", "music", "video", "audio", "topic", "ft", "wshh", 'mv', 'ver'}

    text = html.unescape(text)

    cleaned_text = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower())
    tokens = cleaned_text.split()
    filtered_tokens = [token for token in tokens if token not in stopwords]
    
    final_text = " ".join(filtered_tokens)
    
    return final_text

#%%
def preprocessv3(song_title, sp_artists):
    """filters out stopwords and non-alphanumeric characters from a given str, and also filters out artist names from the song title that appear in artists as well.

    Args:
        text (str): a given song title
        artists (str | list[str]): the artist(s) associated with the song title.

    Returns:
        str: the clean version of the given song title.
    """
    stopwords = {"feat", "featuring", "official", "music", "video", "audio", "topic", "ft", "wshh", 'mv', 'ver'}
    
    song_title = html.unescape(song_title)

    # Ensure artists is a list of lowercase words
    if isinstance(sp_artists, str):
        sp_artists = sp_artists.lower().split()
    else:
        sp_artists = [artist.lower() for artist in sp_artists]

    all_stopwords = stopwords | set(sp_artists)

    cleaned_song_title = re.sub(r'[^a-zA-Z0-9\s]', '', song_title.lower())
    tokens = cleaned_song_title.split()

    new_artists = ", ".join([token for token in tokens if token in all_stopwords])
    filtered_tokens = [token for token in tokens if token not in all_stopwords]

    final_text = " ".join(filtered_tokens)
    return final_text, new_artists

#%%
def preprocessv4(song_title, sp_artists, yt_artists):
    """filters out stopwords and non-alphanumeric characters from a given str, and also filters out artist names from the song title that appear in artists as well.

    Args:
        text (str): a given song title
        artists (str | list[str]): the artist(s) associated with the song title.

    Returns:
        str: the clean version of the given song title.
    """
    stopwords = {"feat", "featuring", "official", "music", "video", "audio", "topic", "ft", "wshh", 'mv', 'ver', 'lyrics'}
    
    song_title, sp_artists, yt_artists = html.unescape(song_title), html.unescape(sp_artists), html.unescape(yt_artists)

    # tokenize all 3 inputs
    if isinstance(song_title, str):
        # Tokenize the string directly
        song_title = re.split(r'[^a-zA-Z0-9]+', song_title.strip())
    elif isinstance(song_title, list):
        # Join list items into a single string and then tokenize
        combined_string = ' '.join(map(str, sp_artists))
        song_title = re.split(r'[^a-zA-Z0-9]+', song_title.strip())

    if isinstance(sp_artists, str):
        # Tokenize the string directly
        sp_artists = re.split(r'[^a-zA-Z0-9]+', sp_artists.strip())
    elif isinstance(sp_artists, list):
        # Join list items into a single string and then tokenize
        combined_string = ' '.join(map(str, sp_artists))
        sp_artists = re.split(r'[^a-zA-Z0-9]+', combined_string.strip())

    if isinstance(yt_artists, str):
        # Tokenize the string directly
        yt_artists = re.split(r'[^a-zA-Z0-9]+', yt_artists.strip())
    elif isinstance(yt_artists, list):
        # Join list items into a single string and then tokenize
        combined_string = ' '.join(map(str, yt_artists))
        yt_artists = re.split(r'[^a-zA-Z0-9]+', combined_string.strip())
    

    remove_from_title = []
    for token in song_title:
        if token in sp_artists and token not in yt_artists:
            yt_artists.append(token)
            remove_from_title.append(token)
        elif token in sp_artists and token in yt_artists:
            remove_from_title.append(token)
    
    song_title = [token for token in song_title if token not in remove_from_title]
    song_title = [token for token in song_title if token not in stopwords or token not in sp_artists]

    song_title = ' '.join(song_title)
    sp_artists = ' '.join(sp_artists)
    yt_artists = ' '.join(yt_artists)

    return song_title, yt_artists

#%%
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
    return int(0.3 * ratio + 0.2 * partial_ratio + 0.5 * token_set_ratio)

