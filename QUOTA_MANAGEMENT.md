# YouTube API Quota Management Guide

This guide explains how to maintain accurate YouTube API quota tracking when working between
local development and deployed (production) environments.

## Background

- YouTube API has a daily quota limit of 10,000 units
- Different API operations cost different amounts (search = 100 units, playlist.list = 1 unit, etc.)
- The quota is tracked per project, not per environment
- When switching between local development and deployed environments, the quota count can get out of sync

## How to Maintain Accurate Quota Tracking

### Option 1: Using the Command Line (Backend)

Set the quota directly from Python:

```powershell
# Navigate to backend directory
cd c:\Users\rcroo\Desktop\SYNCER\backend

# Set quota (replace 4332 with your current quota)
python -c "from src.functions.helpers.quota_tracker import set_total_quota_value; set_total_quota_value(4332)"

# Or use the convenience script
python set_quota.py 4332
```

### Option 2: Using the Frontend API

You can use the `setYoutubeQuota` function in your frontend code:

```typescript
import { setYoutubeQuota } from "./utils/apiClient";

// Set quota (replace 4332 with your current quota)
await setYoutubeQuota(4332);
```

### Workflow Examples

#### Scenario 1: Local Development → Deployed Environment

1. Before deploying, check your current quota:

   - Open your local app or API endpoint: http://localhost:8000/api/youtube_quota_usage
   - Note the "total" value (e.g., 4332)

2. After deploying, set the same quota on the deployed backend:
   - If you have terminal access to the server:
     ```
     python set_quota.py 4332
     ```
   - If not, use the frontend API:
     ```typescript
     await setYoutubeQuota(4332);
     ```

#### Scenario 2: Deployed Environment → Local Development

1. Check the quota on your deployed backend:

   - Open deployed app or API endpoint: https://syncer-26vh.onrender.com/api/youtube_quota_usage
   - Note the "total" value (e.g., 5678)

2. Set the same quota on your local backend:
   ```
   cd c:\Users\rcroo\Desktop\SYNCER\backend
   python set_quota.py 5678
   ```

## How It Works

- Quota data is now stored in a file: `backend/src/quota_data.json`
- This allows quota values to persist across server restarts
- The API endpoint `/api/set_youtube_quota` allows manual adjustment
- Changes are distributed to the most commonly used operation (search.list)

## Troubleshooting

If you see unexpected quota values:

1. Check the `quota_data.json` file for corruption
2. Reset the quota manually using `set_total_quota_value()`
3. Verify that all quota-using operations are properly tracked with `increment_quota()`
