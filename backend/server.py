from flask import Flask, request, jsonify
from src.functions.download_yt_song import download_yt_song
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.merge_playlists import merge_playlists

app = Flask(__name__)

@app.route('/download_yt_song', methods=['POST'])
def download_song():
    data = request.json
    song_name = data.get('song_name')
    artist_name = data.get('artist_name')

    try:
        download_yt_song.download(song_name, artist_name)  # assuming you have a `download` function
        return jsonify({'status': 'success', 'message': 'Song downloaded successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/sync_sp_to_yt', methods=['POST'])
def sync_sp_to_yt_route():
    data = request.json
    playlist_name = data.get('sp_playlist_name')
    try:
        sync_sp_to_yt.sync(playlist_name)  # assuming you have a `sync` function
        return jsonify({'status': 'success', 'message': 'Synced Spotify → YouTube!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/sync_yt_to_sp', methods=['POST'])
def sync_yt_to_sp_route():
    data = request.json
    playlist_name = data.get('yt_playlist_name')
    try:
        sync_yt_to_sp.sync(playlist_name)
        return jsonify({'status': 'success', 'message': 'Synced YouTube → Spotify!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/merge', methods=['POST'])
def merge_route():
    data = request.json
    yt_playlist = data.get('yt_playlist_name')
    sp_playlist = data.get('sp_playlist_name')
    try:
        merge_playlists.merge(yt_playlist, sp_playlist)
        return jsonify({'status': 'success', 'message': 'Playlists merged successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)  # Set debug=True for development purposes