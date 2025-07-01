import React from 'react';
import { useOffline } from '../hooks/useOffline';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useOffline();

  if (isOnline && !wasOffline) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium transition-colors ${
      isOnline 
        ? 'bg-green-600 text-white' 
        : 'bg-red-600 text-white'
    }`}>
      <div className="flex items-center justify-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online - syncing data...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline - some features may be limited</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;