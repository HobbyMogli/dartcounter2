import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useParams } from 'react-router-dom';
import type { GameSetupData, X01Settings } from '../types/gameTypes';
import PlayerScoreCard from '../components/game/PlayerScoreCard';
import { SettingsModal } from '../components/game-settings/SettingsModal';
import { playerService } from '../services/db';
import { gameService } from '../services/db/gameService';
import { Player } from '../services/db/types';
import { useSettings } from '../contexts/SettingsContext';
import { X01Game } from '../components/game/X01Game';
import { toast } from 'react-hot-toast';
import { GameOverModal } from '../components/game/GameOverModal';

// API URL for direct fetch calls
const API_URL = 'http://localhost:3001/api';

// Define the structure for a single throw display
interface ThrowDisplayData {
  score: number;
  multiplier: number;
}

interface GameStatistics {
  dartsThrown: number;
  averagePerThrow: number;
  highestThrow: number;
  totalPoints: number;
}

// Export this interface so it can be used by game components
export interface PlayerGameState extends Player {
  currentScore: number;
  lastThrows: (ThrowDisplayData | null)[];
  gameStats: GameStatistics;
  currentDart: number; // Track dart number per player
  position: number; // Add position property for sorting players
}

// Define game action log entry structure
interface GameLogEntry {
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
  isBusted?: boolean;
}

