import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.getcwd(), 'src'))
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.merge_playlists import merge_playlists

def main():
    parser = argparse.ArgumentParser(description="Sync your Youtube and Spotify playlists.")

    # operation arguments
    subparsers = parser.add_subparsers(dest="command", help="Commands to perform.")

    # sync yt to sp
    yt_to_sp_parser = subparsers.add_parser("sync_yt_to_sp", help="Sync Youtube playlist to Spotify.")
    yt_to_sp_parser.add_argument("yt_playlist_name", help="Name of the Youtube playlist to sync to Spotify.")
    
    sp_to_yt_parser = subparsers.add_parser("sync_sp_to_yt", help="Sync Spotify playlist to Youtube.")
    sp_to_yt_parser.add_argument("sp_playlist_name", help="Name of the Spotify playlist to sync to Youtube.")

    merge_parser = subparsers.add_parser("merge", help="Merge a Spotify and Youtube playlist and save it on each platform.")
    merge_parser.add_argument("yt_playlist_name", help="Name of the Youtube playlist to merge.")
    merge_parser.add_argument("sp_playlist_name", help="Name of the Spotify playlist to merge.")

    args = parser.parse_args()

    if args.command == "sync_yt_to_sp":
        print("Syncing Youtube playlist to Spotify...")
        # print(f"Playlist name: {args.yt_playlist_name}")
        sync_yt_to_sp(args.yt_playlist_name)
        
    elif args.command == "sync_sp_to_yt":
        print("Syncing Spotify playlist to Youtube...")
        # print(f"Playlist name: {args.sp_playlist_name}")
        sync_sp_to_yt(args.sp_playlist_name)
        
    elif args.command == "merge":
        print("Merging Spotify and Youtube playlists...")
        # print(f"Spotify playlist name: {args.sp_playlist_name}")
        # print(f"Youtube playlist name: {args.yt_playlist_name}")
        merge_playlists(args.yt_playlist_name, args.sp_playlist_name)

    else:
        parser.print_help()



    # MAKE A PAPER LIST OF ARGUMENTS BEFORE ADDING THEM HERE

    # sync yt to sp
    # sync sp to yt
    # merge yt + sp

if __name__ == "__main__":
    main()