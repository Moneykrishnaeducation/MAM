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
}

export interface BankCryptoDetails {
  bankName: string;
  accountMask: string;
  cryptoWallet: string;
}

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
  tradingAccount: TradingAccount;
  bankCrypto: BankCryptoDetails;
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
}
