import mockDataRaw from '@/data/mockData.json';

export const mockData = mockDataRaw;

export function getAdminUsers() {
  return mockData.admin.users;
}

export function getAdminSystemUsers() {
  return mockData.admin.adminUsers;
}

export function getAdminManagers() {
  return mockData.admin.managers;
}

export function getAdminInvestors() {
  return mockData.admin.investors;
}

export function getAdminPendingRequests() {
  return mockData.admin.pendingRequests;
}

export function getClientData() {
  return mockData.client;
}
