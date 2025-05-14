import argparse
import sys
import os
import shlex
from dotenv import load_dotenv

# Load environment variables from a .env file if not already set
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
sys.path.insert(0, os.path.join(os.getcwd(), 'backend', 'src'))
sys.path.insert(0, os.path.join(os.getcwd(), 'backend', 'src', 'functions'))
sys.path.insert(0, os.path.join(os.getcwd(), 'backend', 'src', 'functions', 'helpers'))

from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.merge_playlists import merge_playlists
from src.functions.download_yt_song import download_yt_song

def display_main_menu():
    """Displays the main menu with available commands."""
    print("\nWelcome to the Syncer App!")
    print("Type out your command below and press Enter:")
    print("Available commands:")
    print("  sync_yt_to_sp \"<yt_playlist_name>\" - Sync Youtube playlist to Spotify")
    print("  sync_sp_to_yt \"<sp_playlist_name>\" - Sync Spotify playlist to Youtube")
    print("  merge \"<yt_playlist_name>\" \"<sp_playlist_name>\" - Merge Spotify and Youtube playlists")
    print("  download_yt_song \"<song_name>\" \"<artists>\" - Download YouTube song to MP3")
    print("  exit - Quit the app")

def main():
    while True:
        display_main_menu()

        parser = argparse.ArgumentParser(description="Sync your Youtube and Spotify playlists.")

        # Operation arguments
        subparsers = parser.add_subparsers(dest="command", help="Commands to perform.")

        # Sync yt to sp
        yt_to_sp_parser = subparsers.add_parser("sync_yt_to_sp", help="Sync Youtube playlist to Spotify.")
        yt_to_sp_parser.add_argument("yt_playlist_name", help="Name of the Youtube playlist to sync to Spotify.")
        
        # Sync sp to yt
        sp_to_yt_parser = subparsers.add_parser("sync_sp_to_yt", help="Sync Spotify playlist to Youtube.")
        sp_to_yt_parser.add_argument("sp_playlist_name", help="Name of the Spotify playlist to sync to Youtube.")

        # Merge playlists
        merge_parser = subparsers.add_parser("merge", help="Merge a Spotify and Youtube playlist and save it on each platform.")
        merge_parser.add_argument("yt_playlist_name", help="Name of the Youtube playlist to merge.")
        merge_parser.add_argument("sp_playlist_name", help="Name of the Spotify playlist to merge.")

        # Download YT song
        download_parser = subparsers.add_parser("download_yt_song", help="Download YouTube song to MP3.")
        download_parser.add_argument("song_name", help="Name of the Youtube song to download.")
        download_parser.add_argument("artists", help="Name of the artists associated with the song.")

        input_command = input("\nEnter a command: ").strip()

        # Handle the "exit" command directly
        if input_command.lower() == "exit":
            print("Exiting the app. Goodbye!")
            break

        # Parse input with shlex to handle spaces within quotes
        if input_command:
            sys.argv = [sys.argv[0]] + shlex.split(input_command)
        else:
            print("\nNo command provided. Please try again.")
            continue

        try:
            args = parser.parse_args()

            if args.command == "sync_yt_to_sp":
                print("Syncing Youtube playlist to Spotify...")
                sync_yt_to_sp(args.yt_playlist_name)
                
            elif args.command == "sync_sp_to_yt":
                print("Syncing Spotify playlist to Youtube...")
                sync_sp_to_yt(args.sp_playlist_name)
                
            elif args.command == "merge":
                print("Merging Spotify and Youtube playlists...")
                merge_playlists(args.yt_playlist_name, args.sp_playlist_name)
            
            elif args.command == "download_yt_song":
                print("Downloading YouTube song...")
                download_yt_song(args.song_name, args.artists)

            elif args.command == 'help' or '-h' in sys.argv or '--help' in sys.argv:
                parser.print_help()  # Show help message

            else:
                print("Invalid command. Please try again.")

        except SystemExit:
            # Catch argparse errors and continue the loop
            print("Invalid input. Please try again.")
        
        # Reset sys.argv to prevent re-parsing the same command
        sys.argv = [sys.argv[0]]

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"An error occurred: {e}")
        input("Press Enter to exit...")
