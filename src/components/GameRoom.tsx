import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { useAbly } from "../hooks/useAbly.js";
import { VotingCards } from "./VotingCards.js";
import { VotingResults } from "./VotingResults.js";
import { IssueManager } from "./IssueManager.js";
import {
  createInitialGameState,
  generatePlayerId,
} from "../utils/gameUtils.js";

export function GameRoom() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlPlayerName = searchParams.get("name");

  // Get or generate playerId (persist in localStorage)
  const [playerId] = useState(() => {
    const stored = localStorage.getItem(`playerId_${gameId}`);
    if (stored) return stored;
    const newId = generatePlayerId();
    if (gameId) {
      localStorage.setItem(`playerId_${gameId}`, newId);
    }
    return newId;
  });

  const playerName = urlPlayerName || "";
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const initializationAttemptedRef = useRef(false);

  const {
    connected,
    gameState,
    submitVote,
    revealVotes,
    startVoting,
    resetVoting,
    addIssue,
    selectIssue,
    updateGameState,
    FIBONACCI_SEQUENCE,
  } = useAbly(gameId || null, playerId, playerName);

  // Set timeout for connection (10 seconds)
  useEffect(() => {
    if (!gameState && gameId) {
      const timer = setTimeout(() => {
        setConnectionTimeout(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [gameState, gameId]);

  // Use gameState from hook as source of truth
  const effectiveGameState = gameState;

  // If no gameId or playerName, redirect to landing page
  useEffect(() => {
    // Only redirect if we actually don't have the required params
    // Don't redirect if we're already in the process of loading
    if (!gameId) {
      navigate("/", { replace: true });
      return;
    }
    // Only redirect if name is truly missing (not just empty string from URL parsing)
    if (urlPlayerName === null) {
      // Redirect to landing page with gameId so user can enter their name
      navigate(`/?gameId=${gameId}`, { replace: true });
    }
  }, [gameId, urlPlayerName, navigate]);

  // Initialize game state if no remote state exists (any player can initialize)
  // Wait a bit to see if state arrives from another player
  useEffect(() => {
    if (
      connected &&
      gameState === null &&
      gameId &&
      !initializationAttemptedRef.current
    ) {
      // Wait 2 seconds to see if state arrives from another player
      const timer = setTimeout(() => {
        // If still no state after waiting, initialize it
        if (gameState === null && !initializationAttemptedRef.current) {
          initializationAttemptedRef.current = true;
          const initialState = createInitialGameState(
            gameId,
            playerId,
            playerName
          );
          updateGameState(initialState);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    // Reset flag if state arrives
    if (gameState !== null) {
      initializationAttemptedRef.current = false;
    }
  }, [connected, gameId, playerId, playerName, gameState, updateGameState]);

  // If redirecting, show loading (must be after all hooks)
  // This check happens after all hooks to avoid React hook rules violations
  if (!gameId) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-300 border-t-neutral-900 mx-auto mb-4"></div>
          <p className="text-neutral-600 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }
  // Only show redirect message if name is truly null (not just empty)
  if (urlPlayerName === null) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-300 border-t-neutral-900 mx-auto mb-4"></div>
          <p className="text-neutral-600 text-sm">
            Redirecting to enter your name...
          </p>
        </div>
      </div>
    );
  }

  // If no game state available, show loading
  // Wait for game state from other players or initialize if none exists
  if (!effectiveGameState) {
    // Don't show loading if we're redirecting (to avoid flash)
    if (!gameId || urlPlayerName === null) {
      return null;
    }

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-300 border-t-neutral-900 mx-auto mb-4"></div>
          <p className="text-neutral-600 text-sm">Connecting to game...</p>
          <p className="text-xs text-neutral-500 mt-2">
            {connectionTimeout
              ? "Taking longer than expected. Make sure someone has started the game."
              : "If this takes too long, make sure someone has started the game."}
          </p>
          {connectionTimeout && (
            <button
              onClick={() => navigate(`/?gameId=${gameId}`)}
              className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors text-sm font-medium"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentVote =
    effectiveGameState.votes.find((v) => v.playerId === playerId)?.value ??
    null;
  const hasVoted = effectiveGameState.votes.some(
    (v) => v.playerId === playerId
  );
  const allPlayersVoted =
    effectiveGameState.votingInProgress &&
    effectiveGameState.players.length > 0 &&
    effectiveGameState.votes.length === effectiveGameState.players.length;

  const handleRevealVotes = () => {
    revealVotes();
  };

  const handleResetVoting = () => {
    resetVoting();
  };

  const handleEstimateIssue = () => {
    if (effectiveGameState.currentIssue && effectiveGameState.votesRevealed) {
      // Calculate estimate from revealed votes
      const numericVotes = effectiveGameState.votes
        .filter((v) => v.value !== null && typeof v.value === "number")
        .map((v) => v.value as number);

      if (numericVotes.length > 0) {
        // Calculate estimate from revealed votes
        // Note: This would need to be handled through the estimateIssue function
        // For now, we'll just reset voting
        resetVoting();
      }
    }
  };

  const handleLeave = () => {
    navigate("/", { replace: true });
  };

  const getGameUrl = () => {
    // Share URL without name so users can enter their own
    return `${window.location.origin}/game/${gameId}`;
  };

  const handleCopyGameUrl = () => {
    const gameUrl = getGameUrl();
    navigator.clipboard.writeText(gameUrl).then(() => {
      // You could add a toast notification here
      alert("Game URL copied to clipboard!");
    });
  };

  const handleShowQRCode = () => {
    setShowQRCode(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
                🎯 Poker Planner
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <p className="text-xs text-neutral-600">
                  Game ID:{" "}
                  <span className="font-mono font-medium text-neutral-900">
                    {gameId}
                  </span>
                </p>
                <button
                  onClick={handleCopyGameUrl}
                  className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors font-medium"
                  title="Copy game URL"
                >
                  📋 Copy URL
                </button>
                <button
                  onClick={handleShowQRCode}
                  className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors font-medium"
                  title="Show QR code"
                >
                  📱 QR Code
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-neutral-600">Players</div>
                <div className="text-base font-semibold text-neutral-900">
                  {effectiveGameState.players.length}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-neutral-600">
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <button
                onClick={handleLeave}
                className="px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-md hover:bg-neutral-200 transition-colors text-sm font-medium"
              >
                Leave
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Voting Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Issue */}
            {effectiveGameState.currentIssue && (
              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-2 tracking-tight">
                  {effectiveGameState.currentIssue.title}
                </h2>
                {effectiveGameState.currentIssue.description && (
                  <p className="text-neutral-600 text-sm mb-4">
                    {effectiveGameState.currentIssue.description}
                  </p>
                )}
              </div>
            )}

            {/* Voting Cards */}
            {effectiveGameState.votingInProgress ? (
              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 text-center tracking-tight">
                  {effectiveGameState.votesRevealed
                    ? "Votes Revealed"
                    : "Select Your Vote"}
                </h3>
                {!effectiveGameState.votesRevealed && (
                  <VotingCards
                    sequence={FIBONACCI_SEQUENCE}
                    onVote={submitVote}
                    currentVote={currentVote}
                    votesRevealed={effectiveGameState.votesRevealed}
                  />
                )}
                {effectiveGameState.votesRevealed && (
                  <VotingResults votes={effectiveGameState.votes} />
                )}

                {/* Voting Controls */}
                <div className="mt-6 flex gap-2 justify-center flex-wrap">
                  {!effectiveGameState.votesRevealed && (
                    <>
                      <button
                        onClick={handleRevealVotes}
                        disabled={!allPlayersVoted}
                        className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Reveal Votes
                      </button>
                      <button
                        onClick={handleRevealVotes}
                        disabled={!hasVoted}
                        className="px-4 py-2 bg-neutral-100 text-neutral-900 rounded-md hover:bg-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Reveal Now
                      </button>
                    </>
                  )}
                  {effectiveGameState.votesRevealed && (
                    <>
                      <button
                        onClick={handleResetVoting}
                        className="px-4 py-2 bg-neutral-100 text-neutral-900 rounded-md hover:bg-neutral-200 transition-colors text-sm font-medium"
                      >
                        Vote Again
                      </button>
                      <button
                        onClick={handleEstimateIssue}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                      >
                        Save Estimate
                      </button>
                    </>
                  )}
                </div>

                {/* Voting Status */}
                {!effectiveGameState.votesRevealed && (
                  <div className="mt-4 text-center text-xs text-neutral-600">
                    {effectiveGameState.votes.length} of{" "}
                    {effectiveGameState.players.length} players voted
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 text-center">
                <p className="text-neutral-500 text-sm">
                  {effectiveGameState.currentIssue
                    ? "Waiting for voting to start..."
                    : "Select an issue to start voting"}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <IssueManager
              issues={effectiveGameState.issues}
              currentIssue={effectiveGameState.currentIssue}
              onAddIssue={addIssue}
              onSelectIssue={selectIssue}
              onStartVoting={startVoting}
            />

            {/* Players List */}
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-4 tracking-tight">
                Players
              </h3>
              <div className="space-y-1.5">
                {effectiveGameState.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-neutral-50 border border-neutral-100"
                  >
                    <span className="font-medium text-sm text-neutral-900">
                      {player.name}
                    </span>
                    {effectiveGameState.votingInProgress && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          effectiveGameState.votes.some(
                            (v) => v.playerId === player.id
                          )
                            ? "bg-emerald-500"
                            : "bg-neutral-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRCode(false)}
        >
          <div
            className="bg-white rounded-lg border border-neutral-200 shadow-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">
                Scan to Join
              </h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-md border border-neutral-200 mb-4">
                <QRCode
                  value={getGameUrl()}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 256 256"
                />
              </div>
              <p className="text-xs text-neutral-600 text-center mb-4">
                Scan this QR code with your phone to join the game
              </p>
              <button
                onClick={handleCopyGameUrl}
                className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors text-sm font-medium"
              >
                Copy URL Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
