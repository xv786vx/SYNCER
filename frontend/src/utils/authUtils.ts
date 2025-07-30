import * as API from "./apiClient";

export async function ensureSpotifyAuth(
  userId: string | null,
  isSpotifyAuthenticated: boolean | null,
  setIsSpotifyAuthenticated: React.Dispatch<
    React.SetStateAction<boolean | null>
  >
) {
  if (!userId) return;
  if (isSpotifyAuthenticated === true) return;
  const resp = await API.getSpotifyAuthStatus(userId);
  setIsSpotifyAuthenticated(resp?.authenticated ?? false);
  if (!resp || !resp.authenticated) {
    await API.startSpotifyOAuth(userId);
    setIsSpotifyAuthenticated(true); // Optionally, re-check after OAuth
  }
}

export async function ensureYoutubeAuth(
  userId: string | null,
  isYoutubeAuthenticated: boolean | null,
  setIsYoutubeAuthenticated: React.Dispatch<
    React.SetStateAction<boolean | null>
  >
) {
  if (!userId) {
    // console.log('No userId available, cannot check YouTube auth');
    return;
  }
  // console.log('Checking YouTube auth for user_id:', userId);
  try {
    // If we already know the auth status, use it
    if (isYoutubeAuthenticated === true) {
      // console.log('User already authenticated with YouTube (from state)');
      return;
    }

    const resp = await API.getYoutubeAuthStatus(userId);
    // console.log('Auth status response:', resp);
    setIsYoutubeAuthenticated(resp?.authenticated ?? false);

    if (!resp || !resp.authenticated) {
      // console.log('User not authenticated with YouTube, starting OAuth flow...');
      await API.startYoutubeOAuth(userId);
      // After OAuth completes, update the auth status
      setIsYoutubeAuthenticated(true);
    } else {
      // console.log('User already authenticated with YouTube');
    }
  } catch (error) {
    // console.error('Error checking YouTube auth status:', error);
    setIsYoutubeAuthenticated(false);
    // Only start OAuth if we get a specific error indicating auth is needed
    if (error instanceof Error && error.message.includes("authentication")) {
      // console.log('Authentication error detected, starting OAuth flow...');
      await API.startYoutubeOAuth(userId);
      // After OAuth completes, update the auth status
      setIsYoutubeAuthenticated(true);
    } else {
      // console.error('Unexpected error during auth check:', error);
      throw error; // Re-throw other errors
    }
  }
}
