import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Users, DollarSign, Trophy } from 'lucide-react';
import { format, isAfter } from 'date-fns';

const SessionManagement: React.FC = () => {
  const { sessions, bets, createSession, processJackpot } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Auto-process jackpots for sessions that have ended
      sessions.forEach(session => {
        if (session.isActive) {
          const today = format(new Date(), 'yyyy-MM-dd');
          const sessionDateTime = new Date(`${today}T${session.time}:00`);
          
          if (isAfter(currentTime, sessionDateTime)) {
            processJackpot(session.id);
          }
        }
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [sessions, processJackpot, currentTime]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Session Management</h2>
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
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {session.isActive ? 'Active' : 'Completed'}
                  </span>
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
                    <div key={number} className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-semibold text-gray-900">{number}</div>
                      <div className="text-xs text-gray-600">₹{amount}</div>
                    </div>
                  ))}
                </div>
              </div>
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