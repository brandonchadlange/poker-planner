export interface Player {
  id: string;
  name: string;
}

export interface Vote {
  playerId: string;
  playerName: string;
  value: number | string | null;
  revealed: boolean;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  estimate?: number;
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentIssue: Issue | null;
  votes: Vote[];
  votingInProgress: boolean;
  votesRevealed: boolean;
  issues: Issue[];
}

export type GameEvent =
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "PLAYER_LEFT"; playerId: string }
  | { type: "VOTE_SUBMITTED"; vote: Vote }
  | { type: "VOTES_REVEALED"; votes: Vote[] }
  | { type: "VOTING_STARTED"; issue: Issue }
  | { type: "VOTING_RESET" }
  | { type: "ISSUE_ADDED"; issue: Issue }
  | { type: "ISSUE_SELECTED"; issue: Issue }
  | { type: "ISSUE_ESTIMATED"; issueId: string; estimate: number };
