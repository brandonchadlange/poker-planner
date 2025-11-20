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
  const timeoutRefsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleGameEvent = useCallback(
    (event: GameEvent) => {
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
            // Only publish if channel is attached
            if (channel.state === "attached" || channel.state === "attaching") {
              try {
                channel.publish("game-state", newState);
              } catch (error) {
                console.warn("Failed to publish game-state:", error);
              }
            }
          }
          return newState;
        }
        return prev;
      });
    },
    [playerId]
  );

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
      // Enable automatic reconnection
      disconnectedRetryTimeout: 3000,
      suspendedRetryTimeout: 3000,
    });

    const gameChannel = client.channels.get(`game:${gameId}`);
    const presence = gameChannel.presence;

    // Monitor connection state changes
    client.connection.on("connected", () => {
      startTransition(() => {
        setConnected(true);
      });
      // Re-enter presence when reconnected
      presence.enter({ playerId, playerName }).catch((err) => {
        console.warn("Failed to re-enter presence on reconnect:", err);
      });
    });

    client.connection.on("disconnected", () => {
      startTransition(() => {
        setConnected(false);
      });
    });

    client.connection.on("suspended", () => {
      startTransition(() => {
        setConnected(false);
      });
    });

    client.connection.on("closed", () => {
      startTransition(() => {
        setConnected(false);
      });
    });

    // Attach to the channel (channels auto-attach, but we can explicitly attach)
    gameChannel.attach().catch((err) => {
      console.error("Failed to attach to channel:", err);
    });

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
        // Only publish if channel is attached
        if (
          gameChannel.state === "attached" ||
          gameChannel.state === "attaching"
        ) {
          try {
            gameChannel.publish("game-state", currentState);
          } catch (error) {
            console.warn(
              "Failed to publish game-state (request-state response):",
              error
            );
          }
        }
      }
    });

    // Use presence to track players (already defined above)

    // Enter presence - this will trigger the "enter" event for all clients
    presence.enter({ playerId, playerName }).then(() => {
      // After entering presence, if we're the host and have game state,
      // make sure we're in the players list
      const currentState = gameStateRef.current;
      if (currentState && currentState.hostId === playerId) {
        const hostInPlayers = currentState.players.some(
          (p) => p.id === playerId
        );
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
      if (
        data &&
        (gameChannel.state === "attached" || gameChannel.state === "attaching")
      ) {
        try {
          // Broadcast player joined event to all clients
          gameChannel.publish("game-event", {
            type: "PLAYER_JOINED",
            player: {
              id: data.playerId,
              name: data.playerName,
              isHost: false, // Will be determined by game state
            },
          } as GameEvent);
        } catch (error) {
          console.warn("Failed to publish PLAYER_JOINED event:", error);
        }
      }
    });

    presence.subscribe("leave", (member) => {
      const data = member.data as { playerId: string; playerName: string };
      if (
        data &&
        (gameChannel.state === "attached" || gameChannel.state === "attaching")
      ) {
        try {
          // Broadcast player left event to all clients
          gameChannel.publish("game-event", {
            type: "PLAYER_LEFT",
            playerId: data.playerId,
          } as GameEvent);
        } catch (error) {
          console.warn("Failed to publish PLAYER_LEFT event:", error);
        }
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
              if (
                data &&
                (gameChannel.state === "attached" ||
                  gameChannel.state === "attaching")
              ) {
                try {
                  // Broadcast existing members as player joined events
                  gameChannel.publish("game-event", {
                    type: "PLAYER_JOINED",
                    player: {
                      id: data.playerId,
                      name: data.playerName,
                      isHost: false,
                    },
                  } as GameEvent);
                } catch (error) {
                  console.warn(
                    "Failed to publish PLAYER_JOINED event (from presence.get):",
                    error
                  );
                }
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

    // Request initial game state after a short delay to ensure channel is ready
    const timeout1 = setTimeout(() => {
      if (
        gameChannel.state === "attached" ||
        gameChannel.state === "attaching"
      ) {
        try {
          gameChannel.publish("request-state", { playerId });
        } catch (error) {
          console.warn("Failed to publish request-state:", error);
        }
      }
    }, 200);

    // Also request again after a longer delay in case host wasn't ready
    const timeout2 = setTimeout(() => {
      if (
        gameChannel.state === "attached" ||
        gameChannel.state === "attaching"
      ) {
        try {
          gameChannel.publish("request-state", { playerId });
        } catch (error) {
          console.warn("Failed to publish request-state (retry):", error);
        }
      }
    }, 1200);

    timeoutRefsRef.current.push(timeout1, timeout2);

    return () => {
      // Clear all timeouts
      timeoutRefsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefsRef.current = [];

      // Clean up presence and channel
      presence.leave().catch(() => {});
      gameChannel.unsubscribe();
      client.close();
      setConnected(false);
      channelRef.current = null;
    };
  }, [gameId, playerId, playerName, handleGameEvent]);

  const submitVote = useCallback(
    (value: number | string) => {
      const channel = channelRef.current;
      if (!channel || !gameState) return;
      if (channel.state !== "attached" && channel.state !== "attaching") return;

      const vote: Vote = {
        playerId,
        playerName,
        value: value === "?" ? null : typeof value === "string" ? value : value,
        revealed: false,
      };

      try {
        channel.publish("game-event", {
          type: "VOTE_SUBMITTED",
          vote,
        } as GameEvent);
      } catch (error) {
        console.warn("Failed to publish vote:", error);
      }
    },
    [gameState, playerId, playerName]
  );

  const revealVotes = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !gameState) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    const revealedVotes = gameState.votes.map((vote) => ({
      ...vote,
      revealed: true,
    }));

    try {
      channel.publish("game-event", {
        type: "VOTES_REVEALED",
        votes: revealedVotes,
      } as GameEvent);
    } catch (error) {
      console.warn("Failed to publish reveal votes:", error);
    }
  }, [gameState]);

  const startVoting = useCallback((issue: Issue) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    try {
      channel.publish("game-event", {
        type: "VOTING_STARTED",
        issue,
      } as GameEvent);
    } catch (error) {
      console.warn("Failed to publish start voting:", error);
    }
  }, []);

  const resetVoting = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    try {
      channel.publish("game-event", {
        type: "VOTING_RESET",
      } as GameEvent);
    } catch (error) {
      console.warn("Failed to publish reset voting:", error);
    }
  }, []);

  const addIssue = useCallback((issue: Issue) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    try {
      channel.publish("game-event", {
        type: "ISSUE_ADDED",
        issue,
      } as GameEvent);
    } catch (error) {
      console.warn("Failed to publish add issue:", error);
    }
  }, []);

  const selectIssue = useCallback((issue: Issue) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    try {
      channel.publish("game-event", {
        type: "ISSUE_SELECTED",
        issue,
      } as GameEvent);
    } catch (error) {
      console.warn("Failed to publish select issue:", error);
    }
  }, []);

  const estimateIssue = useCallback((issueId: string, estimate: number) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    try {
      channel.publish("game-event", {
        type: "ISSUE_ESTIMATED",
        issueId,
        estimate,
      } as GameEvent);
    } catch (error) {
      console.warn("Failed to publish estimate issue:", error);
    }
  }, []);

  const updateGameState = useCallback((newState: GameState) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (channel.state !== "attached" && channel.state !== "attaching") return;

    gameStateRef.current = newState;
    setGameState(newState);
    try {
      channel.publish("game-state", newState);
    } catch (error) {
      console.warn("Failed to publish update game state:", error);
    }
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
