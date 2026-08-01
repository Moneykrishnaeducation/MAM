/**
 * API Client helper for fetching live backend data from Python Django Ninja API (/api/...)
 */

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

export async function fetchClientProfile() {
  try {
    const res = await fetch('/api/client/profile');
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch (_) {
    return null;
  }
}

export async function fetchClientAccount() {
  try {
    const res = await fetch('/api/client/account');
    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
  } catch (_) {
    return null;
  }
}

export async function fetchClientInvestments() {
  try {
    const res = await fetch('/api/client/my-investments');
    if (!res.ok) return null;
    const data = await res.json();
    return data.investments || null;
  } catch (_) {
    return null;
  }
}
