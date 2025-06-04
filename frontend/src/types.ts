export type SongStatus = {
  name: string;
  artist: string;
  status: "found" | "not_found" | "skipped";
  yt_id?: string; // For Spotify → YouTube
  sp_id?: string; // For YouTube → Spotify
  requires_manual_search?: boolean;
};

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
