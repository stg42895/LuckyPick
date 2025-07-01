import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Clock, Trophy, Wallet, LogOut } from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import BettingModal from './BettingModal';
import UserWallet from './UserWallet';

const UserDashboard: React.FC = () => {
  const { user, logout, updateWallet } = useAuth();
  const { sessions, results, bets, transactions, addTransaction } = useApp();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showWallet, setShowWallet] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-credit winnings to user wallet
  useEffect(() => {
    if (!user) return;

    const userWinTransactions = transactions.filter(
      t => t.userId === user.id && t.type === 'win' && t.status === 'completed'
    );

    userWinTransactions.forEach(winTransaction => {
      // Check if this win has already been credited to wallet
      const existingWalletCredit = transactions.find(
        t => t.userId === user.id && 
        t.type === 'deposit' && 
        t.description.includes(`Win credit: ${winTransaction.id}`)
      );

      if (!existingWalletCredit) {
        // Credit the win to user's wallet
        updateWallet(winTransaction.amount);
        
        // Create a transaction record for the wallet credit
        addTransaction({
          userId: user.id,
          type: 'deposit',
          amount: winTransaction.amount,
          status: 'completed',
          timestamp: new Date(),
          description: `Win credit: ${winTransaction.id} - Jackpot winnings (9x payout)`
        });
      }
    });
  }, [transactions, user, updateWallet, addTransaction]);

  const getTimeRemaining = (sessionTime: string, betsCloseAt: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const closeTime = new Date(`${today}T${betsCloseAt}:00`);
    const sessionDateTime = new Date(`${today}T${sessionTime}:00`);
    
    if (isAfter(currentTime, sessionDateTime)) {
      return 'Session Ended';
    }
    
    if (isAfter(currentTime, closeTime)) {
      return 'Betting Closed';
    }

    const diff = closeTime.getTime() - currentTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const canPlaceBet = (betsCloseAt: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const closeTime = new Date(`${today}T${betsCloseAt}:00`);
    return isBefore(currentTime, closeTime);
  };

  const getUserBetsForSession = (sessionId: string) => {
    return bets.filter(bet => bet.sessionId === sessionId && bet.userId === user?.id);
  };

  const getSessionResult = (sessionId: string) => {
    return results.find(result => result.sessionId === sessionId);
  };

  const getUserWinnings = (sessionId: string) => {
    const result = getSessionResult(sessionId);
    if (!result) return null;

    const userBets = bets.filter(
      bet => bet.sessionId === sessionId && 
      bet.userId === user?.id && 
      bet.number === result.winningNumber
    );

    if (userBets.length > 0) {
      // Calculate total winnings for this user (9x each bet)
      const totalWinnings = userBets.reduce((sum, bet) => sum + (bet.amount * 9), 0);
      return {
        won: true,
        amount: totalWinnings,
        winningNumber: result.winningNumber
      };
    }

    return { won: false, winningNumber: result.winningNumber };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LuckyPick</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.fullName || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowWallet(true)}
                className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span>₹{user?.walletBalance}</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Sessions */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Sessions</h2>
            <div className="space-y-4">
              {sessions.filter(session => session.isActive).map(session => {
                const timeRemaining = getTimeRemaining(session.time, session.betsCloseAt);
                const canBet = canPlaceBet(session.betsCloseAt);
                const userBets = getUserBetsForSession(session.id);
                const totalUserBet = userBets.reduce((sum, bet) => sum + bet.amount, 0);
                const result = getSessionResult(session.id);

                return (
                  <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {session.name || `Session ${session.time}`}
                        </h3>
                        <p className="text-gray-600">Time: {session.time}</p>
                        <p className="text-sm text-gray-500">
                          Betting closes at {session.betsCloseAt}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-blue-600 mb-2">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-mono">{timeRemaining}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Pool: ₹{session.totalPool}
                        </p>
                      </div>
                    </div>

                    {userBets.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Your bets: {userBets.map(bet => `${bet.number} (₹${bet.amount})`).join(', ')}
                        </p>
                        <p className="text-sm text-blue-600">Total: ₹{totalUserBet}</p>
                        <p className="text-xs text-blue-500">Potential win: ₹{totalUserBet * 9} (9x payout)</p>
                      </div>
                    )}

                    {result && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Trophy className="w-4 h-4 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium text-yellow-800">
                              Result: Number {result.winningNumber} Won!
                            </span>
                          </div>
                          {getUserWinnings(session.id)?.won && (
                            <div className="flex items-center text-green-600">
                              <span className="text-sm font-medium">
                                You won ₹{getUserWinnings(session.id)?.amount}!
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedSession(session.id)}
                      disabled={!canBet || !!result}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        canBet && !result
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {result ? 'Session Completed' : canBet ? 'Place Bet' : 'Betting Closed'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Previous Results */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Previous Results</h2>
            <div className="space-y-4">
              {results.slice(-5).reverse().map(result => {
                const session = sessions.find(s => s.id === result.sessionId);

                return (
                  <div key={result.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {session?.name || `Session ${session?.time}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(result.timestamp, 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-yellow-600">
                          <Trophy className="w-4 h-4 mr-1" />
                          <span className="font-bold text-lg">{result.winningNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {selectedSession && (
        <BettingModal
          sessionId={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {showWallet && (
        <UserWallet onClose={() => setShowWallet(false)} />
      )}
    </div>
  );
};

export default UserDashboard;