const GameHost: React.FC = () => {
  // Get gameId from URL params if available
  const { gameId: urlGameId } = useParams<{ gameId: string }>();
  
  const location = useLocation();
  const gameDataFromNav = location.state as GameSetupData;
  const [loadedGameData, setLoadedGameData] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const settings = useSettings();
  
  const [currentRound, setCurrentRound] = useState(1);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<PlayerGameState | null>(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [winningThrowId, setWinningThrowId] = useState<number | null>(null);

  // Ref to prevent double initialization
  const initialized = useRef(false);

  // Update showDebugPanel when settings change
  useEffect(() => {
    setShowDebugPanel(settings.showDebugInfo);
  }, [settings.showDebugInfo]);

  // Capture initialization errors
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Check if initialization has already occurred
    if (initialized.current) {
      return;
    }
    initialized.current = true; // Set flag that initialization has started

    const initializeGame = async () => {
      // If we have a gameId in the URL, load existing game
      if (urlGameId) {
        try {
          console.log(`[GameHost] Loading existing game with ID: ${urlGameId}`);
          
          // Parse the gameId from the URL
          const parsedGameId = parseInt(urlGameId);
          if (isNaN(parsedGameId)) {
            setInitError("Invalid game ID in URL");
            setIsLoading(false);
            return;
          }
          
          // Set gameId early to enable other functions
          setGameId(parsedGameId);
          
          // Fetch the game data
          const game = await gameService.getGameById(parsedGameId);
          if (!game) {
            setInitError("Game not found");
            setIsLoading(false);
            return;
          }
          
          console.log("[GameHost] Loaded existing game:", game);
          setLoadedGameData(game);
          
          // Get all player positions from game data
          if (!game.players || !Array.isArray(game.players)) {
            setInitError("Invalid game data: missing players");
            setIsLoading(false);
            return;
          }

          // Create player state objects for all players
          const playerInitPromises = game.players.map(async (gamePlayer: any) => {
            const playerId = gamePlayer.playerId;
            
            // Get player details
            const playerDetails = await playerService.getPlayerById(playerId);
            if (!playerDetails) {
              console.error(`[GameHost] Player ${playerId} not found`);
              return null;
            }
            
            // Get player statistics for this game
            const playerStats = await gameService.getPlayerStats(parsedGameId, playerId);
            
            // Get player throws to determine current state
            const throwsResponse = await fetch(`${API_URL}/games/${parsedGameId}/player-throws/${playerId}`);
            const throwsData = await throwsResponse.json();
            
            return {
              ...playerDetails,
              position: gamePlayer.position,
              currentScore: game.startingScore - (playerStats?.totalPoints || 0),
              lastThrows: throwsData?.lastThrows || [null, null, null],
              currentDart: 1, // Will be updated after all players are loaded
              gameStats: {
                dartsThrown: playerStats?.dartsThrown || 0,
                averagePerThrow: playerStats?.average || 0,
                highestThrow: playerStats?.highestScore || 0,
                totalPoints: playerStats?.totalPoints || 0
              }
            };
          });

          // Wait for all player initializations to complete
          const initializedPlayers = (await Promise.all(playerInitPromises))
            .filter((p): p is PlayerGameState => p !== null)
            .sort((a, b) => a.position - b.position);
          
          if (initializedPlayers.length === 0) {
            setInitError("No valid players found for this game");
            setIsLoading(false);
            return;
          }
          
          // Set the players state
          setPlayers(initializedPlayers);
          
          // Determine the current round (max round number across all players)
          const allThrowsPromises = initializedPlayers.map(async (player) => {
            const throwsResponse = await fetch(`${API_URL}/games/${parsedGameId}/player-throws/${player.id}`);
            return await throwsResponse.json();
          });
          
          const allThrowsData = await Promise.all(allThrowsPromises);
          
          // Get the highest round number from the database
          console.log(`[GameHost] Getting max round from database for all players`);
          const maxRoundFromDB = await gameService.getHighestRound(parsedGameId);
          
          console.log(`[GameHost] Highest round from DB: ${maxRoundFromDB}`);
          
          // Find which player is currently active and what dart they're on
          const throwsInCurrentRound = await Promise.all(
            initializedPlayers.map(async (player) => {
              const response = await gameService.getPlayerThrows(parsedGameId, player.id, maxRoundFromDB);
              const throwCount = response.lastThrows.filter((t: any) => t !== null).length;
              return {
                playerId: player.id,
                position: player.position,
                throwCount,
                hasCompletedRound: throwCount === 3
              };
            })
          );
          
          console.log(`[GameHost] Throws in current round ${maxRoundFromDB}:`, throwsInCurrentRound);
          
          // Check if all players have completed their throws in the current round
          const allPlayersCompletedRound = throwsInCurrentRound.every(p => p.hasCompletedRound);
          
          console.log(`[GameHost] All players completed round ${maxRoundFromDB}? ${allPlayersCompletedRound}`);
          
          let nextRound, activePlayerIndex;
          
          if (allPlayersCompletedRound) {
            // If all players completed the highest round, advance to the next round and use the first player
            nextRound = maxRoundFromDB + 1;
            
            // Sort players by position and get the first one
            const firstPositionPlayer = initializedPlayers.sort((a, b) => a.position - b.position)[0];
            activePlayerIndex = initializedPlayers.findIndex(p => p.id === firstPositionPlayer.id);
            
            console.log(`[GameHost] All players completed round ${maxRoundFromDB}, advancing to round ${nextRound} with first player (${firstPositionPlayer.name})`);
          } else {
            // If not all players completed the highest round, find the first player who hasn't completed their throws
            nextRound = maxRoundFromDB;
            const incompletePlayer = throwsInCurrentRound.find(p => !p.hasCompletedRound);
            
            if (incompletePlayer) {
              activePlayerIndex = initializedPlayers.findIndex(p => p.id === incompletePlayer.playerId);
              console.log(`[GameHost] Found incomplete player in round ${maxRoundFromDB}: Player ${incompletePlayer.playerId} (${initializedPlayers[activePlayerIndex].name}) with ${incompletePlayer.throwCount} throws`);
            } else {
              // Fallback to first player if no incomplete player found
              activePlayerIndex = 0;
              console.log(`[GameHost] No incomplete player found in round ${maxRoundFromDB}, using first player as fallback`);
            }
          }
          
          // Set the current round
          setCurrentRound(nextRound);
          setActivePlayerIndex(activePlayerIndex);
          
          // Update the current dart for the active player
          const currentPlayer = throwsInCurrentRound.find(p => p.playerId === initializedPlayers[activePlayerIndex].id);
          const currentDartNumber = allPlayersCompletedRound ? 1 : ((currentPlayer?.throwCount || 0) + 1);
          
          // Update players with the correct dart indices
          setPlayers(initializedPlayers.map((player, index) => {
            if (index === activePlayerIndex) {
              return {
                ...player,
                currentDart: currentDartNumber
              };
            }
            return player;
          }));
          
          setIsLoading(false);
          console.log(`[GameHost] Game ${parsedGameId} loaded successfully`);
          
        } catch (error) {
          console.error('[GameHost] Error loading game:', error);
          setInitError('Error loading game: ' + (error instanceof Error ? error.message : String(error)));
          setIsLoading(false);
        }
      }
      // If we have gameData from navigation, create new game (existing flow)
      else if (gameDataFromNav?.players) {
        try {
          console.log("[GameHost] Starting game initialization with players:", gameDataFromNav.players);
          
          // Load players
          const allPlayers = await playerService.getAllPlayers();
          console.log("[GameHost] Fetched all players:", allPlayers);
          
          if (!allPlayers || allPlayers.length === 0) {
            setInitError("Failed to fetch players. Please check the server connection.");
            setIsLoading(false);
            return;
          }
          
          const gamePlayers = allPlayers
            .filter(player => gameDataFromNav.players.includes(player.id.toString()))
            .map((player, index) => ({
              ...player,
              position: index, // Add position based on array index
              currentScore: gameDataFromNav.settings.startScore || 501,
              lastThrows: [null, null, null],
              currentDart: 1, // Initialize each player with dart 1
              gameStats: {
                dartsThrown: 0,
                averagePerThrow: 0,
                highestThrow: 0,
                totalPoints: 0
              }
            }));
            
          console.log("[GameHost] Filtered game players:", gamePlayers);
          
          if (gamePlayers.length === 0) {
            setInitError("No matching players found. Please check player selection.");
            setIsLoading(false);
            return;
          }

          // Create a single game for the entire match
          console.log("[GameHost] Attempting to create game..."); // Log before creation
          const game = await gameService.createGame({
            playerIds: gamePlayers.map(player => parseInt(player.id.toString())),
            gameType: gameDataFromNav.gameMode,
            startingScore: gameDataFromNav.settings.startScore || 501,
            settings: gameDataFromNav.settings
          });
          
          if (!game || !game.id) {
            setInitError("Failed to create game. Please try again.");
            setIsLoading(false);
            return;
          }
          
          setGameId(game.id);
          setLoadedGameData(game);
          
          // Set the players state and finish loading - only do this once
          setPlayers(gamePlayers);
          setIsLoading(false);
          
          if (game.id) {
            console.log(`[GameHost] Game successfully created with ID ${game.id}`);
          }
        } catch (error) {
          console.error('Error initializing game:', error);
          setInitError("Error initializing game: " + (error instanceof Error ? error.message : String(error)));
          setIsLoading(false);
        }
      } else {
        setInitError("No game data or game ID provided");
        setIsLoading(false);
      }
    };
    
    initializeGame();
  }, [gameDataFromNav, urlGameId]);
  
  // Add a separate effect to initialize player stats and throws after all functions are defined
  useEffect(() => {
    const initializeGameState = async () => {
      if (gameId && players.length > 0 && !isLoading) {
        console.log(`[GameHost] Initializing player stats and throws for game ${gameId}`);
        
        // Now that we have the game ID and all functions are defined, 
        // update stats and throws for all players
        for (let i = 0; i < players.length; i++) {
          try {
            await updatePlayerStats(i);
            // Load any existing throws for the current round
            await updatePlayerThrowsDisplay(i, currentRound);
          } catch (error) {
            console.error(`Error initializing player ${i}:`, error);
          }
        }
      }
    };
    
    initializeGameState();
  }, [gameId, isLoading, players.length]);

  // Redirect if no game data and no gameId is available
  if (!gameDataFromNav && !urlGameId && !loadedGameData && !isLoading) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="text-white text-center py-8">Loading game data...</div>;
  }

  if (initError) {
    return (
      <div className="text-white text-center py-8">
        <div className="text-red-500 font-bold mb-4">Error: {initError}</div>
        <button 
          onClick={() => window.history.back()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div className="text-white text-center py-8">
        <div className="text-red-500 font-bold mb-4">Failed to create or load game</div>
        <button 
          onClick={() => window.history.back()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Helper functions for dart/round numbers
  const getCurrentDartNumber = () => {
    return players[activePlayerIndex]?.currentDart || 1;
  };
  
  // Update round and dart numbers, returns true if player should be switched
  const updateRoundAndDart = (playerIndex: number, dartNumber: number): boolean => {
    if (dartNumber === 3) {
      // When the third dart is thrown:
      // 1. Increase the round number
      // 2. Reset the dart number to 1 for the next player
      // 3. Return true to signal a player switch
      setCurrentRound(prev => prev + 1);
      
      // Calculate the next player index
      const nextPlayerIndex = (playerIndex + 1) % players.length;
      
      // Explicitly set the next player's dart to 1
      setPlayers(currentPlayers => {
        const updatedPlayers = [...currentPlayers];
        updatedPlayers[nextPlayerIndex] = {
          ...updatedPlayers[nextPlayerIndex],
          currentDart: 1 // Explicitly reset to 1
        };
        return updatedPlayers;
      });
      
      return true; // Signal for player switch
    } else {
      // Otherwise, just increase the dart number for the current player
      setPlayers(currentPlayers => {
        const updatedPlayers = [...currentPlayers];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          currentDart: dartNumber + 1
        };
        return updatedPlayers;
      });
      return false; // No player switch needed
    }
  };

  // Updating player statistics
  const updatePlayerStats = async (playerIndex: number) => {
    if (!gameId) return;
    
    try {
      const player = players[playerIndex];
      // Direct typing instead of using StatsData
      const stats: {
        dartsThrown: number;
        average: number;
        highestScore: number;
        totalPoints: number;
      } = await gameService.getPlayerStats(gameId, parseInt(player.id.toString()));
      
      // Calculate the current remaining score based on stats
      const initialScore = loadedGameData?.startingScore || gameDataFromNav?.settings.startScore || 501;
      const remainingScore = Math.max(0, initialScore - stats.totalPoints);
      
      setPlayers(currentPlayers => {
        const newPlayers = [...currentPlayers];
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          currentScore: remainingScore, // Update the current score based on database stats
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
      
      // Determine if we should disable fallback
      // For active player in the current round, we should disable fallback to show only current throws
      const shouldDisableFallback = disableFallback || 
                                   (playerIndex === activePlayerIndex && targetRound === currentRound);
      
      // Query the server for the player's throws in the specified round
      const fallbackParam = shouldDisableFallback ? '&disableFallback=true' : '';
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
          lastThrows: hasThrows ? (throwData.lastThrows as (ThrowDisplayData | null)[]) : [null, null, null]
        };
        return newPlayers;
      });
    } catch (error) {
      console.error(`[updatePlayerThrowsDisplay] Error updating player ${playerIndex} throws:`, error);
    }
  };

  // Update player throws for display
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
      console.log(`[updatePlayerThrows] Response (should contain score/multiplier objects):`, throwData);

      // Count the actual number of non-null throws
      const actualThrowCount = throwData.lastThrows.filter((t: ThrowDisplayData | null) => t !== null).length;
      console.log(`[updatePlayerThrows] Found ${actualThrowCount} actual throws in round ${targetRound}`);
      
      // If we have throws in the database, use them
      if (actualThrowCount > 0) {
        // Use the throws from the database
        console.log(`[updatePlayerThrows] Setting throws for player ${playerIndex}:`, throwData.lastThrows);
        setPlayers(currentPlayers => {
          const newPlayers = [...currentPlayers];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            lastThrows: throwData.lastThrows as (ThrowDisplayData | null)[]
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

  // Handle player switching
  const handlePlayerSwitch = async (nextPlayerIndex: number, newRound: number) => {
    // Log the transition for debugging
    console.log(`[handlePlayerSwitch] From player ${activePlayerIndex} to ${nextPlayerIndex}, round: ${currentRound} to ${newRound}`);
    
    // Determine if we're going to a new round (forward) or back to a previous round (undo)
    const isMovingForward = newRound > currentRound;
    
    // Set the active player before updating display (to ensure correct player is targeted)
    setActivePlayerIndex(nextPlayerIndex);
    setCurrentRound(newRound);
    
    try {
      // Update displays for ALL players, not just the active one
      for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
        // For the player we're switching to
        if (playerIndex === nextPlayerIndex) {
          // ALWAYS fetch the state for the incoming player for the round they are entering.
          // Use disableFallback=true to ensure we see [null,null,null] if they haven't thrown yet in this round.
          if (isMovingForward) {
            console.log(`[handlePlayerSwitch] Moving forward to round ${newRound}. Fetching display for incoming player ${playerIndex} (disableFallback=true)`);
            await updatePlayerThrowsDisplay(playerIndex, newRound, true);
          } else {
            // Also use disableFallback=true when staying in the same round (e.g., after opponent bust or undo)
            // to ensure the incoming player starts with a clean slate for that round.
            console.log(`[handlePlayerSwitch] Staying in round/moving backward to ${newRound}. Fetching display for incoming player ${playerIndex} (disableFallback=true)`);
            await updatePlayerThrowsDisplay(playerIndex, newRound, true);
          }
        } 
        // For all other players, update their displays based on the appropriate round
        else {
          // When moving forward, other players should show their throws from the previous round
          const targetRound = isMovingForward ? currentRound : newRound;
          // For non-active players, allow fallback to previous rounds for a complete display
          console.log(`[handlePlayerSwitch] Updating display for non-active player ${playerIndex} for targetRound ${targetRound} (disableFallback=false)`);
          await updatePlayerThrowsDisplay(playerIndex, targetRound, false);
        }
        
        // Update stats for all players to ensure scores are in sync
        await updatePlayerStats(playerIndex);
      }
      
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

  // Add an entry to the game action log
  const addLogEntry = (
    throwInfo: {
      playerId: number;
      playerName: string;
      value: number;
      dartNumber: number;
      isBusted?: boolean;
    }
  ) => {
    setGameLog(prev => [...prev, {
      type: 'throw',
      timestamp: Date.now(),
      playerId: throwInfo.playerId,
      playerName: throwInfo.playerName,
      value: throwInfo.value,
      isBusted: throwInfo.isBusted
    }]);
  };

  // Generic function to handle a bust from any game mode
  const handleBustGeneric = async (
    playerId: number, 
    playerName: string, 
    throwValue: number, 
    multiplier: number, 
    dartNumber: number, 
    roundNumber: number, 
    targetNumber?: number, 
    isBull?: boolean
  ) => {
    // Add to game log
    addLogEntry({
      playerId: playerId,
      playerName: playerName,
      value: throwValue,
      dartNumber: dartNumber,
      isBusted: true
    });
    
    // Register the busted throw in the database
    await gameService.registerThrow({
      gameId: gameId!,
      playerId: playerId,
      score: throwValue,
      roundNumber,
      dartNumber,
      multiplier,
      isBull: isBull || false,
      targetNumber: targetNumber || throwValue / multiplier
    });
    
    // Mark the round as busted in the backend
    await gameService.markRoundAsBusted(gameId!, playerId, roundNumber);
    
    // Switch to next player (bust)
    const nextPlayerIndex = (activePlayerIndex + 1) % players.length;
    // Only advance the round if we were on the last dart
    const nextRound = roundNumber + (dartNumber === 3 ? 1 : 0);

    // Make sure the player's score is properly updated based on database
    await updatePlayerStats(activePlayerIndex);
    
    // Make sure the next player starts with dart 1
    setPlayers(currentPlayers => {
      const updatedPlayers = [...currentPlayers];
      // Keep the current player's score as updated by updatePlayerStats
      updatedPlayers[activePlayerIndex] = {
        ...updatedPlayers[activePlayerIndex],
        lastThrows: [null, null, null]
      };
      // Ensure next player starts with dart 1 regardless of when the bust occurred
      updatedPlayers[nextPlayerIndex] = {
        ...updatedPlayers[nextPlayerIndex],
        currentDart: 1
      };
      return updatedPlayers;
    });
    
    // Switch to next player with resolved round number
    await handlePlayerSwitch(nextPlayerIndex, nextRound);
    
    // Update all players' stats again to ensure scores are consistent
    for (let i = 0; i < players.length; i++) {
      await updatePlayerStats(i);
    }
  };

  // Generic game end handler that can be called by any game mode when a win condition is met
  const handleGameEnd = async (winnerIndex: number) => {
    if (!gameId || winnerIndex < 0 || winnerIndex >= players.length) return;
    
    try {
      // Make sure the player statistics are up to date
      for (let i = 0; i < players.length; i++) {
        await updatePlayerStats(i);
      }
      
      // Get the most up-to-date player data for the winner
      const currentWinner = players[winnerIndex];
      const currentWinnerData = await gameService.getPlayerStats(
        gameId, 
        parseInt(currentWinner.id.toString())
      );
      
      // Create updated winner object with latest stats
      const updatedWinner = {
        ...players[winnerIndex],
        gameStats: {
          dartsThrown: currentWinnerData.dartsThrown,
          averagePerThrow: currentWinnerData.average,
          highestThrow: currentWinnerData.highestScore,
          totalPoints: currentWinnerData.totalPoints
        }
      };
      
      // Set the winner and game over state after stats are updated
      setWinner(updatedWinner);
      setIsGameOver(true);
      
      console.log('Game ended with winner:', updatedWinner.name);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  // Generic undo function that works across all game modes
  const handleUndo = async () => {
    if (!gameId) {
      console.error('No game ID available');
      return;
    }

    try {
      // Get the active player
      const playerObject = players[activePlayerIndex];
      
      // Store the current round number for later use
      const originalRound = currentRound;
      const originalDartNumber = getCurrentDartNumber();
      
      console.log(`[handleUndo] Starting undo operation. Current round: ${originalRound}, current dart: ${originalDartNumber}`);
      
      // Get the last throw ID and details before deleting it
      const lastThrowId = await gameService.getLastThrowId(gameId);
      
      if (!lastThrowId) {
        toast.error('Could not find last throw.');
        return;
      }

      // Get the actual throw record we're going to delete to know exactly what we're undoing
      let throwData;
      try {
        const throwResponse = await fetch(`${API_URL}/throws/${lastThrowId}`);
        throwData = await throwResponse.json();
        console.log(`[handleUndo] Last throw details:`, throwData);
      } catch (error) {
        console.error('[handleUndo] Error getting throw details:', error);
        toast.error('Error retrieving throw data.');
        return;
      }
      
      // Now we know the exact round, player, and dart of the throw we're undoing
      const throwPlayerId = throwData.playerId;
      const throwRoundNumber = throwData.roundNumber;
      const throwDartNumber = throwData.dartNumber;
      const throwPlayerIndex = players.findIndex(p => parseInt(p.id.toString()) === throwPlayerId);
      
      // Check if we're undoing a throw from a different player
      const isDifferentPlayer = parseInt(playerObject.id.toString()) !== throwPlayerId;
      
      console.log(`[handleUndo] Undoing throw: player ${throwPlayerId} (index ${throwPlayerIndex}), round ${throwRoundNumber}, dart ${throwDartNumber}, different player: ${isDifferentPlayer}`);
      
      // Delete the throw from the database
      await gameService.undoLastThrow(lastThrowId);
      
      // Check for busted throws in this round and un-bust if needed
      const throwsResponse = await fetch(
        `${API_URL}/games/${gameId}/player-throws/${throwPlayerId}?round=${throwRoundNumber}`
      );
      const roundData = await throwsResponse.json();
      
      console.log(`[handleUndo] Round status after deleting throw:`, roundData);
      
      // If there are busted throws in this round, un-bust them
      if (roundData.hasBustedThrows || roundData.bustedThrowCount > 0) {
        console.log(`[handleUndo] Found ${roundData.bustedThrowCount} busted throws in round ${throwRoundNumber}, un-busting the round`);
        await gameService.unmarkRoundAsBusted(gameId, throwPlayerId, throwRoundNumber);
      }
      
      // Get the most recent throw for the player whose throw we just deleted
      // This will help us determine the correct dart position
      const recentThrowResponse = await fetch(`${API_URL}/games/${gameId}/player-throws/${throwPlayerId}`);
      const recentThrowData = await recentThrowResponse.json();
      console.log(`[handleUndo] Recent throws for player ${throwPlayerId} after undo:`, recentThrowData);
      
      // Determine the correct round and dart to use next
      let targetRound = throwRoundNumber;
      let nextDartNumber = throwDartNumber; // Start with the dart number we just removed
      
      // If we were undoing a different player's throw, we need to switch to that player
      if (isDifferentPlayer) {
        console.log(`[handleUndo] Switching to player ${throwPlayerIndex} since we undid their throw`);
        
        // Set active player and ensure correct dart number
        setActivePlayerIndex(throwPlayerIndex);
        
        // Set the player's current dart to the dart we just removed
        setPlayers(currentPlayers => {
          const updatedPlayers = [...currentPlayers];
          updatedPlayers[throwPlayerIndex] = {
            ...updatedPlayers[throwPlayerIndex],
            currentDart: nextDartNumber
          };
          return updatedPlayers;
        });
        
        // Set the current round
        setCurrentRound(targetRound);
      } else {
        // We're undoing a dart from the current player
        // Update the current dart number
        setPlayers(currentPlayers => {
          const updatedPlayers = [...currentPlayers];
          updatedPlayers[activePlayerIndex] = {
            ...updatedPlayers[activePlayerIndex],
            currentDart: nextDartNumber
          };
          return updatedPlayers;
        });
        
        // Set the current round
        setCurrentRound(targetRound);
      }
      
      // Update all players' stats and throws to ensure consistent state
      for (let i = 0; i < players.length; i++) {
        await updatePlayerStats(i);
        if (i === throwPlayerIndex) {
          // For the player whose throw we undid, update with the correct round
          await updatePlayerThrows(i, false, targetRound);
        } else {
          // For other players, use their own recent throws
          await updatePlayerThrows(i);
        }
      }
      
      console.log(`[handleUndo] Undo complete. Active player: ${activePlayerIndex}, Round: ${targetRound}, Next dart: ${nextDartNumber}`);
      toast.success('Move undone.');
    } catch (error) {
      console.error('Error during undo:', error);
      toast.error('Error undoing move');
    }
  };

  // Callback handler for a generic throw from any game mode
  const handleThrowGeneric = async (
    playerId: number, 
    throwValue: number, 
    multiplier: number, 
    dartNumber: number, 
    roundNumber: number, 
    targetNumber?: number, 
    isBull?: boolean,
    isBusted?: boolean,
    isWinningThrow?: boolean
  ): Promise<boolean> => {
    if (!gameId) {
      console.error('No game ID available for throw');
      return false; // Ensure we always return a boolean
    }

    try {
      // Register throw in backend
      await gameService.registerThrow({
        gameId,
        playerId,
        score: throwValue,
        roundNumber,
        dartNumber,
        multiplier,
        isBull: isBull || false,
        targetNumber: targetNumber || (multiplier ? throwValue / multiplier : 0)
      });

      // Add to game log - now using the isBusted parameter
      const playerName = players.find(p => parseInt(p.id.toString()) === playerId)?.name || 'Unknown';
      addLogEntry({
        playerId,
        playerName,
        value: throwValue,
        dartNumber,
        isBusted // Use the isBusted parameter
      });

      // If it's a winning throw, get the throw ID for the modal
      if (isWinningThrow) {
        const lastThrowId = await gameService.getLastThrowId(gameId);
        if (lastThrowId) {
          setWinningThrowId(lastThrowId);
        }
      }

      // Update stats for all players
      for (let i = 0; i < players.length; i++) {
        await updatePlayerStats(i);
      }

      // Update throws display after registering the throw
      await updatePlayerThrows(activePlayerIndex, false, roundNumber);

      return true; // Indicate success
    } catch (error) {
      console.error('Error registering throw:', error);
      return false;
    }
  };

  // Format timestamp for the debug panel
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };

  // Get the current game mode and settings
  const getGameMode = (): string => {
    if (loadedGameData) {
      return loadedGameData.gameType;
    }
    return gameDataFromNav?.gameMode || "unknown";
  };

  // Get the current game settings
  const getGameSettings = () => {
    if (loadedGameData) {
      // Check if settings is a string (that needs parsing) or already an object
      if (typeof loadedGameData.settings === 'string') {
        try {
          return JSON.parse(loadedGameData.settings);
        } catch (error) {
          console.error('[GameHost] Error parsing game settings:', error);
          return {}; // Return empty object as fallback
        }
      } else {
        // Settings is already an object
        return loadedGameData.settings || {};
      }
    }
    return gameDataFromNav?.settings || {};
  };

  // Determine what game component to render based on game mode
  const renderGameComponent = () => {
    const gameMode = getGameMode();
    const gameSettings = getGameSettings();
    
    const commonProps = {
      gameId: gameId!,
      settings: gameSettings,
      players,
      activePlayerIndex,
      currentRound,
      onUndo: handleUndo,
      onBust: handleBustGeneric,
      onRegisterThrow: handleThrowGeneric,
      onPlayerSwitch: handlePlayerSwitch,
      onGameOver: handleGameEnd,
      updateRoundAndDart
    };

    switch (gameMode) {
      case 'x01':
        return <X01Game {...commonProps} settings={gameSettings as X01Settings} />;
      // Add cases for other game modes as they are implemented
      default:
        return <div className="text-white text-center py-4">Game mode {gameMode} not yet implemented.</div>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Debug Information Panel - Controlled by settings */}
      {showDebugPanel && (
        <div className="bg-gray-800 p-3 rounded text-white text-sm">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>Game ID: {gameId}</div>
            <div>Active Player: {players[activePlayerIndex]?.name || 'None'}</div>
            <div>Current Dart: {getCurrentDartNumber()}</div>
            <div>Current Round: {currentRound}</div>
            <div>Game Mode: {getGameMode()}</div>
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

      {/* Grid for Player Score Cards - changed to flexbox */}
      <div className="flex flex-wrap justify-center items-start gap-x-2.5 gap-y-4">
        {/* Player Score Cards Map with 'vs.' separator */}
        {players.map((player, index) => {
          // Determine if and which dart index to highlight for this player
          const shouldHighlight = index === activePlayerIndex && settings.highlightCurrentDart;
          // player.currentDart is 1, 2, or 3. Array index is 0, 1, or 2.
          const highlightIndex = shouldHighlight ? (player.currentDart - 1) : -1; // Use -1 if no highlight

          return (
            <React.Fragment key={player.id}>
              <PlayerScoreCard
                playerName={player.name}
                currentScore={player.currentScore}
                lastThrows={player.lastThrows}
                isActive={index === activePlayerIndex}
                statistics={{
                  average: player.gameStats.averagePerThrow,
                  dartsThrown: player.gameStats.dartsThrown,
                  highestScore: player.gameStats.highestThrow
                }}
                showStats={settings.showStatistics}
                showScoreSum={settings.showLastThrowSum}
                highlightDartIndex={highlightIndex} // Pass the calculated index
              />
              {/* Add 'vs.' between cards */}
              {index < players.length - 1 && (
                <div className="text-2xl font-bold text-gray-400 self-center mx-2.5">
                  vs.
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Render the game-specific component */}
      <div className="max-w-lg mx-auto">
        {renderGameComponent()}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      {/* Game over modal */}
      {isGameOver && winner && gameId && winningThrowId && (
        <GameOverModal
          isOpen={isGameOver}
          gameId={gameId}
          winner={winner}
          winningThrowId={winningThrowId}
        />
      )}
    </div>
  );
};

export default GameHost;
