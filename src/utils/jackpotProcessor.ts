// Utility functions for jackpot processing
import { Session, Bet } from '../types';

export interface JackpotCalculation {
  winningNumber: number;
  totalPool: number;
  adminFee: number;
  winnerCount: number;
  winnerPayout: number;
  isZeroBetWin: boolean;
  numberTotals: { [key: number]: number };
  payoutRule: string;
}

/**
 * Calculate jackpot result for a session using 9x payout rule
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
  let payoutRule: string;

  if (isZeroBetWin) {
    // Zero bet rule: 100% to admin (no one bet on winning number)
    adminFee = totalPool;
    winnerPayout = 0;
    winnerCount = 0;
    payoutRule = 'Zero bet win - 100% to admin';
  } else {
    // New 9x payout rule: Each winner gets 9x their bet amount
    adminFee = 0; // No admin commission
    const winners = sessionBets.filter(bet => bet.number === winningNumber);
    winnerCount = winners.length;
    
    // For display purposes, show the 9x amount (actual payouts are calculated per bet)
    winnerPayout = winnerCount > 0 ? winners[0].amount * 9 : 0;
    payoutRule = '9x multiplier - each winner gets 9 times their bet amount';
  }

  return {
    winningNumber,
    totalPool,
    adminFee,
    winnerCount,
    winnerPayout,
    isZeroBetWin,
    numberTotals,
    payoutRule
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
    Payout Rule: ${calculation.payoutRule}
    Winner Payout: ${calculation.isZeroBetWin ? '₹0' : '₹' + calculation.winnerPayout + ' per winner (9x bet amount)'}
    Zero Bet Win: ${calculation.isZeroBetWin}
    Number Distribution: ${JSON.stringify(calculation.numberTotals)}`;
}

/**
 * Validate jackpot calculation for 9x payout rule
 */
export function validateJackpotCalculation(calculation: JackpotCalculation): boolean {
  // Basic validation checks
  if (calculation.winningNumber < 0 || calculation.winningNumber > 9) return false;
  if (calculation.totalPool < 0) return false;
  if (calculation.adminFee < 0) return false;
  if (calculation.winnerCount < 0) return false;
  if (calculation.winnerPayout < 0) return false;
  
  // For 9x payout rule, admin fee should be 0 unless it's a zero bet win
  if (!calculation.isZeroBetWin && calculation.adminFee > 0) return false;
  
  // For zero bet wins, admin fee should equal total pool
  if (calculation.isZeroBetWin && calculation.adminFee !== calculation.totalPool) return false;
  
  return true;
}