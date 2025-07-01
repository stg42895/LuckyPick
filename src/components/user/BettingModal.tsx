import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { X, DollarSign, Plus, Minus } from 'lucide-react';

interface BettingModalProps {
  sessionId: string;
  onClose: () => void;
}

const BettingModal: React.FC<BettingModalProps> = ({ sessionId, onClose }) => {
  const { sessions, placeBet, bets } = useApp();
  const { user, updateWallet } = useAuth();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const session = sessions.find(s => s.id === sessionId);
  const userBets = bets.filter(bet => bet.sessionId === sessionId && bet.userId === user?.id);

  if (!session || !user) {
    return null;
  }

  const handlePlaceBet = async () => {
    if (selectedNumber === null) {
      setError('Please select a number');
      return;
    }

    if (betAmount < 10) {
      setError('Minimum bet amount is ₹10');
      return;
    }

    if (betAmount > user.walletBalance) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = placeBet(sessionId, selectedNumber, betAmount, user.id);
      
      if (success) {
        // Deduct amount from wallet
        updateWallet(-betAmount);
        
        // Reset form
        setSelectedNumber(null);
        setBetAmount(10);
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError('Failed to place bet. Betting may be closed.');
      }
    } catch (err) {
      setError('Failed to place bet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const adjustBetAmount = (change: number) => {
    const newAmount = betAmount + change;
    if (newAmount >= 10 && newAmount <= user.walletBalance) {
      setBetAmount(newAmount);
    }
  };

  const quickAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Place Bet - {session.name || `Session ${session.time}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Bets */}
          {userBets.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Your Current Bets:</h4>
              <div className="flex flex-wrap gap-2">
                {userBets.map(bet => (
                  <span key={bet.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {bet.number}: ₹{bet.amount}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Total: ₹{userBets.reduce((sum, bet) => sum + bet.amount, 0)}
              </p>
            </div>
          )}

          {/* Number Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Number (0-9)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
                <button
                  key={number}
                  onClick={() => setSelectedNumber(number)}
                  className={`h-12 rounded-lg font-semibold transition-colors ${
                    selectedNumber === number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Bet Amount
            </label>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={amount > user.walletBalance}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    betAmount === amount
                      ? 'bg-blue-600 text-white'
                      : amount > user.walletBalance
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => adjustBetAmount(-10)}
                disabled={betAmount <= 10}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <div className="flex-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 10 && value <= user.walletBalance) {
                      setBetAmount(value);
                    }
                  }}
                  min="10"
                  max={user.walletBalance}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => adjustBetAmount(10)}
                disabled={betAmount + 10 > user.walletBalance}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Min: ₹10</span>
              <span>Wallet: ₹{user.walletBalance}</span>
            </div>
          </div>

          {/* Potential Winnings */}
          {selectedNumber !== null && betAmount >= 10 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 mb-1">Potential Winnings:</h4>
              <p className="text-lg font-bold text-green-600">₹{betAmount * 9}</p>
              <p className="text-xs text-green-600">9x your bet amount if you win!</p>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceBet}
            disabled={loading || selectedNumber === null || betAmount < 10 || betAmount > user.walletBalance}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Placing Bet...' : `Place Bet ₹${betAmount}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BettingModal;