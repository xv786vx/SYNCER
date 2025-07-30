import { useEffect } from 'react';
import * as API from '../utils/apiClient';

export function useAuthStatus(
  userId: string | null,
  setIsSpotifyAuthenticated: (val: boolean) => void,
  setIsYoutubeAuthenticated: (val: boolean) => void
) {
  // YouTube Auth Check
  useEffect(() => {
    if (!userId) {
      console.log('No userId available yet, skipping auth check');
      return;
    }
    console.log('Checking initial YouTube auth status for userId:', userId);
    // Check auth status on mount, but don't trigger OAuth automatically
    const checkAuth = async () => {
      try {
        console.log('Making API call to check YouTube auth status...');
        const resp = await API.getYoutubeAuthStatus(userId);
        console.log('Initial auth status check response:', resp);
        setIsYoutubeAuthenticated(resp?.authenticated ?? false);
        if (!resp || !resp.authenticated) {
          console.log('User not authenticated with YouTube');
          // Don't trigger OAuth here - wait for user action
        } else {
          console.log('User is authenticated with YouTube');
        }
      } catch (error) {
        console.error('Error checking initial YouTube auth status:', error);
        setIsYoutubeAuthenticated(false);
        // Don't trigger OAuth here - wait for user action
      }
    };
    checkAuth();
  }, [userId, setIsYoutubeAuthenticated]);

  // Spotify Auth Check
  useEffect(() => {
    if (!userId) return;
    const checkSpotifyAuth = async () => {
      try {
        const resp = await API.getSpotifyAuthStatus(userId);
        setIsSpotifyAuthenticated(resp?.authenticated ?? false);
      } catch {
        setIsSpotifyAuthenticated(false);
      }
    };
    checkSpotifyAuth();
  }, [userId, setIsSpotifyAuthenticated]);
}