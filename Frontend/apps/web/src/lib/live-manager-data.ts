export type ClientProfileSummary = {
  full_name: string;
  email: string;
};

export type ClientAccountSummary = {
  account_number: string;
  leverage: string;
  currency: string;
  balance: number;
  equity?: number;
  margin_free?: number;
  status?: string;
};

export type ClientInvestmentSummary = {
  id: number | string;
  strategy?: string | null;
  manager?: string | null;
  manager_name?: string | null;
  allocated?: number | string | null;
  allocated_amount?: number | string | null;
  current_value?: number | string | null;
  return_pct?: number | string | null;
  status?: string | null;
};

export type AdminManagerSummary = {
  id: number | string;
  name: string;
  email: string;
  strategy?: string | null;
  aum?: number | string | null;
  performance_fee?: number | string | null;
  status?: string | null;
};

export type ManagerLinkItem = {
  id: string;
  name: string;
  email: string;
  invested: string;
  profit: string;
};

export type ManagerRow = {
  id: string;
  name: string;
  email: string;
  accountId: string;
  balance: string;
  profit: string;
  share: string;
  risk: 'Low' | 'Medium' | 'High';
  investorsCount: number;
  investorsList: ManagerLinkItem[];
  role: string;
  experience: string;
  phone: string;
  avatar: string;
  strategy: string;
  aum: string;
  performanceFee: string;
  status: string;
};

export const DEFAULT_MANAGER_ROW: ManagerRow = {
  id: '-',
  name: 'Loading...',
  email: '',
  accountId: '-',
  balance: '$0.00',
  profit: 'Loading',
  share: '0%',
  risk: 'Medium',
  investorsCount: 0,
  investorsList: [],
  role: 'Loading',
  experience: 'Loading',
  phone: 'Loading',
  avatar: 'https://ui-avatars.com/api/?name=Loading&background=1e293b&color=34d399&size=128&bold=true',
  strategy: 'Loading',
  aum: '$0.00',
  performanceFee: '0%',
  status: 'Inactive',
};

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export const formatCurrency = (value: unknown): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(toNumber(value));

export const formatPercent = (value: unknown): string => {
  const normalized = toNumber(value);
  return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}%`;
};

export const getStatusTone = (status?: string | null): 'Low' | 'Medium' | 'High' => {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'active' || normalized === 'operational') {
    return 'Low';
  }
  if (normalized === 'suspended' || normalized === 'inactive' || normalized === 'disabled') {
    return 'High';
  }
  return 'Medium';
};

export const buildManagerRows = (
  managers: AdminManagerSummary[] | null,
  investments: ClientInvestmentSummary[] | null,
  clientProfile: ClientProfileSummary | null,
): ManagerRow[] => {
  const managerList = Array.isArray(managers) ? managers : [];
  const investmentList = Array.isArray(investments) ? investments : [];
  const clientName = clientProfile?.full_name?.trim() || 'Current Client';
  const clientEmail = clientProfile?.email?.trim() || '';

  return managerList.map((manager) => {
    const accountId = `MGR-${String(manager.id)}`;
    const strategy = String(manager.strategy || 'Quantitative Grid');
    const aum = formatCurrency(manager.aum);
    const performanceFee = typeof manager.performance_fee === 'number'
      ? `${manager.performance_fee}%`
      : String(manager.performance_fee || '0%');
    const status = String(manager.status || 'Active');
    const linkedInvestments = investmentList.filter(
      (investment) =>
        String(investment.manager || investment.manager_name || '').trim().toLowerCase() ===
        manager.name.trim().toLowerCase(),
    );
    const linkedRows = linkedInvestments.map((investment) => ({
      id: String(investment.id),
      name: clientName,
      email: clientEmail,
      invested: formatCurrency(investment.allocated ?? investment.allocated_amount),
      profit: formatPercent(investment.return_pct),
    }));

    return {
      id: String(manager.id),
      name: manager.name,
      email: manager.email,
      accountId,
      balance: aum,
      profit: strategy,
      share: performanceFee,
      risk: getStatusTone(status),
      investorsCount: linkedRows.length,
      investorsList: linkedRows,
      role: strategy,
      experience: `Linked ${linkedRows.length} live investment${linkedRows.length === 1 ? '' : 's'}`,
      phone: `AUM ${aum}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=1e293b&color=34d399&size=128&bold=true`,
      strategy,
      aum,
      performanceFee,
      status,
    };
  });
};

export const pickAssignedManager = (
  managers: ManagerRow[],
  investments: ClientInvestmentSummary[] | null,
): ManagerRow | null => {
  const investmentList = Array.isArray(investments) ? investments : [];
  const preferredManagerName = investmentList.find((investment) => {
    const managerName = String(investment.manager || investment.manager_name || '').trim();
    return managerName.length > 0;
  })?.manager || investmentList.find((investment) => String(investment.manager_name || '').trim().length > 0)?.manager_name || '';

  if (preferredManagerName) {
    const matched = managers.find(
      (manager) => manager.name.trim().toLowerCase() === String(preferredManagerName).trim().toLowerCase(),
    );
    if (matched) {
      return matched;
    }
  }

  return managers[0] || null;
};
