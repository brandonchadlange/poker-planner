import {
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
} from "react";
import * as Ably from "ably";
import type { GameState, GameEvent, Vote, Issue } from "../types";

const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, "?", "☕"];

export function useAbly(
  gameId: string | null,
  playerId: string,
  playerName: string
) {
  // Channel stored in ref to avoid setState in effect
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const presenceInitializedRef = useRef(false);

  const handleGameEvent = useCallback((event: GameEvent) => {
    setGameState((prev) => {
      // If no game state exists yet, we can't process events
      // The host will initialize the state, and then events will be processed
      if (!prev) {
        // If this is a PLAYER_JOINED event and we're the host, we should initialize state
        if (event.type === "PLAYER_JOINED") {
          // Check if we should be the host (first player)
          const channel = channelRef.current;
          if (channel) {
            // Request state from host
            channel.publish("request-state", { playerId });
          }
        }
        return prev;
      }

      let newState: GameState | null = null;

      switch (event.type) {
        case "PLAYER_JOINED":
          // Check if player already exists to prevent duplicates
          if (prev.players.some((p) => p.id === event.player.id)) {
            return prev;
          }
          newState = {
            ...prev,
            players: [...prev.players, event.player],
          };
          break;
        case "PLAYER_LEFT":
          newState = {
            ...prev,
            players: prev.players.filter((p) => p.id !== event.playerId),
            votes: prev.votes.filter((v) => v.playerId !== event.playerId),
          };
          break;
        case "VOTE_SUBMITTED":
          newState = {
            ...prev,
            votes: [
              ...prev.votes.filter((v) => v.playerId !== event.vote.playerId),
              event.vote,
            ],
          };
          break;
        case "VOTES_REVEALED":
          newState = {
            ...prev,
            votes: event.votes,
            votesRevealed: true,
          };
          break;
        case "VOTING_STARTED":
          newState = {
            ...prev,
            currentIssue: event.issue,
            votes: [],
            votingInProgress: true,
            votesRevealed: false,
          };
          break;
        case "VOTING_RESET":
          newState = {
            ...prev,
            votes: [],
            votingInProgress: false,
            votesRevealed: false,
          };
          break;
        case "ISSUE_ADDED":
          newState = {
            ...prev,
            issues: [...prev.issues, event.issue],
          };
          break;
        case "ISSUE_SELECTED":
          newState = {
            ...prev,
            currentIssue: event.issue,
            votes: [],
            votingInProgress: false,
            votesRevealed: false,
          };
          break;
        case "ISSUE_ESTIMATED":
          newState = {
            ...prev,
            issues: prev.issues.map((issue) =>
              issue.id === event.issueId
                ? { ...issue, estimate: event.estimate }
                : issue
            ),
          };
          break;
        default:
          return prev;
      }

      // Update ref with new state
      if (newState) {
        gameStateRef.current = newState;
        // If we're the host, broadcast the updated game state
        const channel = channelRef.current;
        if (channel && newState.hostId === playerId) {
          // Broadcast updated state immediately for player changes
          channel.publish("game-state", newState);
        }
        return newState;
      }
      return prev;
    });
  }, [playerId]);

  useEffect(() => {
    if (!gameId) return;

    // Initialize Ably client
    // In production, you should use token authentication
    const ablyKey = import.meta.env.VITE_ABLY_API_KEY;

    if (!ablyKey || ablyKey === "your-ably-api-key-here") {
      console.error(
        "Ably API key is missing. Please set VITE_ABLY_API_KEY in your .env file."
      );
      return;
    }

    const client = new Ably.Realtime({
      key: ablyKey,
      clientId: playerId,
    });

    const gameChannel = client.channels.get(`game:${gameId}`);

    // Subscribe to game state updates
    gameChannel.subscribe("game-state", (message) => {
      const newState = message.data as GameState;
      setGameState(newState);
      gameStateRef.current = newState;
    });

    // Subscribe to game events
    gameChannel.subscribe("game-event", (message) => {
      const event = message.data as GameEvent;
      handleGameEvent(event);
    });

    // Subscribe to state requests - host should respond with current state
    gameChannel.subscribe("request-state", () => {
      // Only the host should respond to state requests
      // Check if we're the host by checking if we have game state
      // and if our playerId matches the hostId
      const currentState = gameStateRef.current;
      if (currentState && currentState.hostId === playerId) {
        // Publish current game state
        gameChannel.publish("game-state", currentState);
      }
    });

    // Use presence to track players
    const presence = gameChannel.presence;

    // Enter presence - this will trigger the "enter" event for all clients
    presence.enter({ playerId, playerName }).then(() => {
      // After entering presence, if we're the host and have game state, 
      // make sure we're in the players list
      const currentState = gameStateRef.current;
      if (currentState && currentState.hostId === playerId) {
        const hostInPlayers = currentState.players.some(p => p.id === playerId);
        if (!hostInPlayers) {
          // Host not in players list, add them
          const updatedState = {
            ...currentState,
            players: [
              ...currentState.players,
              {
                id: playerId,
                name: playerName,
                isHost: true,
              },
            ],
          };
          gameStateRef.current = updatedState;
          setGameState(updatedState);
          gameChannel.publish("game-state", updatedState);
        }
      }
    });

    // Subscribe to presence updates
    presence.subscribe("enter", (member) => {
      const data = member.data as { playerId: string; playerName: string };
      if (data) {
        // Broadcast player joined event to all clients
        gameChannel.publish("game-event", {
          type: "PLAYER_JOINED",
          player: {
            id: data.playerId,
            name: data.playerName,
            isHost: false, // Will be determined by game state
          },
        } as GameEvent);
      }
    });

    presence.subscribe("leave", (member) => {
      const data = member.data as { playerId: string; playerName: string };
      if (data) {
        // Broadcast player left event to all clients
        gameChannel.publish("game-event", {
          type: "PLAYER_LEFT",
          playerId: data.playerId,
        } as GameEvent);
      }
    });

    // Get current members only once on initial connection
    if (!presenceInitializedRef.current) {
      presenceInitializedRef.current = true;
      presence
        .get()
        .then((members) => {
          if (members) {
            members.forEach((member) => {
              const data = member.data as {
                playerId: string;
                playerName: string;
              };
              if (data) {
                // Broadcast existing members as player joined events
                gameChannel.publish("game-event", {
                  type: "PLAYER_JOINED",
                  player: {
                    id: data.playerId,
                    name: data.playerName,
                    isHost: false,
                  },
                } as GameEvent);
              }
            });
          }
        })
        .catch(() => {
          // Ignore errors when getting presence members
        });
    }

    // Store client and channel for cleanup
    channelRef.current = gameChannel;
    // Use startTransition to avoid linter warning for valid external system initialization
    startTransition(() => {
      setConnected(true);
    });

    // Request initial game state
    gameChannel.publish("request-state", { playerId });

    return () => {
      presence.leave();
      gameChannel.unsubscribe();
      client.close();
      setConnected(false);
    };
  }, [gameId, playerId, playerName, handleGameEvent]);

  const submitVote = useCallback(
    (value: number | string) => {
      const channel = channelRef.current;
      if (!channel || !gameState) return;

      const vote: Vote = {
        playerId,
        playerName,
        value: value === "?" ? null : typeof value === "string" ? value : value,
        revealed: false,
      };

      channel.publish("game-event", {
        type: "VOTE_SUBMITTED",
        vote,
      } as GameEvent);
    },
    [gameState, playerId, playerName]
  );

  const revealVotes = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !gameState) return;

    const revealedVotes = gameState.votes.map((vote) => ({
      ...vote,
      revealed: true,
    }));

    channel.publish("game-event", {
      type: "VOTES_REVEALED",
      votes: revealedVotes,
    } as GameEvent);
  }, [gameState]);

  const startVoting = useCallback((issue: Issue) => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.publish("game-event", {
      type: "VOTING_STARTED",
      issue,
    } as GameEvent);
  }, []);

  const resetVoting = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.publish("game-event", {
      type: "VOTING_RESET",
    } as GameEvent);
  }, []);

  const addIssue = useCallback((issue: Issue) => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.publish("game-event", {
      type: "ISSUE_ADDED",
      issue,
    } as GameEvent);
  }, []);

  const selectIssue = useCallback((issue: Issue) => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.publish("game-event", {
      type: "ISSUE_SELECTED",
      issue,
    } as GameEvent);
  }, []);

  const estimateIssue = useCallback((issueId: string, estimate: number) => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.publish("game-event", {
      type: "ISSUE_ESTIMATED",
      issueId,
      estimate,
    } as GameEvent);
  }, []);

  const updateGameState = useCallback((newState: GameState) => {
    const channel = channelRef.current;
    if (!channel) return;

    gameStateRef.current = newState;
    setGameState(newState);
    channel.publish("game-state", newState);
  }, []);

  return {
    connected,
    gameState,
    submitVote,
    revealVotes,
    startVoting,
    resetVoting,
    addIssue,
    selectIssue,
    estimateIssue,
    updateGameState,
    FIBONACCI_SEQUENCE,
  };
}
