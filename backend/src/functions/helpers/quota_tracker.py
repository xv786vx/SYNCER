import os
import json
import logging
import pytz
from datetime import datetime

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

default_quota_usage = {x: 0 for x in YT_API_QUOTA_COSTS.keys()}

def get_est_date_str():
    tz = pytz.timezone('America/New_York')
    return datetime.now(tz).date().isoformat()

def load_quota_data():
    try:
        if os.path.exists(QUOTA_FILE_PATH):
            with open(QUOTA_FILE_PATH, 'r') as f:
                data = json.load(f)
            # Daily reset logic
            current_date = get_est_date_str()
            last_reset = data.get('last_reset')
            if last_reset != current_date:
                # Reset all per-operation counts
                for k in YT_API_QUOTA_COSTS.keys():
                    data[k] = 0
                data['last_reset'] = current_date
                with open(QUOTA_FILE_PATH, 'w') as f:
                    json.dump(data, f)
            return data
        # If file doesn't exist, create with all zeros and today's date
        data = default_quota_usage.copy()
        data['last_reset'] = get_est_date_str()
        with open(QUOTA_FILE_PATH, 'w') as f:
            json.dump(data, f)
        return data
    except Exception as e:
        logger.error(f"Error loading quota data: {str(e)}")
        data = default_quota_usage.copy()
        data['last_reset'] = get_est_date_str()
        return data

def save_quota_data(quota_usage):
    # Ensure last_reset is preserved
    if os.path.exists(QUOTA_FILE_PATH):
        try:
            with open(QUOTA_FILE_PATH, 'r') as f:
                data = json.load(f)
            quota_usage['last_reset'] = data.get('last_reset', get_est_date_str())
        except Exception:
            quota_usage['last_reset'] = get_est_date_str()
    else:
        quota_usage['last_reset'] = get_est_date_str()
    try:
        with open(QUOTA_FILE_PATH, 'w') as f:
            json.dump(quota_usage, f)
    except Exception as e:
        logger.error(f"Error saving quota data: {str(e)}")

# Initialize quota usage from file
global quota_usage
quota_usage = load_quota_data()

def increment_quota(api_name: str, count: int = 1):
    global quota_usage
    if api_name in quota_usage:
        quota_usage[api_name] += count
        save_quota_data(quota_usage)  # Save after each update

def get_total_quota_used():
    return sum(quota_usage[k] * YT_API_QUOTA_COSTS[k] for k in YT_API_QUOTA_COSTS if k in quota_usage)

def set_total_quota_value(total_value):
    """
    Set the total YouTube API quota usage to a specific value.
    This will assign all usage to 'search.list' for simplicity.
    """
    global quota_usage
    quota_usage = default_quota_usage.copy()
    quota_usage["search.list"] = total_value // YT_API_QUOTA_COSTS["search.list"]
    save_quota_data(quota_usage)

def reset_quota_usage():
    global quota_usage
    quota_usage = default_quota_usage.copy()
    save_quota_data(quota_usage)

