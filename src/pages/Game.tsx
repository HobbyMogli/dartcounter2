import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import type { GameSetupData } from '../types/gameTypes';
import PlayerScoreCard from '../components/game/PlayerScoreCard';
import { SettingsModal } from '../components/game-settings/SettingsModal';
import { playerService } from '../services/db';
import { gameService } from '../services/db/gameService';
import { Player } from '../services/db/types';
import { useSettings } from '../contexts/SettingsContext';
import { X01Game } from '../components/game/X01Game';

// API URL for direct fetch calls
const API_URL = 'http://localhost:3001/api';

interface GameStatistics {
  dartsThrown: number;
  averagePerThrow: number;
  highestThrow: number;
  totalPoints: number;
}

interface PlayerGameState extends Player {
  currentScore: number;
  lastThrows: (number | null)[];
  gameStats: GameStatistics;
}

interface ThrowHistory {
  value: number;
  playerIndex: number;
}

const Game: React.FC = () => {
  const location = useLocation();
  const gameData = location.state as GameSetupData;
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [currentThrow, setCurrentThrow] = useState<number[]>([]);
  const [throwHistory, setThrowHistory] = useState<ThrowHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const settings = useSettings();
  
  // Neue Zustandsvariablen für Runden- und Dart-Management
  const [currentRound, setCurrentRound] = useState(1);
  const [currentDart, setCurrentDart] = useState(1);

  // Add a state for debug panel visibility - controlled by settings now
  const [showDebugPanel, setShowDebugPanel] = useState(true);

  // Add a new state for tracking game actions (throws and undos)
  const [gameLog, setGameLog] = useState<Array<{
    type: 'throw' | 'undo';
    timestamp: number;
    playerId?: number;
    playerName?: string;
    value?: number;
    undoneThrow?: {
      playerId: number;
      playerName: string;
      value: number;
    };
  }>>([]);

  const showGameStats = settings.showStatistics;
  
  // Update showDebugPanel when settings change
  useEffect(() => {
    setShowDebugPanel(settings.showDebugInfo);
  }, [settings.showDebugInfo]);
  
  useEffect(() => {
    const initializeGame = async () => {
      if (gameData?.players) {
        try {
          // Load players
          const allPlayers = await playerService.getAllPlayers();
          const gamePlayers = allPlayers
            .filter(player => gameData.players.includes(player.id.toString()))
            .map(player => ({
              ...player,
              currentScore: gameData.settings.startScore || 501,
              lastThrows: [null, null, null],
              gameStats: {
                dartsThrown: 0,
                averagePerThrow: 0,
                highestThrow: 0,
                totalPoints: 0
              }
            }));
          setPlayers(gamePlayers);

          // Create a single game for the entire match
          const game = await gameService.createGame({
            playerIds: gamePlayers.map(player => parseInt(player.id.toString())),
            gameType: gameData.gameMode,
            startingScore: gameData.settings.startScore || 501,
            settings: gameData.settings
          });
          setGameId(game.id);
          
          // Set the players state and finish loading
          setPlayers(gamePlayers);
          setIsLoading(false);
          
          // We'll initialize the player stats and throws later once all functions are defined
          // Just set a flag to do this when the component is fully initialized
          if (game.id) {
            console.log(`[Game] Game created with ID ${game.id}`);
            
            // We'll initialize the displays during the first render after loading
            // This avoids calling functions before they're defined
          }
        } catch (error) {
          console.error('Fehler beim Initialisieren des Spiels:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    initializeGame();
  }, [gameData]);
  
  // Add a separate effect to initialize player stats and throws after all functions are defined
  useEffect(() => {
    const initializeGameState = async () => {
      if (gameId && players.length > 0 && !isLoading) {
        console.log(`[Game] Initializing player stats and throws for game ${gameId}`);
        
        // Now that we have the game ID and all functions are defined, 
        // update stats and throws for all players
        for (let i = 0; i < players.length; i++) {
          try {
            await updatePlayerStats(i);
            // Load any existing throws for round 1
            await updatePlayerThrowsDisplay(i, 1);
          } catch (error) {
            console.error(`Error initializing player ${i}:`, error);
          }
        }
      }
    };
    
    initializeGameState();
  }, [gameId, isLoading, players.length]);

  // Redirect wenn keine Spieldaten vorhanden sind
  if (!gameData) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || !gameId) {
    return <div className="text-white text-center py-8">Lade Spielerdaten...</div>;
  }

  // Dart-Nummern Hilfsfunktionen
  const getCurrentDartNumber = () => currentDart;
  
  // Runden-Nummern Hilfsfunktionen
  const getCurrentRoundNumber = () => currentRound;
  
  // Funktion zum Aktualisieren der Runden und Dart-Nummern
  const updateRoundAndDart = (dartNumber: number): boolean => {
    if (dartNumber === 3) {
      // When the third dart is thrown:
      // 1. Increase the round number
      // 2. Reset the dart number to 1
      // 3. Return true to signal a player switch
      setCurrentRound(prev => prev + 1);
      setCurrentDart(1);
      return true; // Signal for player switch
    } else {
      // Otherwise, just increase the dart number
      setCurrentDart(prev => prev + 1);
      return false; // No player switch needed
    }
  };
  
  // Funktion zum Rückgängigmachen von Runden und Dart-Nummern
  const undoRoundAndDart = (): boolean => {
    if (currentDart === 1) {
      // Wenn wir bei Dart 1 sind, gehe zur vorherigen Runde und setze Dart auf 3
      setCurrentRound(prev => Math.max(1, prev - 1));
      setCurrentDart(3);
      return true; // Signal für Spielerwechsel
    } else {
      // Sonst verringere nur die Dart-Nummer
      setCurrentDart(prev => prev - 1);
      return false; // Kein Spielerwechsel nötig
    }
  };
  
  // Funktion zum Aktualisieren der Spielerstatistiken
  const updatePlayerStats = async (playerIndex: number) => {
    if (!gameId) return;
    
    try {
      const player = players[playerIndex];
      // Direkt typisieren, statt StatsData zu verwenden
      const stats: {
        dartsThrown: number;
        average: number;
        highestScore: number;
        totalPoints: number;
      } = await gameService.getPlayerStats(gameId, parseInt(player.id.toString()));
      
      setPlayers(currentPlayers => {
        const newPlayers = [...currentPlayers];
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          gameStats: {
            dartsThrown: stats.dartsThrown,
            averagePerThrow: stats.average,
            highestThrow: stats.highestScore,
            totalPoints: stats.totalPoints
          }
        };
        return newPlayers;
      });
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  };

  // Helper function to update a player's throws display
  const updatePlayerThrowsDisplay = async (playerIndex: number, targetRound: number, disableFallback: boolean = false) => {
    console.log(`[updatePlayerThrowsDisplay] Updating display for player ${playerIndex}, round ${targetRound}, disableFallback=${disableFallback}`);
    
    try {
      // Get player ID
      const playerId = parseInt(players[playerIndex].id.toString());
      
      // Query the server for the player's throws in the specified round
      const fallbackParam = disableFallback ? '&disableFallback=true' : '';
      const throws = await fetch(`${API_URL}/games/${gameId}/player-throws/${playerId}?round=${targetRound}${fallbackParam}`);
      const throwData = await throws.json();
      
      console.log(`[updatePlayerThrowsDisplay] Server response for player ${playerIndex}:`, throwData);
      
      // Check if the server returned any throws (either from requested round or fallback round)
      const hasThrows = throwData.hasThrows;
      
      // Update player display with the throws
      setPlayers(currentPlayers => {
        const newPlayers = [...currentPlayers];
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          lastThrows: hasThrows ? throwData.lastThrows : [null, null, null]
        };
        return newPlayers;
      });
    } catch (error) {
      console.error(`[updatePlayerThrowsDisplay] Error updating player ${playerIndex} throws:`, error);
    }
  };

  // Funktion zum Aktualisieren der Anzeige der letzten Würfe
  const updatePlayerThrows = async (playerIndex: number, forceReset: boolean = false, targetRound: number = currentRound) => {
    if (!gameId) {
      console.error('No game ID available');
      return;
    }

    try {
      const player = players[playerIndex];
      if (!player) {
        console.error('Player not found at index:', playerIndex);
        return;
      }

      if (forceReset) {
        // If we're forcing a reset, just set all throws to null
        console.log(`[updatePlayerThrows] Forcing reset for player ${playerIndex}`);
        setPlayers(currentPlayers => {
          const newPlayers = [...currentPlayers];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            lastThrows: [null, null, null]
          };
          return newPlayers;
        });
        return;
      }

      const playerId = parseInt(player.id.toString());
      
      // Use the explicitly provided targetRound instead of currentRound
      console.log(`[updatePlayerThrows] Fetching throws for player ${playerIndex} (ID: ${playerId}), round ${targetRound}`);
      
      // Fetch throws for this player in the target round
      const throwData = await gameService.getPlayerThrows(gameId, playerId, targetRound);
      console.log(`[updatePlayerThrows] Response:`, throwData);

      // Count the actual number of non-null throws
      const actualThrowCount = throwData.lastThrows.filter((t: number | null) => t !== null).length;
      console.log(`[updatePlayerThrows] Found ${actualThrowCount} actual throws in round ${targetRound}`);
      
      // If we have throws in the database, use them
      if (actualThrowCount > 0) {
        // Use the throws from the database
        console.log(`[updatePlayerThrows] Setting throws for player ${playerIndex}:`, throwData.lastThrows);
        setPlayers(currentPlayers => {
          const newPlayers = [...currentPlayers];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            lastThrows: throwData.lastThrows
          };
          return newPlayers;
        });
      } else {
        // If no throws in database for this round, explicitly reset the display
        console.log(`[updatePlayerThrows] No throws found, setting empty display for player ${playerIndex}`);
        setPlayers(currentPlayers => {
          const newPlayers = [...currentPlayers];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            lastThrows: [null, null, null]
          };
          return newPlayers;
        });
      }

    } catch (error) {
      console.error('[updatePlayerThrows] Error updating player throws:', error);
      // On error, reset to empty
      setPlayers(currentPlayers => {
        const newPlayers = [...currentPlayers];
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          lastThrows: [null, null, null]
        };
        return newPlayers;
      });
    }
  };

  // Updated function to manage player switching with correct round display
  const handlePlayerSwitch = async (nextPlayerIndex: number, newRound: number) => {
    // Log the transition for debugging
    console.log(`[handlePlayerSwitch] From player ${activePlayerIndex} to ${nextPlayerIndex}, round: ${currentRound} to ${newRound}`);
    
    // Determine if we're going to a new round (forward) or back to a previous round (undo)
    const isMovingForward = newRound > currentRound;
    
    // Set the active player before updating display (to ensure correct player is targeted)
    setActivePlayerIndex(nextPlayerIndex);
    
    try {
      // Update displays for ALL players, not just the active one
      for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
        // For the player we're switching to
        if (playerIndex === nextPlayerIndex) {
          // Case 1: Moving forward to a new round - show empty displays
          if (isMovingForward) {
            console.log(`[handlePlayerSwitch] Moving forward to round ${newRound}, setting empty display for player ${playerIndex}`);
            setPlayers(currentPlayers => {
              const newPlayers = [...currentPlayers];
              newPlayers[playerIndex] = {
                ...newPlayers[playerIndex],
                lastThrows: [null, null, null]
              };
              return newPlayers;
            });
          }
          // Case 2: Moving backward or Case 3: Same round
          else {
            // When moving backward, we want to show the actual throws for that round,
            // so we don't disable fallback
            await updatePlayerThrowsDisplay(playerIndex, newRound, false);
          }
        } 
        // For all other players, update their displays based on the appropriate round
        else {
          // When moving forward, other players should show their throws from the previous round
          const targetRound = isMovingForward ? currentRound : newRound;
          await updatePlayerThrowsDisplay(playerIndex, targetRound, false);
        }
      }
      
      // Always update stats after a player switch
      await updatePlayerStats(nextPlayerIndex);
      
    } catch (error) {
      console.error(`[handlePlayerSwitch] Error during player switch:`, error);
      // In case of error, set empty throws to avoid displaying incorrect data
      setPlayers(currentPlayers => {
        const newPlayers = [...currentPlayers];
        newPlayers[nextPlayerIndex] = {
          ...newPlayers[nextPlayerIndex],
          lastThrows: [null, null, null]
        };
        return newPlayers;
      });
    }
  };

  // Modified handleThrow function to use handlePlayerSwitch for player transitions
  const handleThrow = async (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => {
    if (!gameId) {
      console.error('No game ID available');
      return;
    }

    try {
      const throwValue = score * multiplier;
      
      // Get current dart and round numbers
      const dartNumber = getCurrentDartNumber();
      const roundNumber = getCurrentRoundNumber();
      
      // Aktueller Spieler vor möglichem Wechsel
      let currentPlayer = players[activePlayerIndex];

      if (!currentPlayer) {
        console.error('No active player found');
        return;
      }

      // Add to game log
      setGameLog(prev => [...prev, {
        type: 'throw',
        timestamp: Date.now(),
        playerId: parseInt(currentPlayer.id.toString()),
        playerName: currentPlayer.name,
        value: throwValue
      }]);

      // Create a new lastThrows array with the current throw at the correct position
      // and null values for the remaining positions
      let newLastThrows = [...currentPlayer.lastThrows];
      newLastThrows[dartNumber - 1] = throwValue;
      
      // Update player's score and lastThrows
      const updatedPlayers = [...players];
      updatedPlayers[activePlayerIndex] = {
        ...currentPlayer,
        currentScore: currentPlayer.currentScore - throwValue,
        lastThrows: newLastThrows
      };
      setPlayers(updatedPlayers);
      
      // Add to throw history
      setThrowHistory([
        ...throwHistory,
        { value: throwValue, playerIndex: activePlayerIndex }
      ]);
      
      // Register throw in backend
      await gameService.registerThrow({
        gameId,
        playerId: parseInt(currentPlayer.id.toString()),
        score: throwValue,
        roundNumber,
        dartNumber,
        multiplier,
        isBull: isBull || false,
        targetNumber: targetNumber || score
      });
      
      // Update player statistics for all players to ensure consistent display
      for (let i = 0; i < players.length; i++) {
        await updatePlayerStats(i);
      }

      // Update round and dart numbers, und prüfe, ob ein Spielerwechsel erfolgen soll
      const shouldSwitchPlayer = updateRoundAndDart(dartNumber);

      // Wenn der dritte Dart geworfen wurde, wechsle zum nächsten Spieler
      if (shouldSwitchPlayer) {
        const nextPlayerIndex = (activePlayerIndex + 1) % players.length;
        const nextRound = currentRound + 1; // When switching after 3 darts, we move to next round
        
        // Reset current throw
        setCurrentThrow([]);
        
        // Use the handlePlayerSwitch function to manage the transition
        await handlePlayerSwitch(nextPlayerIndex, nextRound);
      } else {
        // If we don't switch players, make sure the current player's display is updated
        // This ensures the throw appears on the UI immediately
        await updatePlayerThrowsDisplay(activePlayerIndex, roundNumber);
      }

    } catch (error) {
      console.error('Error handling throw:', error);
    }
  };

  // Modified handleUndo function to fix round calculation during undo operations
  const handleUndo = async () => {
    if (!gameId || throwHistory.length === 0) return;

    try {
      // Get the last throw from history
      const lastThrow = throwHistory[throwHistory.length - 1];
      const playerToUndo = lastThrow.playerIndex;
      const playerObject = players[playerToUndo];
      
      // Add to game log
      setGameLog(prev => [...prev, {
        type: 'undo',
        timestamp: Date.now(),
        undoneThrow: {
          playerId: parseInt(playerObject.id.toString()),
          playerName: playerObject.name,
          value: lastThrow.value
        }
      }]);
      
      // Get the last throw ID and delete it
      const lastThrowId = await gameService.getLastThrowId(gameId);
      if (lastThrowId) {
        await gameService.undoLastThrow(lastThrowId);
      }

      // Update player's score
      const updatedPlayers = [...players];
      const playerState = updatedPlayers[playerToUndo];
      playerState.currentScore += lastThrow.value;
      setPlayers(updatedPlayers);

      // Remove the throw from history
      const newThrowHistory = throwHistory.slice(0, -1);
      setThrowHistory(newThrowHistory);

      // Store the current round before updating
      const originalRound = currentRound;
      
      // Critical check: Are we undoing a throw in the current active round?
      const undoingCurrentRound = playerToUndo === activePlayerIndex;
      
      // Update round and dart numbers, and check if a player switch is needed
      const shouldSwitchPlayer = undoRoundAndDart();
      
      // Calculate the correct round after undoing
      // Important: Calculate explicitly rather than relying on the state which might not be updated yet
      const targetRound = currentDart === 3 ? originalRound : Math.max(1, originalRound - 1);
      
      console.log(`[UNDO DEBUG] Original round: ${originalRound}, Target round: ${targetRound}, Dart: ${currentDart}, Switch: ${shouldSwitchPlayer}, Undoing current round: ${undoingCurrentRound}`);
      
      // Reset current throw
      setCurrentThrow([]);
      
      // IMPORTANT: Update statistics for all players to reflect the undo operation
      for (let i = 0; i < players.length; i++) {
        await updatePlayerStats(i);
      }
      
      // If we have no more throw history, completely reset all players' throws display
      if (newThrowHistory.length === 0) {
        // Reset all players' throw displays
        for (let i = 0; i < players.length; i++) {
          await updatePlayerThrows(i, true);
        }
      } else {
        // If we're undoing a throw in the current round, we should show empty fields
        // instead of falling back to a previous round
        if (undoingCurrentRound) {
          // Fetch the current throws for this player after the undo
          // Use the disableFallback parameter to prevent fallback to previous rounds
          const response = await fetch(`${API_URL}/games/${gameId}/player-throws/${parseInt(playerObject.id.toString())}?round=${originalRound}&disableFallback=true`);
          const throwData = await response.json();
          
          console.log(`[UNDO DEBUG] After undo, player ${playerToUndo} has throws in round ${originalRound}:`, throwData);
          
          // Update the player's display with either the throws from the current round
          // or empty fields if there are no throws left
          setPlayers(currentPlayers => {
            const newPlayers = [...currentPlayers];
            newPlayers[playerToUndo] = {
              ...newPlayers[playerToUndo],
              lastThrows: throwData.hasThrows ? throwData.lastThrows : [null, null, null]
            };
            return newPlayers;
          });
          
          // If we're not switching players, update all other players' displays
          if (!shouldSwitchPlayer) {
            for (let i = 0; i < players.length; i++) {
              if (i !== playerToUndo) {
                await updatePlayerThrowsDisplay(i, originalRound);
              }
            }
          }
        } else {
          // We're undoing a throw from a different round or player
          
          // If we need to switch players, use the handlePlayerSwitch function
          if (shouldSwitchPlayer || playerToUndo !== activePlayerIndex) {
            // Pass the explicitly calculated targetRound
            console.log(`Switching to player ${playerToUndo}, round ${targetRound}`);
            await handlePlayerSwitch(playerToUndo, targetRound);
          } else {
            // Update all players' displays
            for (let i = 0; i < players.length; i++) {
              // If we're on the current round, use disableFallback=true to avoid showing previous rounds
              const isCurrentRound = (i === activePlayerIndex && targetRound === originalRound);
              const playerRound = i === activePlayerIndex ? originalRound : targetRound;
              await updatePlayerThrowsDisplay(i, playerRound, isCurrentRound);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling undo:', error);
    }
  };

  const handleGameEnd = async (score: number) => {
    if (!gameId) return;
    
    try {
      // Berechne die Gesamtzahl der geworfenen Darts
      const totalDartsThrown = players.reduce(
        (sum, player) => sum + player.gameStats.dartsThrown, 
        0
      );
      
      // Beende das Spiel in der Datenbank
      await gameService.endGame(gameId, score, totalDartsThrown);
      
      // Hier können weitere Aktionen für das Spielende hinzugefügt werden
      console.log('Game ended with score:', score);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  // Helper function to format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="space-y-8">
      {/* Debug Information Panel - Controlled by settings now */}
      {showDebugPanel && (
        <div className="bg-gray-800 p-3 rounded text-white text-sm">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>Game ID: {gameId}</div>
            <div>Active Player: {players[activePlayerIndex]?.name || 'None'}</div>
            <div>Current Dart: {currentDart}</div>
            <div>Current Round: {currentRound}</div>
            <div>Throw History Length: {throwHistory.length}</div>
            <div>Last Score: {throwHistory.length > 0 ? throwHistory[throwHistory.length - 1].value : 'None'}</div>
          </div>

          {gameLog.length > 0 && (
            <div className="mt-2 border-t border-gray-700 pt-2">
              <div className="font-semibold mb-1">Game Protocol:</div>
              <div className="max-h-32 overflow-y-auto">
                {gameLog.map((action, idx) => (
                  <div 
                    key={idx} 
                    className={`text-xs py-1 ${action.type === 'undo' ? 'text-red-400' : 'text-green-400'}`}
                  >
                    <span className="text-gray-400">[{formatTime(action.timestamp)}]</span>{' '}
                    {action.type === 'throw' ? (
                      <>Action {idx+1}: <span className="font-semibold">THROW</span> - Player {action.playerName} → {action.value} points</>
                    ) : (
                      <>Action {idx+1}: <span className="font-semibold">UNDO</span> - Removed throw from {action.undoneThrow?.playerName} of {action.undoneThrow?.value} points</>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player, index) => (
          <PlayerScoreCard
            key={player.id}
            playerName={player.name}
            currentScore={player.currentScore}
            lastThrows={player.lastThrows}
            isActive={index === activePlayerIndex}
            statistics={{
              average: player.gameStats.averagePerThrow,
              dartsThrown: player.gameStats.dartsThrown,
              highestScore: player.gameStats.highestThrow
            }}
          />
        ))}
      </div>
      
      {currentThrow.length > 0 && (
        <div className="bg-gray-800 p-2 rounded text-white text-sm">
          Debug: Current throw sequence: {currentThrow.join(', ')}
        </div>
      )}
      
      <X01Game
        currentScore={players[activePlayerIndex]?.currentScore || gameData.settings.startScore || 501}
        onGameEnd={handleGameEnd}
        onThrow={handleThrow}
        onUndo={handleUndo}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      {showGameStats && (
        <div className="mt-4 text-white text-sm">
          <p>Game settings active: {JSON.stringify(settings.showStatistics)}</p>
        </div>
      )}
    </div>
  );
};

export default Game;
