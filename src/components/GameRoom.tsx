import { useEffect, useState } from "react";
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
  const urlIsHost = searchParams.get("host") === "true";

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
  const isHost = urlIsHost;
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

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
    if (!isHost && !gameState && gameId) {
      const timer = setTimeout(() => {
        setConnectionTimeout(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isHost, gameState, gameId]);

  // Use gameState from hook as source of truth, with local fallback
  const effectiveGameState =
    gameState ||
    (isHost && gameId
      ? createInitialGameState(gameId, playerId, playerName)
      : null);

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

  // Initialize game state if host and no remote state exists
  useEffect(() => {
    if (isHost && connected && gameState === null && gameId) {
      const initialState = createInitialGameState(gameId, playerId, playerName);
      // Small delay to ensure channel is ready
      setTimeout(() => {
        updateGameState(initialState);
      }, 100);
    }
  }, [
    isHost,
    connected,
    gameId,
    playerId,
    playerName,
    gameState,
    updateGameState,
  ]);

  // If redirecting, show loading (must be after all hooks)
  // This check happens after all hooks to avoid React hook rules violations
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }
  // Only show redirect message if name is truly null (not just empty)
  if (urlPlayerName === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to enter your name...</p>
        </div>
      </div>
    );
  }

  // If no game state available, show loading
  // For non-host players, wait for game state from host
  // For host, they should have initialized state
  if (!effectiveGameState) {
    // Don't show loading if we're redirecting (to avoid flash)
    if (!gameId || urlPlayerName === null) {
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isHost
              ? "Initializing game..."
              : "Connecting to game... Waiting for host."}
          </p>
          {!isHost && (
            <>
              <p className="text-sm text-gray-500 mt-2">
                {connectionTimeout
                  ? "Taking longer than expected. Make sure the host has started the game."
                  : "If this takes too long, make sure the host has started the game."}
              </p>
              {connectionTimeout && (
                <button
                  onClick={() => navigate(`/?gameId=${gameId}`)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go Back
                </button>
              )}
            </>
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
    if (isHost) {
      revealVotes();
    }
  };

  const handleResetVoting = () => {
    if (isHost) {
      resetVoting();
    }
  };

  const handleEstimateIssue = () => {
    if (
      isHost &&
      effectiveGameState.currentIssue &&
      effectiveGameState.votesRevealed
    ) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 Poker Planner
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">
                  Game ID:{" "}
                  <span className="font-mono font-semibold">{gameId}</span>
                </p>
                <button
                  onClick={handleCopyGameUrl}
                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                  title="Copy game URL"
                >
                  📋 Copy URL
                </button>
                <button
                  onClick={handleShowQRCode}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  title="Show QR code"
                >
                  📱 QR Code
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Players</div>
                <div className="text-lg font-semibold text-gray-900">
                  {effectiveGameState.players.length}
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <button
                onClick={handleLeave}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Voting Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Issue */}
            {effectiveGameState.currentIssue && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {effectiveGameState.currentIssue.title}
                </h2>
                {effectiveGameState.currentIssue.description && (
                  <p className="text-gray-600 mb-4">
                    {effectiveGameState.currentIssue.description}
                  </p>
                )}
              </div>
            )}

            {/* Voting Cards */}
            {effectiveGameState.votingInProgress ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
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

                {/* Host Controls */}
                {isHost && (
                  <div className="mt-6 flex gap-3 justify-center">
                    {!effectiveGameState.votesRevealed && (
                      <>
                        <button
                          onClick={handleRevealVotes}
                          disabled={!allPlayersVoted}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                          Reveal Votes
                        </button>
                        <button
                          onClick={handleRevealVotes}
                          disabled={!hasVoted}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                          Reveal Now
                        </button>
                      </>
                    )}
                    {effectiveGameState.votesRevealed && (
                      <>
                        <button
                          onClick={handleResetVoting}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                        >
                          Vote Again
                        </button>
                        <button
                          onClick={handleEstimateIssue}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                        >
                          Save Estimate
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Voting Status */}
                {!effectiveGameState.votesRevealed && (
                  <div className="mt-4 text-center text-sm text-gray-600">
                    {effectiveGameState.votes.length} of{" "}
                    {effectiveGameState.players.length} players voted
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <p className="text-gray-500 text-lg">
                  {effectiveGameState.currentIssue
                    ? "Waiting for host to start voting..."
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
              isHost={isHost}
              onAddIssue={addIssue}
              onSelectIssue={selectIssue}
              onStartVoting={startVoting}
            />

            {/* Players List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Players</h3>
              <div className="space-y-2">
                {effectiveGameState.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">
                      {player.name}
                      {player.isHost && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          Host
                        </span>
                      )}
                    </span>
                    {effectiveGameState.votingInProgress && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          effectiveGameState.votes.some(
                            (v) => v.playerId === player.id
                          )
                            ? "bg-green-500"
                            : "bg-gray-300"
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRCode(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Scan to Join</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                <QRCode
                  value={getGameUrl()}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 256 256"
                />
              </div>
              <p className="text-sm text-gray-600 text-center mb-4">
                Scan this QR code with your phone to join the game
              </p>
              <button
                onClick={handleCopyGameUrl}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
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
