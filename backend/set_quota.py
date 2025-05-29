"""
YouTube API Quota Setting Utility
=================================

This script allows you to manually set the YouTube API quota usage count
to maintain accuracy when switching between environments.

Usage:
------
python set_quota.py <quota_value>

Example:
--------
python set_quota.py 4332  # Sets the quota count to 4332

When to use:
-----------
1. When switching from local development to deployed environment:
   - Check your current quota count from local backend
   - Deploy your changes
   - Run this script on the deployed server to set the same quota value

2. When switching from deployed to local development:
   - Check the quota count from the deployed backend
   - Run this script locally to set the same quota value

3. When you need to manually correct the quota count for any reason
"""

import sys
import os
from src.functions.helpers.quota_tracker import set_total_quota_value

def main():
    if len(sys.argv) != 2:
        print("Usage: python set_quota.py <quota_value>")
        return
    
    try:
        quota_value = int(sys.argv[1])
        set_total_quota_value(quota_value)
        print(f"YouTube API quota set to {quota_value}")
    except ValueError:
        print("Error: Quota value must be an integer")
    except Exception as e:
        print(f"Error setting quota: {str(e)}")

if __name__ == "__main__":
    main()
