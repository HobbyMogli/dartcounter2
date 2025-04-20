import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import type { GameSetupData } from '../types/gameTypes';
import PlayerScoreCard from '../components/game/PlayerScoreCard';
import { SettingsModal } from '../components/game-settings/SettingsModal';
import { playerService } from '../services/db';
import { gameService } from '../services/db/gameService';
import { Player } from '../services/db/types';
import { useSettings } from '../contexts/SettingsContext';
import { X01Game } from '../components/game/X01Game';
import { toast } from 'react-hot-toast';

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
  currentDart: number; // Track dart number per player
}

interface ThrowHistory {
  value: number;
  playerIndex: number;
}

const Game: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gameData = location.state as GameSetupData;
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [currentThrow, setCurrentThrow] = useState<number[]>([]);
  const [throwHistory, setThrowHistory] = useState<ThrowHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const settings = useSettings();
  
  // Neue Zustandsvariablen für Runden-Management - dart is now per player
  const [currentRound, setCurrentRound] = useState(1);
  
  // Add a state for debug panel visibility - controlled by settings now
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<PlayerGameState | null>(null);
  const [gameSaved, setGameSaved] = useState(false);

  // Ref hinzufügen, um doppelte Initialisierung zu verhindern
  const initialized = useRef(false);

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
    isBusted?: boolean;
  }>>([]);

  const showGameStats = settings.showStatistics;
  
  // Update showDebugPanel when settings change
  useEffect(() => {
    setShowDebugPanel(settings.showDebugInfo);
  }, [settings.showDebugInfo]);

  useEffect(() => {
    // Prüfe, ob die Initialisierung bereits erfolgte
    if (initialized.current) {
      return;
    }
    initialized.current = true; // Setze Flag, dass Initialisierung gestartet wurde

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
              currentDart: 1, // Initialize each player with dart 1
              gameStats: {
                dartsThrown: 0,
                averagePerThrow: 0,
                highestThrow: 0,
                totalPoints: 0
              }
            }));
          setPlayers(gamePlayers);

          // Create a single game for the entire match
          console.log("[Game] Attempting to create game..."); // Log vor Erstellung
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
          
          if (game.id) {
            console.log(`[Game] Game successfully created with ID ${game.id}`);
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

  // Dart-Nummern Hilfsfunktionen - now gets the current player's dart number
  const getCurrentDartNumber = () => {
    return players[activePlayerIndex]?.currentDart || 1;
  };
  
  // Runden-Nummern Hilfsfunktionen
  const getCurrentRoundNumber = () => currentRound;
  
  // Updated to work with player-specific dart numbers
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
  
  // Updated to work with player-specific dart numbers
  const undoRoundAndDart = (): boolean => {
    const currentPlayer = players[activePlayerIndex];
    const currentDart = currentPlayer.currentDart;
    
    if (currentDart === 1) {
      // If we're at dart 1, go to the previous round and set the previous player's dart to 3
      setCurrentRound(prev => Math.max(1, prev - 1));
      
      // Calculate the previous player index
      const prevPlayerIndex = (activePlayerIndex - 1 + players.length) % players.length;
      
      setPlayers(currentPlayers => {
        const updatedPlayers = [...currentPlayers];
        updatedPlayers[prevPlayerIndex] = {
          ...updatedPlayers[prevPlayerIndex],
          currentDart: 3
        };
        return updatedPlayers;
      });
      
      return true; // Signal for player switch
    } else {
      // Otherwise, just decrease the dart number for the current player
      setPlayers(currentPlayers => {
        const updatedPlayers = [...currentPlayers];
        updatedPlayers[activePlayerIndex] = {
          ...updatedPlayers[activePlayerIndex],
          currentDart: currentDart - 1
        };
        return updatedPlayers;
      });
      
      return false; // No player switch needed
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
      
      // Calculate the current remaining score based on stats
      const initialScore = gameData.settings.startScore || 501;
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

  // Updated handlePlayerSwitch to maintain player-specific dart numbers
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
          // For non-active players, allow fallback to previous rounds for a complete display
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

  // Function to handle busts consistently, to avoid code duplication
  const handleBust = async (currentPlayer: PlayerGameState, throwValue: number, multiplier: number, dartNumber: number, roundNumber: number, targetNumber?: number, isBull?: boolean) => {
    // Add to game log
    addLogEntry({
      playerId: parseInt(currentPlayer.id.toString()),
      playerName: currentPlayer.name,
      value: throwValue,
      dartNumber: dartNumber,
      isBusted: true
    });
    
    // Register the busted throw in the database
    await gameService.registerThrow({
      gameId: gameId!,
      playerId: parseInt(currentPlayer.id.toString()),
      score: throwValue,
      roundNumber,
      dartNumber,
      multiplier,
      isBull: isBull || false,
      targetNumber: targetNumber || throwValue / multiplier
    });
    
    // Mark the round as busted in the backend
    await gameService.markRoundAsBusted(gameId!, parseInt(currentPlayer.id.toString()), roundNumber);
    
    // Switch to next player (bust)
    const nextPlayerIndex = (activePlayerIndex + 1) % players.length;
    // Only advance the round if we were on the last dart
    const nextRound = roundNumber + (dartNumber === 3 ? 1 : 0);
    
    // Reset current throw
    setCurrentThrow([]);
    
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

  // In handleThrow function, replace the bust logic with calls to handleBust
  const handleThrow = async (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => {
    if (!gameId) {
      console.error('No game ID available');
      return;
    }

    try {
      const throwValue = score * multiplier;
      
      // Get current dart and round numbers from the current player
      const dartNumber = getCurrentDartNumber();
      const roundNumber = getCurrentRoundNumber();
      
      // Aktueller Spieler vor möglichem Wechsel
      let currentPlayer = players[activePlayerIndex];

      if (!currentPlayer) {
        console.error('No active player found');
        return;
      }

      // Calculate the new score after this throw
      const newScore = currentPlayer.currentScore - throwValue;

      // Get checkout rule
      const checkoutRule = gameData.settings.checkOut || 'straight';
      
      // Special cases for impossible checkouts when current score is already too low
      // Case 1: Double-Out and remaining score less than 2 (impossible to checkout)
      if (currentPlayer.currentScore < 2 && checkoutRule === 'double') {
        console.log(`Impossible checkout: Player ${currentPlayer.name} has score less than 2 with double-out rule.`);
        toast.error(`Bust! Score less than 2 cannot be checked out with a double.`);
        
        await handleBust(currentPlayer, throwValue, multiplier, dartNumber, roundNumber, targetNumber, isBull);
        return;
      }
      
      // Case 2: Triple-Out and remaining score less than 3 (impossible to checkout)
      if (currentPlayer.currentScore < 3 && checkoutRule === 'triple') {
        console.log(`Impossible checkout: Player ${currentPlayer.name} has score less than 3 with triple-out rule.`);
        toast.error(`Bust! Score less than 3 cannot be checked out with a triple.`);
        
        await handleBust(currentPlayer, throwValue, multiplier, dartNumber, roundNumber, targetNumber, isBull);
        return;
      }
      
      // Check if the throw would leave the player with an impossible checkout
      // Case 1: Double-Out and new score would be less than 2 but not 0 (impossible to checkout)
      if (newScore > 0 && newScore < 2 && checkoutRule === 'double') {
        console.log(`Throw would cause impossible checkout: Player ${currentPlayer.name} would have score ${newScore} with double-out rule.`);
        toast.error(`Bust! Score of ${newScore} cannot be checked out with a double.`);
        
        await handleBust(currentPlayer, throwValue, multiplier, dartNumber, roundNumber, targetNumber, isBull);
        return;
      }
      
      // Case 2: Triple-Out and new score would be less than 3 but not 0 (impossible to checkout)
      if (newScore > 0 && newScore < 3 && checkoutRule === 'triple') {
        console.log(`Throw would cause impossible checkout: Player ${currentPlayer.name} would have score ${newScore} with triple-out rule.`);
        toast.error(`Bust! Score of ${newScore} cannot be checked out with a triple.`);
        
        await handleBust(currentPlayer, throwValue, multiplier, dartNumber, roundNumber, targetNumber, isBull);
        return;
      }
      
      // Check if this would be a checkout throw
      if (newScore === 0) {
        // Check if it's a valid checkout based on game settings
        const checkoutRule = gameData.settings.checkOut || 'straight';
        let isValidCheckout = true;
        
        // Validate checkout based on rules
        if (checkoutRule === 'double' && multiplier !== 2) {
          isValidCheckout = false;
        } else if (checkoutRule === 'triple' && multiplier !== 3) {
          isValidCheckout = false;
        }
        
        // If it's an invalid checkout, bust the player
        if (!isValidCheckout) {
          console.log(`Invalid checkout: Player ${currentPlayer.name} busted!`);
          toast.error(`Bust! ${checkoutRule} finish required for checkout.`);
          
          await handleBust(currentPlayer, throwValue, multiplier, dartNumber, roundNumber, targetNumber, isBull);
          return;
        }
      } else if (newScore < 0) {
        // Handle bust for scores that would go below 0
        console.log(`Bust! Player ${currentPlayer.name}'s score would go below 0.`);
        toast.error("Bust! Score would go below zero.");
        
        await handleBust(currentPlayer, throwValue, multiplier, dartNumber, roundNumber, targetNumber, isBull);
        return;
      }

      // Add to game log
      addLogEntry({
        playerId: parseInt(currentPlayer.id.toString()),
        playerName: currentPlayer.name,
        value: throwValue,
        dartNumber: dartNumber
      });

      // Create a new lastThrows array with the current throw at the correct position
      // and null values for the remaining positions
      let newLastThrows = [...currentPlayer.lastThrows];
      newLastThrows[dartNumber - 1] = throwValue;
      
      // Update player's score and lastThrows
      const updatedPlayers = [...players];
      updatedPlayers[activePlayerIndex] = {
        ...currentPlayer,
        currentScore: newScore,
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

      // Check if player has won the game with this throw
      if (newScore === 0) {
        // Player has won! End the game
        await handleGameEnd(newScore);
        
        // Show winner message
        toast.success(`Game Over! ${currentPlayer.name} wins!`);
        
        // Here we could show a Game Over modal or navigate to a results page
        return;
      }

      // Update round and dart numbers, and check if we should switch player
      const shouldSwitchPlayer = updateRoundAndDart(activePlayerIndex, dartNumber);

      // If the third dart is thrown, switch to the next player
      if (shouldSwitchPlayer) {
        const nextPlayerIndex = (activePlayerIndex + 1) % players.length;
        const nextRound = currentRound + 1; // When switching after 3 darts, we move to next round
        
        // Reset current throw
        setCurrentThrow([]);
        
        // Ensure next player starts with dart 1 (this is redundant since updateRoundAndDart already does this,
        // but kept for clarity and robustness)
        setPlayers(currentPlayers => {
          const updatedPlayers = [...currentPlayers];
          updatedPlayers[nextPlayerIndex] = {
            ...updatedPlayers[nextPlayerIndex],
            currentDart: 1
          };
          return updatedPlayers;
        });
        
        // Use the handlePlayerSwitch function to manage the transition
        await handlePlayerSwitch(nextPlayerIndex, nextRound);
      } else {
        // If we don't switch players, make sure the current player's display is updated
        // This ensures the throw appears on the UI immediately
        // Disable fallback to always show the current round's throws
        await updatePlayerThrowsDisplay(activePlayerIndex, roundNumber, true);
      }

    } catch (error) {
      console.error('Error handling throw:', error);
    }
  };

  // Modified handleUndo function to fix dart positioning after undo operations
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
        toast.error('Konnte letzten Wurf nicht finden.');
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
        toast.error('Fehler beim Abrufen der Wurfdaten.');
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
      
      // Reset current throw
      setCurrentThrow([]);
      
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
      toast.success('Zug rückgängig gemacht.');
    } catch (error) {
      console.error('Error during undo:', error);
      toast.error('Fehler beim Rückgängigmachen');
    }
  };

  const handleGameEnd = async (score: number) => {
    if (!gameId) return;
    
    try {
      // Make sure the player statistics are up to date
      for (let i = 0; i < players.length; i++) {
        await updatePlayerStats(i);
      }
      
      // Get the most up-to-date player data for the winner
      const currentWinnerIndex = activePlayerIndex;
      const currentWinner = players[currentWinnerIndex];
      const currentWinnerData = await gameService.getPlayerStats(
        gameId, 
        parseInt(currentWinner.id.toString())
      );
      
      // Create updated winner object with latest stats
      const updatedWinner = {
        ...players[currentWinnerIndex],
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
      
      // Don't automatically save the game, let the user do it explicitly
      console.log('Game ended with score:', score);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  // New function to explicitly save the game
  const saveGameToDatabase = async () => {
    if (!gameId || !winner) return;
    
    try {
      // Set the winner ID and end the game in the database
      const winnerId = parseInt(winner.id.toString());
      await gameService.setGameWinner(gameId, winnerId);
      await gameService.endGame(gameId, winner.currentScore);
      
      // Mark the game as saved
      setGameSaved(true);
      toast.success('Game saved successfully!');
      
      console.log('Game saved to database');
    } catch (error) {
      console.error('Error saving game:', error);
      toast.error('Failed to save game');
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
            <div>Current Dart: {getCurrentDartNumber()}</div>
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
        gameSettings={gameData.settings}
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
      
      {/* Game Over Modal */}
      {isGameOver && winner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full text-center">
            <h2 className="text-2xl text-white font-bold mb-4">Game Over!</h2>
            <p className="text-xl text-white mb-4">{winner.name} wins!</p>
            <div className="text-white mb-6 space-y-2">
              <div className="flex justify-between px-4">
                <span>Würfe:</span>
                <span>{winner.gameStats.dartsThrown}</span>
              </div>
              <div className="flex justify-between px-4">
                <span>Ø pro Wurf:</span>
                <span>{winner.gameStats.averagePerThrow.toFixed(1)}</span>
              </div>
              <div className="flex justify-between px-4">
                <span>Höchster Wurf:</span>
                <span>{winner.gameStats.highestThrow}</span>
              </div>
            </div>
            
            {!gameSaved ? (
              <div className="mb-4">
                <button 
                  onClick={saveGameToDatabase}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full mb-4"
                >
                  Spiel speichern
                </button>
                <p className="text-yellow-400 text-sm">Speichere das Spiel, um die Spielerstatistiken zu aktualisieren.</p>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-green-400 mb-4">
                  ✓ Spiel gespeichert
                </p>
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Play Again
              </button>
              <button 
                onClick={() => navigate('/')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
