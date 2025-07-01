// Utility functions for jackpot processing
import { Session, Bet, JackpotResult } from '../types';

export interface JackpotCalculation {
  winningNumber: number;
  totalPool: number;
  adminFee: number;
  winnerCount: number;
  winnerPayout: number;
  isZeroBetWin: boolean;
  numberTotals: { [key: number]: number };
}

/**
 * Calculate jackpot result for a session
 */
export function calculateJackpot(session: Session, bets: Bet[]): JackpotCalculation {
  const sessionBets = bets.filter(bet => bet.sessionId === session.id);
  
  // Initialize number totals (0-9)
  const numberTotals: { [key: number]: number } = {};
  for (let i = 0; i <= 9; i++) {
    numberTotals[i] = 0;
  }

  // Calculate total bets per number
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
    // Standard rule: 90% to winners, 10% to admin
    adminFee = totalPool * 0.1;
    const winnersPool = totalPool * 0.9;
    const winners = sessionBets.filter(bet => bet.number === winningNumber);
    winnerCount = winners.length;
    winnerPayout = winnerCount > 0 ? winnersPool / winnerCount : 0;
  }

  return {
    winningNumber,
    totalPool,
    adminFee,
    winnerCount,
    winnerPayout,
    isZeroBetWin,
    numberTotals
  };
}

/**
 * Validate if a session is ready for jackpot processing
 */
export function isSessionReadyForProcessing(session: Session, currentTime: Date): boolean {
  if (!session.isActive) return false;
  
  const sessionEndTime = new Date(`${session.date}T${session.time}:00`);
  return currentTime >= sessionEndTime;
}

/**
 * Get sessions that need processing
 */
export function getSessionsNeedingProcessing(sessions: Session[], currentTime: Date): Session[] {
  return sessions.filter(session => isSessionReadyForProcessing(session, currentTime));
}

/**
 * Format jackpot result for logging
 */
export function formatJackpotResult(calculation: JackpotCalculation, sessionId: string): string {
  return `Jackpot Result for ${sessionId}:
    Winning Number: ${calculation.winningNumber}
    Total Pool: ₹${calculation.totalPool}
    Admin Fee: ₹${calculation.adminFee}
    Winner Count: ${calculation.winnerCount}
    Winner Payout: ₹${calculation.winnerPayout}
    Zero Bet Win: ${calculation.isZeroBetWin}
    Number Distribution: ${JSON.stringify(calculation.numberTotals)}`;
}

/**
 * Validate jackpot calculation
 */
export function validateJackpotCalculation(calculation: JackpotCalculation): boolean {
  // Basic validation checks
  if (calculation.winningNumber < 0 || calculation.winningNumber > 9) return false;
  if (calculation.totalPool < 0) return false;
  if (calculation.adminFee < 0) return false;
  if (calculation.winnerCount < 0) return false;
  if (calculation.winnerPayout < 0) return false;
  
  // Validate that admin fee + winner payouts don't exceed total pool
  const totalWinnerPayouts = calculation.winnerCount * calculation.winnerPayout;
  const totalDistributed = calculation.adminFee + totalWinnerPayouts;
  
  // Allow for small floating point differences
  if (Math.abs(totalDistributed - calculation.totalPool) > 0.01) return false;
  
  return true;
}