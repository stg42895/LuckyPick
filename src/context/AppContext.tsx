import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, Bet, JackpotResult, Transaction, WithdrawalRequest } from '../types';
import { format, addMinutes, isAfter, parseISO } from 'date-fns';
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

  // Initialize today's sessions (2:30 PM and 7:00 PM) - Only run once
  useEffect(() => {
    const initializeTodaySessions = () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check if we already have sessions for today
      const todaySessions = sessions.filter(session => session.date === today);
      
      // Only create sessions if none exist for today
      if (todaySessions.length === 0) {
        console.log('Creating today\'s sessions for', today);
        
        const defaultSessions: Session[] = [
          {
            id: `session-1430-${today}`,
            name: 'Afternoon Draw',
            time: '14:30',
            date: today,
            isActive: true,
            betsCloseAt: '14:25',
            totalPool: 0,
            createdBy: 'system'
          },
          {
            id: `session-1900-${today}`,
            name: 'Evening Draw',
            time: '19:00',
            date: today,
            isActive: true,
            betsCloseAt: '18:55',
            totalPool: 0,
            createdBy: 'system'
          }
        ];
        
        setSessions(prev => {
          // Double check to avoid race conditions
          const existingToday = prev.filter(s => s.date === today);
          if (existingToday.length === 0) {
            return [...prev, ...defaultSessions];
          }
          return prev;
        });
        
        // Cache new sessions
        defaultSessions.forEach(session => {
          offlineStorage.saveData('sessions', session);
        });
      }
    };

    // Only initialize if sessions array is empty or no sessions for today
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySessions = sessions.filter(session => session.date === today);
    
    if (sessions.length === 0 || todaySessions.length === 0) {
      initializeTodaySessions();
    }
  }, [sessions.length]); // Only depend on sessions.length to avoid infinite loops

  // Auto Jackpot Processing System
  useEffect(() => {
    const processAutoJackpots = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      sessions.forEach(session => {
        if (session.isActive && session.date === today) {
          // Create session end time
          const sessionEndTime = new Date(`${today}T${session.time}:00`);
          
          // Check if current time has passed the session end time
          if (isAfter(now, sessionEndTime)) {
            console.log(`Auto-processing jackpot for session ${session.id} at ${session.time}`);
            processJackpot(session.id);
          }
        }
      });
    };

    // Check every 30 seconds for sessions that need processing
    const autoJackpotInterval = setInterval(processAutoJackpots, 30000);

    // Also check immediately
    processAutoJackpots();

    return () => clearInterval(autoJackpotInterval);
  }, [sessions]);

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
    
    if (!session) {
      return;
    }

    // If no bets, mark session as inactive
    if (sessionBets.length === 0) {
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, isActive: false } : s
      ));
      return;
    }

    // Calculate total bets per number (0-9)
    const numberTotals: { [key: number]: number } = {};
    for (let i = 0; i <= 9; i++) {
      numberTotals[i] = 0;
    }

    sessionBets.forEach(bet => {
      numberTotals[bet.number] += bet.amount;
    });

    // Find winning number (number with lowest total amount)
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
      // Zero bet rule: 100% to admin (no one bet on winning number)
      adminFee = totalPool;
      winnerPayout = 0;
      winnerCount = 0;
    } else {
      // New 9x payout rule: Each winner gets 9x their bet amount
      adminFee = 0; // No admin commission for regular wins
      const winners = sessionBets.filter(bet => bet.number === winningNumber);
      winnerCount = winners.length;
      winnerPayout = 0; // This will be calculated per bet (9x bet amount)

      // Create win transactions for winners with 9x payout
      if (winnerCount > 0) {
        winners.forEach(winnerBet => {
          const individualPayout = winnerBet.amount * 9; // 9x the bet amount
          
          const winTransaction: Transaction = {
            id: `win-${Date.now()}-${winnerBet.userId}-${Math.random()}`,
            userId: winnerBet.userId,
            type: 'win',
            amount: individualPayout,
            status: 'completed',
            timestamp: new Date(),
            description: `Jackpot win: ₹${winnerBet.amount} × 9 = ₹${individualPayout} for number ${winningNumber} in session ${session.time}`
          };
          
          setTransactions(prev => [...prev, winTransaction]);
        });
        
        // Set winnerPayout to the standard 9x amount for display purposes
        winnerPayout = winners[0].amount * 9;
      }
    }

    const result: JackpotResult = {
      id: `result-${Date.now()}`,
      sessionId,
      winningNumber,
      totalPool,
      adminFee,
      winnerCount,
      winnerPayout: isZeroBetWin ? 0 : winnerPayout,
      timestamp: new Date(),
      isZeroBetWin
    };

    setResults(prev => [...prev, result]);

    // Mark session as inactive
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, isActive: false } : s
    ));

    console.log(`Jackpot processed for session ${sessionId}:`, {
      winningNumber,
      totalPool,
      adminFee,
      winnerCount,
      winnerPayout: isZeroBetWin ? 0 : '9x bet amount per winner',
      isZeroBetWin
    });

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