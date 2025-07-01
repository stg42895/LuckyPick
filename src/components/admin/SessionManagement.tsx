import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Users, DollarSign, Trophy, Clock, CheckCircle } from 'lucide-react';
import { format, isAfter } from 'date-fns';

const SessionManagement: React.FC = () => {
  const { sessions, bets, createSession, processJackpot, results } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const handleCreateSession = () => {
    if (!newSessionTime) return;
    
    createSession(newSessionTime, newSessionName || undefined);
    setNewSessionTime('');
    setNewSessionName('');
    setShowCreateModal(false);
  };

  const getSessionBets = (sessionId: string) => {
    return bets.filter(bet => bet.sessionId === sessionId);
  };

  const getBetsByNumber = (sessionId: string) => {
    const sessionBets = getSessionBets(sessionId);
    const betsByNumber: { [key: number]: number } = {};
    
    for (let i = 0; i <= 9; i++) {
      betsByNumber[i] = 0;
    }
    
    sessionBets.forEach(bet => {
      betsByNumber[bet.number] += bet.amount;
    });
    
    return betsByNumber;
  };

  const getSessionResult = (sessionId: string) => {
    return results.find(result => result.sessionId === sessionId);
  };

  const getSessionStatus = (session: any) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const sessionEndTime = new Date(`${today}T${session.time}:00`);
    const result = getSessionResult(session.id);
    
    if (result) {
      return { status: 'completed', color: 'bg-green-100 text-green-800', text: 'Completed' };
    } else if (!session.isActive) {
      return { status: 'processed', color: 'bg-blue-100 text-blue-800', text: 'Processed' };
    } else if (isAfter(currentTime, sessionEndTime)) {
      return { status: 'processing', color: 'bg-yellow-100 text-yellow-800', text: 'Processing...' };
    } else {
      return { status: 'active', color: 'bg-green-100 text-green-800', text: 'Active' };
    }
  };

  const getTimeUntilSession = (sessionTime: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const sessionDateTime = new Date(`${today}T${sessionTime}:00`);
    const diff = sessionDateTime.getTime() - currentTime.getTime();
    
    if (diff <= 0) return 'Session Time Reached';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Jackpots are automatically processed at session end time
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sessions.map(session => {
          const sessionBets = getSessionBets(session.id);
          const betsByNumber = getBetsByNumber(session.id);
          const uniqueBettors = new Set(sessionBets.map(bet => bet.userId)).size;
          const sessionStatus = getSessionStatus(session);
          const result = getSessionResult(session.id);
          const timeUntilSession = getTimeUntilSession(session.time);
          
          return (
            <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {session.name || `Session ${session.time}`}
                  </h3>
                  <p className="text-gray-600">Time: {session.time}</p>
                  <p className="text-sm text-gray-500">
                    Created by: {session.createdBy}
                  </p>
                  {session.isActive && (
                    <p className="text-sm text-blue-600 font-medium">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {timeUntilSession}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sessionStatus.color}`}>
                    {sessionStatus.text}
                  </span>
                  {result && (
                    <div className="mt-2 text-right">
                      <div className="flex items-center text-yellow-600 text-sm">
                        <Trophy className="w-4 h-4 mr-1" />
                        <span className="font-bold">Winner: {result.winningNumber}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {result.winnerCount} winners, ₹{result.winnerPayout} each
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                  </div>
                  <p className="text-sm text-gray-600">Total Pool</p>
                  <p className="font-semibold">₹{session.totalPool}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-green-600 mb-1">
                    <Users className="w-4 h-4 mr-1" />
                  </div>
                  <p className="text-sm text-gray-600">Bettors</p>
                  <p className="font-semibold">{uniqueBettors}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-purple-600 mb-1">
                    <Trophy className="w-4 h-4 mr-1" />
                  </div>
                  <p className="text-sm text-gray-600">Total Bets</p>
                  <p className="font-semibold">{sessionBets.length}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bets by Number</h4>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(betsByNumber).map(([number, amount]) => (
                    <div 
                      key={number} 
                      className={`text-center p-2 rounded ${
                        result && result.winningNumber === parseInt(number)
                          ? 'bg-yellow-100 border-2 border-yellow-400'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 flex items-center justify-center">
                        {number}
                        {result && result.winningNumber === parseInt(number) && (
                          <CheckCircle className="w-3 h-3 ml-1 text-yellow-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600">₹{amount}</div>
                    </div>
                  ))}
                </div>
              </div>

              {result && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Result Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Admin Fee:</p>
                      <p className="font-semibold text-green-600">₹{result.adminFee}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Winners Pool:</p>
                      <p className="font-semibold text-blue-600">
                        ₹{result.totalPool - result.adminFee}
                      </p>
                    </div>
                    {result.isZeroBetWin && (
                      <div className="col-span-2">
                        <p className="text-xs text-orange-600 font-medium">
                          Zero Bet Win: No one bet on winning number
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Session</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Time *
                  </label>
                  <input
                    type="time"
                    value={newSessionTime}
                    onChange={(e) => setNewSessionTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Evening Special"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;