import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Search, DollarSign, Trophy } from 'lucide-react';
import { format } from 'date-fns';

const UserManagement: React.FC = () => {
  const { bets, transactions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock users data - in a real app, this would come from the context
  const users = [
    {
      id: 'user1',
      email: 'test@gmail.com',
      fullName: 'Demo User',
      isAdmin: false,
      walletBalance: 1000,
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'admin1',
      email: 'Admin@admin.com',
      fullName: 'System Admin',
      isAdmin: true,
      walletBalance: 0,
      createdAt: new Date('2024-01-01')
    }
  ];

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserStats = (userId: string) => {
    const userBets = bets.filter(bet => bet.userId === userId);
    const userTransactions = transactions.filter(t => t.userId === userId);
    const totalBetAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalWinnings = userTransactions
      .filter(t => t.type === 'win')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalBets: userBets.length,
      totalBetAmount,
      totalWinnings,
      totalTransactions: userTransactions.length
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* User Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Wallet Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{users.reduce((sum, user) => sum + user.walletBalance, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Bettors</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(bets.map(bet => bet.userId)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Bets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bet Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Winnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => {
                const stats = getUserStats(user.id);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isAdmin 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{user.walletBalance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.totalBets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{stats.totalBetAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{stats.totalWinnings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(user.createdAt, 'MMM dd, yyyy')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'No users match your search criteria.' : 'No users have registered yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserManagement;