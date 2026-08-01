export interface UserTransaction {
  id: string;
  type: 'Deposit' | 'Withdrawal';
  amount: string;
  status: 'Completed' | 'Pending';
  date: string;
}

export interface UserTicket {
  id: string;
  subject: string;
  status: 'Open' | 'Closed' | 'In Progress';
  date: string;
}

export interface TradingAccount {
  accNumber: string;
  type: string;
  balance: string;
  equity: string;
  leverage: string;
  activeTrades: number;
  /** 'manager' | 'investor' — indicates source table */
  accountRole?: 'manager' | 'investor';
  server?: string;
  currency?: string;
  marginFree?: string;
  status?: string;
}

export interface KycDocument {
  id: string;
  type: 'address_proof' | 'id_proof';
  label: string;
  status: 'pending' | 'approved' | 'rejected' | 'uploaded' | 'missing';
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  note?: string;
}

export interface BankDetails {
  paymentType: 'bank';
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  ifscSwift: string;
  branch?: string;
  country?: string;
}

export interface CryptoDetails {
  paymentType: 'crypto';
  cryptoAddress: string;
  network: string;
  coinType?: string;
}

export type PaymentDetails = BankDetails | CryptoDetails;

export interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'Suspended';
  verified: boolean;
  joined: string;
  country: string;
  avatar: string;
  /** Extended profile fields from ClientProfile model */
  tier?: string;
  kycStatus?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  /** Trading accounts list (manager + investor combined) */
  tradingAccounts?: TradingAccount[];
  /** Legacy single account — kept for backward compat */
  tradingAccount: TradingAccount;
  /** KYC documents */
  documents?: KycDocument[];
  /** Bank OR Crypto payment details */
  paymentDetails?: PaymentDetails;
  /** Legacy combined field — kept for backward compat */
  bankCrypto: {
    bankName: string;
    accountMask: string;
    cryptoWallet: string;
  };
  transactions: UserTransaction[];
  tickets: UserTicket[];
}

export interface CreateUserFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  country: string;
  balance: string;
  leverage: string;
  password?: string;
}
