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
        print("Welcome to the Syncer App!")
        print("Type out your command below and press Enter:")
        print("Available commands:")
        print("  sync_yt_to_sp <yt_playlist_name> - Sync Youtube playlist to Spotify")
        print("  sync_sp_to_yt <sp_playlist_name> - Sync Spotify playlist to Youtube")
        print("  merge <yt_playlist_name> <sp_playlist_name> - Merge Spotify and Youtube playlists")
        print("  -h - Help")

        input_command = input("\nEnter a command: ")
        if input_command.strip() in ["-h", "--help"]:
            parser.print_help()
            input("Press Enter to exit...")
        else:
            # If input is not empty, split and pass the arguments to sys.argv and re-run main()
            if input_command.strip():
                sys.argv = [sys.argv[0]] + input_command.split()
                main()
            else:
                print("\nNo command provided. Exiting.")
                input("Press Enter to exit...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"An error occurred: {e}")
        input("Press Enter to exit...")

# COMMAND TO BUILD: pyinstaller --onefile --add-data "src;src" --add-data ".env;." main.py