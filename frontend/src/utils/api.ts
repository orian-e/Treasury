const API_URL = process.env.REACT_APP_API_URL;

let authToken: string | null = localStorage.getItem("authToken");

// Persists the token for the Authorization header fallback (used when the
// HttpOnly cookie can't be relied on, e.g. frontend/backend on different hostnames).
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
};

// Requests include credentials (for the cookie, when same-site) and the
// bearer token (when set) as a fallback the backend already supports.
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
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  };

  return fetch(url, config);
};

export { API_URL };
