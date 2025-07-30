import { useState, useEffect } from 'react';
import { SongStatus } from '../types';

export function useNoSongsToSyncFade({
    overlayState,
    setOverlayState,
    spToYtSongs,
    setSpToYtSongs,
    ytToSpSongs,
    setYtToSpSongs,
    currentJobId,
    setCurrentJobId
}: {
    overlayState: 'none' | 'processes' | 'finalizing' | 'songSyncStatus';
    spToYtSongs: SongStatus[];
    ytToSpSongs: SongStatus[];
    setOverlayState: React.Dispatch<React.SetStateAction<'none' | 'processes' | 'finalizing' | 'songSyncStatus'>>;
    setSpToYtSongs: React.Dispatch<React.SetStateAction<SongStatus[]>>;
    setYtToSpSongs: React.Dispatch<React.SetStateAction<SongStatus[]>>;
    currentJobId: string | null;
    setCurrentJobId: (id: string | null) => void;
}) {
    const [showNoSongsToSync, setShowNoSongsToSync] = useState(false);
    const [noSongsFade, setNoSongsFade] = useState(false);

    useEffect(() => {
    if (overlayState === 'songSyncStatus' && spToYtSongs.length === 0 && ytToSpSongs.length === 0) {
        setShowNoSongsToSync(true);
        setNoSongsFade(false);
        const fadeTimer = setTimeout(() => setNoSongsFade(true), 4500);
        const removeTimer = setTimeout(async () => {
        setShowNoSongsToSync(false);
        setOverlayState('none');
        setSpToYtSongs([]);
        setYtToSpSongs([]);
        // Finalize job if needed...
        }, 5000);
        return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
        };
    } else {
        setShowNoSongsToSync(false);
        setNoSongsFade(false);
    }
    }, [overlayState, setOverlayState, spToYtSongs.length, ytToSpSongs.length, setSpToYtSongs, setYtToSpSongs, currentJobId, setCurrentJobId]);

    useEffect(() => {
    if (!showNoSongsToSync) {
        if (overlayState === 'songSyncStatus' && spToYtSongs.length === 0 && ytToSpSongs.length === 0) {
        setOverlayState('none');
        setSpToYtSongs([]);
        setYtToSpSongs([]);
        }
    }
    // eslint-disable-next-line
    }, [showNoSongsToSync]);

    return { showNoSongsToSync, noSongsFade };

}