// utils/userId.ts
// Utility to get or create a persistent user_id for the Chrome extension or web frontend

export function getOrCreateUserId(): Promise<string> {
  return new Promise((resolve) => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      // Chrome extension environment
      chrome.storage.local.get(["user_id"], function (result) {
        if (result.user_id) {
          resolve(result.user_id);
        } else {
          const user_id = crypto.randomUUID();
          chrome.storage.local.set({ user_id }, function () {
            resolve(user_id);
          });
        }
      });
    } else {
      // Fallback for web: use localStorage
      let user_id = localStorage.getItem("user_id");
      if (!user_id) {
        user_id = crypto.randomUUID();
        localStorage.setItem("user_id", user_id);
      }
      resolve(user_id);
    }
  });
}
