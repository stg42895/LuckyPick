import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getSessionsNeedingProcessing, formatJackpotResult, calculateJackpot } from '../utils/jackpotProcessor';

/**
 * Hook for automatic jackpot processing
 */
export const useAutoJackpot = () => {
  const { sessions, bets, processJackpot } = useApp();
  const processedSessionsRef = useRef(new Set<string>());

  useEffect(() => {
    const checkAndProcessJackpots = () => {
      const currentTime = new Date();
      const sessionsNeedingProcessing = getSessionsNeedingProcessing(sessions, currentTime);

      sessionsNeedingProcessing.forEach(session => {
        // Avoid processing the same session multiple times
        if (!processedSessionsRef.current.has(session.id)) {
          console.log(`Auto-processing jackpot for session ${session.id} at ${session.time}`);
          
          // Calculate and log the result before processing
          const sessionBets = bets.filter(bet => bet.sessionId === session.id);
          if (sessionBets.length > 0) {
            const calculation = calculateJackpot(session, bets);
            console.log(formatJackpotResult(calculation, session.id));
          }
          
          processJackpot(session.id);
          processedSessionsRef.current.add(session.id);
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkAndProcessJackpots, 30000);
    
    // Also check immediately
    checkAndProcessJackpots();

    return () => clearInterval(interval);
  }, [sessions, bets, processJackpot]);

  // Clean up processed sessions that are no longer in the sessions list
  useEffect(() => {
    const currentSessionIds = new Set(sessions.map(s => s.id));
    const processedIds = Array.from(processedSessionsRef.current);
    
    processedIds.forEach(id => {
      if (!currentSessionIds.has(id)) {
        processedSessionsRef.current.delete(id);
      }
    });
  }, [sessions]);
};