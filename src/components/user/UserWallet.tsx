import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { X, DollarSign, Plus, CreditCard, Download, History } from 'lucide-react';
import { format } from 'date-fns';

interface UserWalletProps {
  onClose: () => void;
}

const UserWallet: React.FC<UserWalletProps> = ({ onClose }) => {
  const { user, updateWallet } = useAuth();
  const { transactions, addTransaction, requestWithdrawal } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return null;

  const userTransactions = transactions.filter(t => t.userId === user.id).slice(0, 10);

  const handleDeposit = async () => {
    if (depositAmount < 10) {
      setError('Minimum deposit amount is ₹10');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add money to wallet
      updateWallet(depositAmount);
      
      // Record transaction
      addTransaction({
        userId: user.id,
        type: 'deposit',
        amount: depositAmount,
        status: 'completed',
        timestamp: new Date(),
        description: `Wallet deposit via demo payment`
      });

      setSuccess(`₹${depositAmount} deposited successfully!`);
      setDepositAmount(100);
      
      setTimeout(() => {
        setSuccess('');
        setActiveTab('overview');
      }, 2000);
    } catch (err) {
      setError('Deposit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (withdrawAmount < 50) {
      setError('Minimum withdrawal amount is ₹50');
      return;
    }

    if (withdrawAmount > user.walletBalance) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Request withdrawal
      requestWithdrawal(user.id, withdrawAmount);
      
      // Deduct from wallet (pending approval)
      updateWallet(-withdrawAmount);
      
      // Record transaction
      addTransaction({
        userId: user.id,
        type: 'withdrawal',
        amount: withdrawAmount,
        status: 'pending',
        timestamp: new Date(),
        description: `Withdrawal request - pending admin approval`
      });

      setSuccess(`Withdrawal request of ₹${withdrawAmount} submitted!`);
      setWithdrawAmount(100);
      
      setTimeout(() => {
        setSuccess('');
        setActiveTab('overview');
      }, 2000);
    } catch (err) {
      setError('Withdrawal request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">My Wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet Balance */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-100">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-gray-900">₹{user.walletBalance}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: DollarSign },
              { id: 'deposit', label: 'Deposit', icon: Plus },
              { id: 'withdraw', label: 'Withdraw', icon: Download },
              { id: 'history', label: 'History', icon: History }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Money</span>
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Withdraw</span>
                </button>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Transactions</h4>
                <div className="space-y-2">
                  {userTransactions.slice(0, 5).map(transaction => (
                    <div key={transaction.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(transaction.timestamp, 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'deposit' || transaction.type === 'win' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}₹{transaction.amount}
                        </p>
                        <p className={`text-xs ${
                          transaction.status === 'completed' ? 'text-green-500' :
                          transaction.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Amounts</h4>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        depositAmount === amount
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                    min="10"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum deposit: ₹10</p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <button
                onClick={handleDeposit}
                disabled={loading || depositAmount < 10}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>{loading ? 'Processing...' : `Deposit ₹${depositAmount}`}</span>
              </button>
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Amounts</h4>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.filter(amount => amount <= user.walletBalance).map(amount => (
                    <button
                      key={amount}
                      onClick={() => setWithdrawAmount(amount)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        withdrawAmount === amount
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                    min="50"
                    max={user.walletBalance}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Minimum: ₹50</span>
                  <span>Available: ₹{user.walletBalance}</span>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Withdrawal requests are processed by admin within 24 hours.
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={loading || withdrawAmount < 50 || withdrawAmount > user.walletBalance}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{loading ? 'Processing...' : `Withdraw ₹${withdrawAmount}`}</span>
              </button>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Transaction History</h4>
              <div className="space-y-2">
                {userTransactions.map(transaction => (
                  <div key={transaction.id} className="flex justify-between items-start py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(transaction.timestamp, 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'deposit' || transaction.type === 'win' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}₹{transaction.amount}
                      </p>
                      <p className={`text-xs ${
                        transaction.status === 'completed' ? 'text-green-500' :
                        transaction.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {userTransactions.length === 0 && (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserWallet;