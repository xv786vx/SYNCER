export interface SongStatus {
  name: string;
  artist: string;
  status: "found" | "not_found" | "skipped" | "in-progress";
  yt_id?: string | null;
  yt_title?: string;
  yt_artist?: string;
  sp_id?: string | null;
  requires_manual_search: boolean;
  coverUrl?: string; // Optional cover art URL
}

export interface Process {
  id: string;
  type: string;
  status: "pending" | "in-progress" | "completed" | "error";
  message: string;
  interactive?: {
    type: "search" | "skip";
    songName: string;
    onSearch: () => void;
    onSkip: () => void;
  };
  progress?: number; // 0-100, for progress bar
}

export interface APIResponse {
  songs?: SongStatus[];
  message?: string;
  result?: string;
}

export interface StatusResponse {
  name: string;
  authenticated: boolean;
}
