export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  isAdmin: boolean;
  walletBalance: number;
  createdAt: Date;
}

export interface Session {
  id: string;
  name?: string;
  time: string;
  date: string;
  isActive: boolean;
  betsCloseAt: string;
  totalPool: number;
  createdBy: 'system' | 'admin';
}

export interface Bet {
  id: string;
  userId: string;
  sessionId: string;
  number: number;
  amount: number;
  timestamp: Date;
}

export interface JackpotResult {
  id: string;
  sessionId: string;
  winningNumber: number;
  totalPool: number;
  adminFee: number;
  winnerCount: number;
  winnerPayout: number;
  timestamp: Date;
  isZeroBetWin: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  description: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
}