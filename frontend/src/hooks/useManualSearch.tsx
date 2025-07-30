import { useState } from "react";
import { SongStatus, ManualSearchResult } from "../types";

export function useManualSearch(setSpToYtSongs: React.Dispatch<React.SetStateAction<SongStatus[]>>, setYtToSpSongs: React.Dispatch<React.SetStateAction<SongStatus[]>>) {
    const [manualSearchSong, setManualSearchSong] = useState<SongStatus | null>(null);
    const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(null);

    // sp to yt
    const handleManualSearchSpToYt = (
        song: SongStatus,
        index: number
    ) => {
        setManualSearchSong(song)
        setManualSearchIndex(index);
    }

    const handleSelectManualSearchSpToYt = (
        _originalSong: SongStatus,
        newSongDetails: ManualSearchResult
    ) => {
        if (manualSearchIndex === null) return;
        setSpToYtSongs(prev =>
            prev.map((s, i) =>
            i === manualSearchIndex
                ? {
                    ...s,
                    status: 'found',
                    yt_id: newSongDetails.yt_id,
                    yt_title: newSongDetails.title,
                    yt_artist: newSongDetails.artist,
                    requires_manual_search: false,
                }
                : s
            )
        );
        setManualSearchSong(null);
        setManualSearchIndex(null);
    }

    const handleSkipSpToYt = (_songToSkip: SongStatus, index: number) => {
        setSpToYtSongs(prev =>
            prev.map((s, i) =>
            i === index
                ? { ...s, status: 'skipped', requires_manual_search: false }
                : s
            )
        );
        setManualSearchSong(null);
        setManualSearchIndex(null);
    }

    // yt to sp
    const handleManualSearchYtToSp = (
        song: SongStatus,
        index: number
    ) => {
        setManualSearchSong(song)
        setManualSearchIndex(index);
    }

    const handleSelectManualSearchYtToSp = (_originalSong: SongStatus, newSongDetails: ManualSearchResult) => {
        if (manualSearchIndex === null) return;
        setYtToSpSongs(prev =>
            prev.map((s, i) =>
            i === manualSearchIndex
                ? {
                    ...s,
                    status: 'found',
                    sp_id: newSongDetails.sp_id,
                    sp_title: newSongDetails.title,
                    sp_artist: newSongDetails.artist,
                    requires_manual_search: false,
                }
                : s
            )
        );
        setManualSearchSong(null);
        setManualSearchIndex(null);
        };

        const handleSkipYtToSp = (_songToSkip: SongStatus, index: number) => {
        setYtToSpSongs(prev =>
            prev.map((s, i) =>
            i === index
                ? { ...s, status: 'skipped', requires_manual_search: false }
                : s
            )
        );
        setManualSearchSong(null);
        setManualSearchIndex(null);
    }

    return {
        manualSearchSong,
        setManualSearchSong,
        manualSearchIndex,
        setManualSearchIndex,
        handleManualSearchSpToYt,
        handleSelectManualSearchSpToYt,
        handleSkipSpToYt,
        handleManualSearchYtToSp,
        handleSelectManualSearchYtToSp,
        handleSkipYtToSp,
    };
}