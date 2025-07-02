export interface SongStatus {
  name: string;
  artist: string;
  status: "found" | "not_found" | "skipped" | "in-progress";
  yt_id?: string | null;
  yt_title?: string;
  yt_artist?: string;
  sp_id?: string | null;
  sp_title?: string;
  sp_artist?: string;
  requires_manual_search: boolean;
  coverUrl?: string; // Optional cover art URL
  reason?: string;
}

export interface Process {
  id: string; // UI process id (for React list keys)
  jobId?: string; // Backend job UUID (for backend operations)
  type: string;
  status: "pending" | "in-progress" | "completed" | "error" | "done";
  message: string;
  subMessage?: string;
  playlistName?: string; // Optional: for countdown message
  countdownEnd?: number | undefined; // Optional: timestamp for countdown end
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

export interface Job {
  job_id: string;
  status:
    | "pending"
    | "in-progress"
    | "ready_to_finalize"
    | "completed"
    | "error";
  result?: { songs?: SongStatus[] };
  error?: string;
  type?: string;
  playlist_name?: string;
  updated_at?: string;
  job_notes?: string | null;
}
