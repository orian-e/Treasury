const API_URL = process.env.REACT_APP_API_URL;

// All requests include credentials so the HttpOnly auth cookie is sent automatically
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${API_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  return fetch(url, config);
};

export { API_URL };
