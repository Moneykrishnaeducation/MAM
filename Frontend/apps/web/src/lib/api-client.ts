/**
 * MAM Frontend API Proxy Client
 * Intercepts, formats, logs, and proxies all data sent to and received from the server.
 */

export interface ProxyResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

export interface ProxyError {
  ok: false;
  status: number;
  message: string;
  data: any;
  error: Error;
}

export interface ProxyRequestOptions extends Omit<RequestInit, "body"> {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  raw?: boolean;
}

const DEFAULT_SERVER_URL =
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL)) ||
  "http://localhost:8000";

export class ServerProxy {
  baseUrl: string;
  interceptors: {
    request: Array<(config: any, meta: { url: string; endpoint: string }) => any>;
    response: Array<(res: ProxyResponse, meta: { url: string; endpoint: string; response: Response }) => any>;
    error: Array<(err: ProxyError, meta: { url: string; endpoint: string }) => any>;
  };

  constructor(baseUrl: string = DEFAULT_SERVER_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, "");
  }

  addRequestInterceptor(
    fn: (config: any, meta: { url: string; endpoint: string }) => any
  ): void {
    this.interceptors.request.push(fn);
  }

  addResponseInterceptor(
    fn: (res: ProxyResponse, meta: { url: string; endpoint: string; response: Response }) => any
  ): void {
    this.interceptors.response.push(fn);
  }

  addErrorInterceptor(
    fn: (err: ProxyError, meta: { url: string; endpoint: string }) => any
  ): void {
    this.interceptors.error.push(fn);
  }

  getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || localStorage.getItem("auth_token") || null;
    }
    return (typeof process !== "undefined" && process.env && process.env.AUTH_TOKEN) || null;
  }

  async request<T = any>(endpoint: string, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      params,
      timeout = 30000,
      raw = false,
      ...customConfig
    } = options;

    let url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    if (params && typeof params === "object") {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    };

    const token = this.getAuthToken();
    if (token && !reqHeaders.Authorization && !reqHeaders.authorization) {
      reqHeaders.Authorization = `Bearer ${token}`;
    }

    let reqBody = body;
    if (
      body &&
      typeof body === "object" &&
      !(typeof FormData !== "undefined" && body instanceof FormData) &&
      !(typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams)
    ) {
      reqBody = JSON.stringify(body);
    }

    let requestConfig: RequestInit = {
      method: method.toUpperCase(),
      headers: reqHeaders,
      body: reqBody,
      ...customConfig,
    };

    for (const interceptor of this.interceptors.request) {
      requestConfig = (await interceptor(requestConfig, { url, endpoint })) || requestConfig;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    requestConfig.signal = controller.signal;

    const startTime = Date.now();

    try {
      console.log(`[PROXY OUTGOING] ${requestConfig.method} -> ${url}`);
      const response = await fetch(url, requestConfig);
      clearTimeout(timer);

      const duration = Date.now() - startTime;
      console.log(`[PROXY INCOMING] ${response.status} ${response.statusText} (${duration}ms) <- ${url}`);

      if (raw) {
        return response as any;
      }

      let data: any;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      let resOutput: ProxyResponse<T> = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };

      for (const interceptor of this.interceptors.response) {
        resOutput = (await interceptor(resOutput, { url, endpoint, response })) || resOutput;
      }

      if (!response.ok) {
        const error: any = new Error(
          `Proxy request failed with status ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return resOutput;
    } catch (err: any) {
      clearTimeout(timer);
      console.error(`[PROXY ERROR] ${requestConfig.method} ${url}:`, err.message || err);

      let errorObj: ProxyError = {
        ok: false,
        status: err.status || 500,
        message: err.message || "Proxy Request Failed",
        data: err.data || null,
        error: err,
      };

      for (const interceptor of this.interceptors.error) {
        errorObj = (await interceptor(errorObj, { url, endpoint })) || errorObj;
      }

      throw errorObj;
    }
  }

  get<T = any>(endpoint: string, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T = any>(endpoint: string, body?: any, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  put<T = any>(endpoint: string, body?: any, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  patch<T = any>(endpoint: string, body?: any, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  delete<T = any>(endpoint: string, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const proxy = new ServerProxy();
export default proxy;
