from distutils.core import setup
import py2exe

setup(
    name="Syncer",
    version="0.1",
    description="Sync your Spotify and Youtube playlists.",
    author="Firas AJ",
    console=['main.py'],
    options={
        'py2exe': {
            'bundle_files': 1,
            'compressed': True,
            'includes': ['encodings'],
        }
    },
    zipfile=None
)