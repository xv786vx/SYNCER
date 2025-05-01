chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "syncPlaylist") {
    fetch(
      `http://localhost:8000/api/sync_playlist?playlist_name=${encodeURIComponent(request.playlistName)}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("Backend response:", data);
        // Optionally, send a response back to the popup
        sendResponse({ status: data.status, message: data.message });
      })
      .catch((error) => {
        console.error("Error:", error);
        sendResponse({ status: "error", message: "Failed to sync playlist." });
      });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
});
