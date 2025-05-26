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

quota_usage = {x: 0 for x in YT_API_QUOTA_COSTS.keys()}

def increment_quota(api_name: str, count: int = 1):
    if api_name in quota_usage:
        quota_usage[api_name] += count

def get_total_quota_used():
    return sum(quota_usage[k] * YT_API_QUOTA_COSTS[k] for k in quota_usage)