import { getFirebaseToken } from "./firebase-auth";

/**
 * Fetch with Firebase authentication token
 */
export async function firebaseApiFetch(
  url: string,
  options: RequestInit & { skipAuth?: boolean } = {}
) {
  const { skipAuth = false, ...fetchOptions } = options;

  let headers = fetchOptions.headers || {};

  // Add Firebase token to requests (except for auth endpoints)
  if (!skipAuth) {
    const token = await getFirebaseToken();
    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}

/**
 * Make API request with Firebase token
 */
export async function firebaseApi<T = any>(
  url: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const response = await firebaseApiFetch(url, options);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET request with Firebase token
 */
export async function firebaseApiGet<T = any>(url: string): Promise<T> {
  return firebaseApi<T>(url, { method: "GET" });
}

/**
 * POST request with Firebase token
 */
export async function firebaseApiPost<T = any>(
  url: string,
  data: any
): Promise<T> {
  return firebaseApi<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request with Firebase token
 */
export async function firebaseApiPatch<T = any>(
  url: string,
  data: any
): Promise<T> {
  return firebaseApi<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request with Firebase token
 */
export async function firebaseApiDelete<T = any>(url: string): Promise<T> {
  return firebaseApi<T>(url, { method: "DELETE" });
}
