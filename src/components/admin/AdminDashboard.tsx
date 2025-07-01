import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useAutoJackpot } from '../../hooks/useAutoJackpot';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  LogOut,
  DollarSign,
  Clock,
  Trophy,
  Zap
} from 'lucide-react';
import SessionManagement from './SessionManagement';
import WithdrawalManagement from './WithdrawalManagement';
import UserManagement from './UserManagement';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const { sessions, bets, results, withdrawals } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'withdrawals' | 'users'>('overview');

  // Enable auto jackpot processing
  useAutoJackpot();

  const totalPool = sessions.reduce((sum, session) => sum + session.totalPool, 0);
  const totalBets = bets.length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  // Admin earnings come only from zero bet wins
  const totalAdminEarnings = results.reduce((sum, result) => sum + (result.isZeroBetWin ? result.adminFee : 0), 0);
  const activeSessionsCount = sessions.filter(s => s.isActive).length;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">LuckyPick Lottery Management</p>
                <div className="flex items-center text-green-600 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  <span>Auto Jackpot Active</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow-md p-4">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                  <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    <Zap className="w-4 h-4 mr-1" />
                    <span>Auto Processing Enabled</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Pool</p>
                        <p className="text-2xl font-bold text-gray-900">₹{totalPool}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Trophy className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Admin Earnings</p>
                        <p className="text-2xl font-bold text-gray-900">₹{totalAdminEarnings}</p>
                        <p className="text-xs text-gray-500">Zero bet wins only</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Bets</p>
                        <p className="text-2xl font-bold text-gray-900">{totalBets}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Users className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
                        <p className="text-2xl font-bold text-gray-900">{pendingWithdrawals}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">{activeSessionsCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auto Jackpot Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto Jackpot System - 9x Payout Rule</h3>
                      <p className="text-gray-700 mb-3">
                        Jackpots are automatically calculated and published when sessions reach their end time. 
                        Winners receive 9 times their bet amount with no admin commission.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="font-medium text-gray-900">Winning Logic</p>
                          <p className="text-gray-600">Number with lowest total bets wins</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="font-medium text-gray-900">Payout Rule</p>
                          <p className="text-gray-600">Each winner gets 9x their bet amount</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="font-medium text-gray-900">Zero Bet Rule</p>
                          <p className="text-gray-600">100% to admin if no bets on winner</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Results */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Auto-Processed Results</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Session
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Winning Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Pool
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payout Rule
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Winners
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Processed At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.slice(-5).reverse().map(result => {
                          const session = sessions.find(s => s.id === result.sessionId);
                          return (
                            <tr key={result.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {session?.name || session?.time}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  {result.winningNumber}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{result.totalPool}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                {result.isZeroBetWin ? 'Zero bet win' : '9x multiplier'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.winnerCount}
                                {result.isZeroBetWin && (
                                  <span className="ml-1 text-xs text-orange-600">(Zero bet)</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(result.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sessions' && <SessionManagement />}
            {activeTab === 'withdrawals' && <WithdrawalManagement />}
            {activeTab === 'users' && <UserManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;