/**
 * API Client helper for fetching live backend data from Python Django Ninja API (/api/...)
 */

type ClientRequestContext = {
  token?: string;
  userId?: string;
};

function getClientRequestContext(): ClientRequestContext {
  if (typeof window === 'undefined') {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    token: localStorage.getItem('token') || localStorage.getItem('auth_token') || undefined,
    userId:
      searchParams.get('user_id') ||
      localStorage.getItem('client_user_id') ||
      localStorage.getItem('user_id') ||
      undefined,
  };
}

function appendUserId(endpoint: string, userId?: string): string {
  if (!userId) {
    return endpoint;
  }

  const [path, queryString = ''] = endpoint.split('?');
  const searchParams = new URLSearchParams(queryString);

  if (!searchParams.has('user_id')) {
    searchParams.set('user_id', userId);
  }

  const nextQuery = searchParams.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}

async function fetchClientEndpoint<T>(endpoint: string): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const { token, userId } = getClientRequestContext();
  const endpointWithUserId = appendUserId(endpoint, userId);

  const request = async (includeToken: boolean) =>
    fetch(endpointWithUserId, {
      headers: {
        Accept: 'application/json',
        ...(includeToken && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  try {
    let response = await request(Boolean(token));

    if (!response.ok && token && userId) {
      response = await fetch(appendUserId(endpoint, userId), {
        headers: {
          Accept: 'application/json',
        },
      });
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (_) {
    return null;
  }
}

export async function fetchAdminSystemUsers() {
  try {
    const res = await fetch('/api/admin/admin-users');
    if (!res.ok) return null;
    const data = await res.json();
    return data.admin_users || null;
  } catch (_) {
    return null;
  }
}

export async function fetchClientUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return null;
    const data = await res.json();
    return data.users || null;
  } catch (_) {
    return null;
  }
}

export async function fetchAdminManagers() {
  try {
    const res = await fetch('/api/admin/managers');
    if (!res.ok) return null;
    const data = await res.json();
    return data.managers || null;
  } catch (_) {
    return null;
  }
}

export async function fetchAdminInvestors() {
  try {
    const res = await fetch('/api/admin/investors');
    if (!res.ok) return null;
    const data = await res.json();
    return data.investors || null;
  } catch (_) {
    return null;
  }
}

export async function fetchAdminPendingRequests() {
  try {
    const res = await fetch('/api/admin/requests');
    if (!res.ok) return null;
    const data = await res.json();
    return data.requests || null;
  } catch (_) {
    return null;
  }
}

export async function fetchAdminDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    if (!res.ok) return null;
    const data = await res.json();
    return data.dashboard || null;
  } catch (_) {
    return null;
  }
}

export async function fetchClientProfile() {
  const data = await fetchClientEndpoint<{ profile?: any }>('/api/client/profile');
  return data?.profile || null;
}

export async function fetchClientAccount() {
  const data = await fetchClientEndpoint<{ account?: any }>('/api/client/account');
  return data?.account || null;
}

export async function fetchClientInvestments() {
  const data = await fetchClientEndpoint<{ investments?: any }>('/api/client/my-investments');
  return data?.investments || null;
}

export async function fetchClientTransactions() {
  const data = await fetchClientEndpoint<{ transactions?: any }>('/api/client/transactions');
  return data?.transactions || null;
}

export async function fetchClientTickets() {
  const data = await fetchClientEndpoint<{ tickets?: any; user_id?: string }>('/api/client/tickets');
  return data || null;
}

export async function fetchClientDashboard() {
  const data = await fetchClientEndpoint<{ dashboard?: any }>('/api/client/dashboard');
  return data?.dashboard || null;
}
