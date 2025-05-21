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
      const errorData = (await response.json()) as APIError;
      throw new Error(errorData.error.message || "An error occurred");
    }
    return response.json();
  }

  static handleError(
    error: Error,
    fallbackMessage: string = "An error occurred"
  ): void {
    console.error("API Error:", error);
    toast.error(error.message || fallbackMessage, {
      position: "bottom-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
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
