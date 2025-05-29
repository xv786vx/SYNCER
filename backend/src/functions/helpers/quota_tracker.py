import os
import json
import logging

"""
YouTube API Quota Tracking System
=================================

This module provides functionality to track YouTube API quota usage across environments 
(local development and production deployment).

How to use:
-----------
1. Quota values persist across server restarts using file-based storage
2. The increment_quota() function adds to the usage count and saves automatically
3. Total quota usage can be viewed via get_total_quota_used()
4. You can manually set quota via set_total_quota_value() 

Maintaining quota across environments:
-------------------------------------
When switching between local and deployed backend environments, you need to 
synchronize the quota count to maintain accuracy:

- From CLI: 
  python -c "from src.functions.helpers.quota_tracker import set_total_quota_value; set_total_quota_value(YOUR_VALUE)"
  or
  python set_quota.py YOUR_VALUE

- From Frontend:
  Use the setYoutubeQuota(value) function in apiClient.ts

Important:
- Before deploying: Note your local quota count and set it on the deployed backend
- When resuming local development: Check the deployed quota and set it locally
"""

logger = logging.getLogger(__name__)

# Path to store quota data
QUOTA_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'quota_data.json')

YT_API_QUOTA_COSTS = {
    "search.list": 100,
    "playlistItems.list": 1,
    "videos.list": 1,
    "playlistItems.insert": 50,
    "playlistItems.delete": 50,
    "playlists.insert": 50,
    "playlists.delete": 50,
    "playlists.update": 50,
    "playlists.list": 1,
    "videos.rate": 50,
    "videos.insert": 1600,
}

# Initialize with zeros
default_quota_usage = {x: 0 for x in YT_API_QUOTA_COSTS.keys()}

# Load quota data from file if it exists
def load_quota_data():
    try:
        if os.path.exists(QUOTA_FILE_PATH):
            with open(QUOTA_FILE_PATH, 'r') as f:
                return json.load(f)
        return default_quota_usage
    except Exception as e:
        logger.error(f"Error loading quota data: {str(e)}")
        return default_quota_usage

# Save quota data to file
def save_quota_data():
    try:
        with open(QUOTA_FILE_PATH, 'w') as f:
            json.dump(quota_usage, f)
    except Exception as e:
        logger.error(f"Error saving quota data: {str(e)}")

# Initialize quota usage from file
quota_usage = load_quota_data()

def increment_quota(api_name: str, count: int = 1):
    if api_name in quota_usage:
        quota_usage[api_name] += count
        save_quota_data()  # Save after each update

def get_total_quota_used():
    return sum(quota_usage[k] * YT_API_QUOTA_COSTS[k] for k in quota_usage)

def set_total_quota_value(total_value):
    """
    Set the total YouTube API quota usage to a specific value.
    
    This function is crucial for maintaining accurate quota tracking when switching between
    local development and production environments. Use this to ensure continuity in quota tracking.
    
    Usage examples:
    
    1. From Python script:
       from src.functions.helpers.quota_tracker import set_total_quota_value
       set_total_quota_value(4332)  # Set quota to 4332 units
    
    2. From CLI:
       python -c "from src.functions.helpers.quota_tracker import set_total_quota_value; set_total_quota_value(4332)"
    
    3. Using the provided script:
       python set_quota.py 4332
    
    4. From frontend:
       import { setYoutubeQuota } from './utils/apiClient';
       await setYoutubeQuota(4332);
    
    Args:
        total_value: The desired total quota usage value
    """
    # A simple approach - distribute the value proportionally to search.list
    # since it's the most commonly used and has a high cost
    reset_quota_usage()
    quota_usage["search.list"] = total_value / YT_API_QUOTA_COSTS["search.list"]
    save_quota_data()
    
def reset_quota_usage():
    global quota_usage
    quota_usage = {x: 0 for x in YT_API_QUOTA_COSTS.keys()}
    save_quota_data()