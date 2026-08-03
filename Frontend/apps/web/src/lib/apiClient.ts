/**
 * API Client helper for fetching live backend data from Python Django Ninja API (/api/...)
 */

async function fetchClientEndpoint<T>(endpoint: string): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const request = async () =>
    fetch(endpoint, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

  try {
    const response = await request();

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
