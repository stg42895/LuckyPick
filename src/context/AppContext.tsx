import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, Bet, JackpotResult, Transaction, WithdrawalRequest } from '../types';
import { format, addMinutes, isBefore, isAfter } from 'date-fns';
import { offlineStorage } from '../utils/offlineStorage';
import { useOffline } from '../hooks/useOffline';

interface AppContextType {
  sessions: Session[];
  bets: Bet[];
  results: JackpotResult[];
  transactions: Transaction[];
  withdrawals: WithdrawalRequest[];
  createSession: (time: string, name?: string) => void;
  placeBet: (sessionId: string, number: number, amount: number, userId: string) => boolean;
  processJackpot: (sessionId: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  requestWithdrawal: (userId: string, amount: number) => void;
  processWithdrawal: (id: string, status: 'approved' | 'rejected') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [results, setResults] = useState<JackpotResult[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const { isOnline } = useOffline();

  // Initialize offline storage and load cached data
  useEffect(() => {
    const initializeOfflineData = async () => {
      try {
        await offlineStorage.init();
        
        // Load cached data when offline
        if (!isOnline) {
          const cachedSessions = await offlineStorage.getData('sessions');
          const cachedBets = await offlineStorage.getData('bets');
          const cachedResults = await offlineStorage.getData('results');
          const cachedTransactions = await offlineStorage.getData('transactions');

          if (cachedSessions?.length) setSessions(cachedSessions);
          if (cachedBets?.length) setBets(cachedBets);
          if (cachedResults?.length) setResults(cachedResults);
          if (cachedTransactions?.length) setTransactions(cachedTransactions);
        }
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    initializeOfflineData();
  }, [isOnline]);

  // Initialize default sessions
  useEffect(() => {
    if (sessions.length === 0) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const defaultSessions: Session[] = [
        {
          id: 'session-1330',
          time: '13:30',
          date: today,
          isActive: true,
          betsCloseAt: '13:25',
          totalPool: 0,
          createdBy: 'system'
        },
        {
          id: 'session-1830',
          time: '18:30',
          date: today,
          isActive: true,
          betsCloseAt: '18:25',
          totalPool: 0,
          createdBy: 'system'
        }
      ];
      setSessions(defaultSessions);
      
      // Cache default sessions
      defaultSessions.forEach(session => {
        offlineStorage.saveData('sessions', session);
      });
    }
  }, [sessions.length]);

  // Save data to offline storage whenever state changes
  useEffect(() => {
    sessions.forEach(session => {
      offlineStorage.saveData('sessions', session);
    });
  }, [sessions]);

  useEffect(() => {
    bets.forEach(bet => {
      offlineStorage.saveData('bets', bet);
    });
  }, [bets]);

  useEffect(() => {
    results.forEach(result => {
      offlineStorage.saveData('results', result);
    });
  }, [results]);

  useEffect(() => {
    transactions.forEach(transaction => {
      offlineStorage.saveData('transactions', transaction);
    });
  }, [transactions]);

  const createSession = (time: string, name?: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [hours, minutes] = time.split(':');
    const closeTime = format(addMinutes(new Date(`${today}T${time}:00`), -5), 'HH:mm');
    
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name,
      time,
      date: today,
      isActive: true,
      betsCloseAt: closeTime,
      totalPool: 0,
      createdBy: 'admin'
    };
    
    setSessions(prev => [...prev, newSession]);

    // Save offline action if offline
    if (!isOnline) {
      offlineStorage.saveOfflineAction({
        type: 'createSession',
        data: newSession
      });
    }
  };

  const placeBet = (sessionId: string, number: number, amount: number, userId: string): boolean => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const closeTime = new Date(`${today}T${session.betsCloseAt}:00`);

    if (isAfter(now, closeTime)) return false;

    const newBet: Bet = {
      id: `bet-${Date.now()}`,
      userId,
      sessionId,
      number,
      amount,
      timestamp: now
    };

    setBets(prev => [...prev, newBet]);
    
    // Update session total pool
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, totalPool: s.totalPool + amount }
        : s
    ));

    // Save offline action if offline
    if (!isOnline) {
      offlineStorage.saveOfflineAction({
        type: 'placeBet',
        data: newBet
      });
    }

    return true;
  };

  const processJackpot = (sessionId: string) => {
    const sessionBets = bets.filter(bet => bet.sessionId === sessionId);
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session || sessionBets.length === 0) return;

    // Calculate total bets per number
    const numberTotals: { [key: number]: number } = {};
    for (let i = 0; i <= 9; i++) {
      numberTotals[i] = 0;
    }

    sessionBets.forEach(bet => {
      numberTotals[bet.number] += bet.amount;
    });

    // Find winning number (lowest total, or lowest number in case of tie)
    let winningNumber = 0;
    let lowestTotal = numberTotals[0];

    for (let i = 1; i <= 9; i++) {
      if (numberTotals[i] < lowestTotal) {
        winningNumber = i;
        lowestTotal = numberTotals[i];
      }
    }

    const totalPool = session.totalPool;
    const isZeroBetWin = lowestTotal === 0 && totalPool > 0;
    
    let adminFee: number;
    let winnerPayout: number;
    let winnerCount: number;

    if (isZeroBetWin) {
      // Zero bet rule: 100% to admin
      adminFee = totalPool;
      winnerPayout = 0;
      winnerCount = 0;
    } else {
      // Standard rule: 90% to winners, 10% to admin
      adminFee = totalPool * 0.1;
      const winnersPool = totalPool * 0.9;
      const winners = sessionBets.filter(bet => bet.number === winningNumber);
      winnerCount = winners.length;
      winnerPayout = winnerCount > 0 ? winnersPool / winnerCount : 0;
    }

    const result: JackpotResult = {
      id: `result-${Date.now()}`,
      sessionId,
      winningNumber,
      totalPool,
      adminFee,
      winnerCount,
      winnerPayout,
      timestamp: new Date(),
      isZeroBetWin
    };

    setResults(prev => [...prev, result]);

    // Mark session as inactive
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, isActive: false } : s
    ));

    // Save offline action if offline
    if (!isOnline) {
      offlineStorage.saveOfflineAction({
        type: 'processJackpot',
        data: { sessionId, result }
      });
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `txn-${Date.now()}`
    };
    setTransactions(prev => [...prev, newTransaction]);

    // Save offline action if offline
    if (!isOnline) {
      offlineStorage.saveOfflineAction({
        type: 'addTransaction',
        data: newTransaction
      });
    }
  };

  const requestWithdrawal = (userId: string, amount: number) => {
    const newWithdrawal: WithdrawalRequest = {
      id: `withdrawal-${Date.now()}`,
      userId,
      amount,
      status: 'pending',
      requestedAt: new Date()
    };
    setWithdrawals(prev => [...prev, newWithdrawal]);

    // Save offline action if offline
    if (!isOnline) {
      offlineStorage.saveOfflineAction({
        type: 'requestWithdrawal',
        data: newWithdrawal
      });
    }
  };

  const processWithdrawal = (id: string, status: 'approved' | 'rejected') => {
    setWithdrawals(prev => prev.map(w => 
      w.id === id 
        ? { ...w, status, processedAt: new Date(), processedBy: 'admin' }
        : w
    ));

    // Save offline action if offline
    if (!isOnline) {
      offlineStorage.saveOfflineAction({
        type: 'processWithdrawal',
        data: { id, status }
      });
    }
  };

  return (
    <AppContext.Provider value={{
      sessions,
      bets,
      results,
      transactions,
      withdrawals,
      createSession,
      placeBet,
      processJackpot,
      addTransaction,
      requestWithdrawal,
      processWithdrawal
    }}>
      {children}
    </AppContext.Provider>
  );
};