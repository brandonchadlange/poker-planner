import type { GameState } from "../types.js";

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function createInitialGameState(
  gameId: string,
  hostId: string,
  hostName: string
): GameState {
  return {
    gameId,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        isHost: true,
      },
    ],
    currentIssue: null,
    votes: [],
    votingInProgress: false,
    votesRevealed: false,
    issues: [],
  };
}

export function calculateAverage(votes: number[]): number {
  if (votes.length === 0) return 0;
  const sum = votes.reduce((a, b) => a + b, 0);
  return Math.round((sum / votes.length) * 10) / 10;
}

export function calculateMedian(votes: number[]): number {
  if (votes.length === 0) return 0;
  const sorted = [...votes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
