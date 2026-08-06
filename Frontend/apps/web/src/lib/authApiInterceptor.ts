type LogoutScope = 'admin' | 'client';

let installed = false;
let logoutInProgress = false;

function getLogoutScope(url: string): LogoutScope | null {
  if (url.includes('/api/admin/')) {
    return 'admin';
  }
  if (url.includes('/api/client/')) {
    return 'client';
  }
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    if (window.location.pathname.startsWith('/client')) {
      return 'client';
    }
  }
  return null;
}

function getLogoutUrl(scope: LogoutScope): string {
  return scope === 'admin' ? '/api/admin/logout' : '/api/client/logout';
}

function getRedirectUrl(scope: LogoutScope): string {
  return scope === 'admin' ? '/' : '/';
}

async function triggerLogout(scope: LogoutScope) {
  if (logoutInProgress) {
    return;
  }

  logoutInProgress = true;

  try {
    await fetch(getLogoutUrl(scope), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    // Ignore logout failures and still leave the authenticated area.
  } finally {
    if (typeof window !== 'undefined') {
      window.location.href = getRedirectUrl(scope);
    }
    logoutInProgress = false;
  }
}

export function installAuthApiInterceptor() {
  if (installed || typeof window === 'undefined' || typeof fetch === 'undefined') {
    return;
  }

  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isApiRequest = requestUrl.includes('/api/');
    const scope = getLogoutScope(requestUrl);
    const response = await originalFetch(input, init);

    if (isApiRequest && scope && (response.status === 403 || response.status === 404) && !requestUrl.includes('/logout')) {
      void triggerLogout(scope);
    }

    return response;
  }) as typeof window.fetch;
}
