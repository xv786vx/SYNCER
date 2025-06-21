import { toast } from "react-toastify";

export interface APIError {
  error: {
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

export class APIErrorHandler {
  static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      try {
        const errorData = (await response.json()) as APIError;
        const message =
          errorData?.error?.message || `API Error: ${response.statusText}`;
        throw new Error(message);
      } catch {
        // If parsing JSON fails or error is not in expected format
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    }
    // Handle cases where the response is empty (e.g., 204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  static handleError(
    error: Error,
    fallbackMessage: string = "An error occurred"
  ): void {
    console.error("API Error:", error);
    const message = error.message || fallbackMessage;
    // Avoid showing "API Error: Not Found" as a toast
    if (!message.includes("Not Found")) {
      toast.error(message, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }
}

export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  errorMessage: string = "An error occurred"
): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error) {
    APIErrorHandler.handleError(error as Error, errorMessage);
    return null;
  }
};
