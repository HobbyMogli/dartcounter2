import express from 'express';
import cors from 'cors';
import pkg from '@prisma/client'; // Import using pkg for types
const { PrismaClient } = pkg; // Destructure value
import path from 'path';
import type { Request, Response, RequestHandler } from 'express';
import { isX01CheckoutPossible, isX01CheckoutScoreValid } from './game-modes/x01/logic.js'; // Use .js extension
import { x01Routes } from './game-modes/x01/routes.js'; // Use .js extension

const app = express();
const prisma = new PrismaClient();
const port = 3001; // Behalten Sie 3001 für den API-Server

app.use(cors({
  origin: 'http://localhost:5173', // Explicitly allow the frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'], // Specify allowed headers if needed, Content-Type is common
  credentials: false
}));

app.use(express.json());

// Mount X01 game mode routes
app.use('/api/x01', x01Routes);

// Favicon-Route hinzufügen
app.get('/favicon.ico', (req: Request, res: Response): void => {
  res.status(204).end(); // Sende "No Content" für Favicon-Anfragen
});

// Legacy functions temporarily kept for backward compatibility
function isCheckoutPossible(score: number, checkoutRule: string): boolean {
  return isX01CheckoutPossible(score, checkoutRule as any);
}

function isCheckoutScoreValid(score: number, checkoutRule: string): boolean {
  return isX01CheckoutScoreValid(score, checkoutRule as any);
}

// Function to update player statistics when a game ends
async function updatePlayerStatisticsForGame(gameId: number) {
  try {
    // Get the game with all related data
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            player: true
          }
        },
        throws: {
          orderBy: [
            { roundNumber: 'asc' },
            { dartNumber: 'asc' }
          ]
        }
      }
    });

    if (!game || !game.isFinished) {
      console.log(`[updatePlayerStats] Game ${gameId} not found or not finished`);
      return;
    }

    console.log(`[updatePlayerStats] Updating statistics for game ${gameId}`);

    // Get the winner if available
    const winnerId = game.winnerId;

    // Get checkout rule from game settings
    const checkoutRule = game.settings.includes('"checkOut":"triple"') ? 'triple' : 'double';

    // Group throws by player
    const playerThrows = new Map<number, any[]>();
    game.throws.forEach(throwData => {
      if (!throwData.busted) { // Only consider valid throws
        if (!playerThrows.has(throwData.playerId)) {
          playerThrows.set(throwData.playerId, []);
        }
        playerThrows.get(throwData.playerId)?.push(throwData);
      }
    });

    // Process each player
    for (const gamePlayer of game.players) {
      const playerId = gamePlayer.playerId;
      const player = gamePlayer.player;
      const playerThrowList = playerThrows.get(playerId) || [];
      
      // Count complete rounds (sets of 3 throws)
      const rounds = new Map<number, any[]>();
      playerThrowList.forEach(t => {
        if (!rounds.has(t.roundNumber)) {
          rounds.set(t.roundNumber, []);
        }
        rounds.get(t.roundNumber)?.push(t);
      });
      
      // Calculate statistics
      let completeRounds = 0;
      let totalPointsInCompleteRounds = 0;
      let highestRoundScore = 0;
      let checkoutOpportunities = 0;
      let successfulCheckouts = 0;
      let isValidCheckoutSequence = true; // Track if player is still in valid sequence
      
      // Track the running score for the player
      let remainingScore = game.startingScore;

      // Sort rounds to process them in order
      const sortedRounds = Array.from(rounds.entries()).sort(([a], [b]) => a - b);
      
      for (const [roundNum, roundThrows] of sortedRounds) {
        if (!isValidCheckoutSequence) break; // Stop if player has busted
        
        // Only consider checkout opportunities if starting score is valid
        if (isCheckoutScoreValid(remainingScore, checkoutRule)) {
          // Check if this round had any valid throws
          const validThrows = roundThrows.filter(t => !t.busted);
          if (validThrows.length > 0) {
            checkoutOpportunities++;
            if (validThrows.some(t => t.isWinningThrow)) {
              successfulCheckouts++;
            }
          }
        }

        // Process throws and update remaining score
        for (const t of roundThrows) {
          if (t.busted) {
            isValidCheckoutSequence = false;
            break;
          }
          remainingScore -= t.score;
        }

        console.log(`[updatePlayerStats] Round ${roundNum}: Score=${remainingScore}, Opportunities=${checkoutOpportunities}, Successes=${successfulCheckouts}`);
      }

      // Calculate checkout percentage only if there were opportunities
      const checkoutPercentage = checkoutOpportunities > 0 
        ? (successfulCheckouts / checkoutOpportunities) * 100 
        : player.checkoutPercentage; // Keep existing percentage if no new opportunities

      // Log for debugging
      console.log(`[updatePlayerStats] Final stats for player ${playerId}:`, {
        opportunities: checkoutOpportunities,
        successes: successfulCheckouts,
        percentage: checkoutPercentage,
        validSequence: isValidCheckoutSequence
      });

      // Get ALL winning doubles for this player across all games
      const allWinningDoubles = await prisma.winningDouble.findMany({
        where: {
          playerId
        }
      });

      // Count occurrences of each double
      const doubleCounts = new Map<number, number>();
      allWinningDoubles.forEach(wd => {
        doubleCounts.set(wd.value, (doubleCounts.get(wd.value) || 0) + 1);
      });

      // Find the most frequent double
      let favoriteDouble: number | null = null;
      let maxCount = 0;
      doubleCounts.forEach((count, value) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteDouble = value;
        }
      });

      console.log(`[updatePlayerStats] Player ${playerId} winning doubles:`, 
        Object.fromEntries(doubleCounts.entries()),
        `favorite: ${favoriteDouble} (used ${maxCount} times)`
      );

      // Get existing player stats
      const existingPlayer = await prisma.player.findUnique({
        where: { id: playerId }
      });
      
      if (!existingPlayer) {
        console.log(`[updatePlayerStats] Player ${playerId} not found, skipping`);
        continue;
      }
      
      // Update player statistics
      const updatedPlayer = await prisma.player.update({
        where: { id: playerId },
        data: {
          gamesPlayed: existingPlayer.gamesPlayed + 1,
          gamesWon: winnerId === playerId ? existingPlayer.gamesWon + 1 : existingPlayer.gamesWon,
          // Update average score as a weighted average of old and new
          averageScore: existingPlayer.gamesPlayed > 0 
            ? ((existingPlayer.averageScore * existingPlayer.gamesPlayed) + (totalPointsInCompleteRounds / completeRounds)) / (existingPlayer.gamesPlayed + 1)
            : (totalPointsInCompleteRounds / completeRounds),
          // Update highest score if new is higher
          highestScore: Math.max(existingPlayer.highestScore, highestRoundScore),
          // Update checkout percentage as weighted average
          checkoutPercentage: existingPlayer.gamesPlayed > 0
            ? ((existingPlayer.checkoutPercentage * existingPlayer.gamesPlayed) + checkoutPercentage) / (existingPlayer.gamesPlayed + 1)
            : checkoutPercentage,
          // Update favorite double if we found one
          favoriteDouble: favoriteDouble !== null ? favoriteDouble : existingPlayer.favoriteDouble
        }
      });
      
      console.log(`[updatePlayerStats] Updated stats for player ${playerId}:`, {
        gamesPlayed: updatedPlayer.gamesPlayed,
        gamesWon: updatedPlayer.gamesWon,
        averageScore: updatedPlayer.averageScore,
        highestScore: updatedPlayer.highestScore,
        checkoutPercentage: updatedPlayer.checkoutPercentage,
        favoriteDouble: updatedPlayer.favoriteDouble
      });
    }
    
    console.log(`[updatePlayerStats] Completed updating player statistics for game ${gameId}`);
  } catch (error) {
    console.error('[updatePlayerStats] Error updating player statistics:', error instanceof Error ? error.message : error);
  }
}

// Define a type for the selected throw data
type SelectedThrowData = {
  score: number;
  multiplier: number;
  dartNumber: number;
  busted: boolean;
  roundNumber?: number; // Optional as it's not selected in all paths
};

// GET /api/players - Alle Spieler abrufen
app.get('/api/players', async (req: Request, res: Response): Promise<void> => {
  try {
    const players = await prisma.player.findMany();
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not fetch players' });
  }
});

// POST /api/players - Neuen Spieler erstellen
app.post('/api/players', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, nickname, statistics } = req.body;
    const player = await prisma.player.create({
      data: {
        name,
        nickname,
        gamesPlayed: statistics?.gamesPlayed ?? 0,
        gamesWon: statistics?.gamesWon ?? 0,
        averageScore: statistics?.averageScore ?? 0,
        highestScore: statistics?.highestScore ?? 0,
        checkoutPercentage: statistics?.checkoutPercentage ?? 0
      }
    });
    res.json(player);
  } catch (error) {
    console.error('Error creating player:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not create player' });
  }
});

// PUT /api/players/:id - Spieler aktualisieren
app.put('/api/players/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = parseInt(req.params.id);
    const { name, nickname } = req.body;

    // Überprüfen, ob der Spieler existiert
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        name,
        nickname
      }
    });

    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not update player' });
  }
});

// DELETE /api/players/:id - Spieler löschen
app.delete('/api/players/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = parseInt(req.params.id);

    // First check if player exists
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Perform deletions in correct order using a transaction
    await prisma.$transaction(async (prisma) => {
      // 1. Delete winning doubles
      await prisma.winningDouble.deleteMany({
        where: { playerId }
      });

      // 2. Delete player statistics
      await prisma.playerStatistics.deleteMany({
        where: { playerId }
      });

      // 3. Delete throws
      await prisma.throw.deleteMany({
        where: { playerId }
      });

      // 4. Delete game players
      await prisma.gamePlayer.deleteMany({
        where: { playerId }
      });

      // 5. Update games where this player was winner
      await prisma.game.updateMany({
        where: { winnerId: playerId },
        data: { 
          winnerId: null,
          winnerPlayerName: null
        }
      });

      // 6. Finally delete the player
      await prisma.player.delete({
        where: { id: playerId }
      });
    });

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting player:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not delete player' });
  }
});

// DELETE /api/games/:id - Spiel löschen
app.delete('/api/games/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);

    // Check if the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    console.log(`[deleteGame] Attempting to delete game ${gameId}`);

    // Perform deletions within a transaction
    await prisma.$transaction(async (prisma) => {
      console.log(`[deleteGame] Deleting throws for game ${gameId}`);
      // 1. Delete throws associated with the game
      await prisma.throw.deleteMany({
        where: { gameId },
      });

      console.log(`[deleteGame] Deleting game players for game ${gameId}`);
      // 2. Delete game players associated with the game
      await prisma.gamePlayer.deleteMany({
        where: { gameId },
      });

      console.log(`[deleteGame] Deleting winning doubles for game ${gameId}`);
      // 3. Delete winning doubles associated with the game
      await prisma.winningDouble.deleteMany({
        where: { gameId },
      });

      console.log(`[deleteGame] Deleting game record ${gameId}`);
      // 4. Finally, delete the game itself
      await prisma.game.delete({
        where: { id: gameId },
      });
    });

    console.log(`[deleteGame] Successfully deleted game ${gameId} and related data.`);
    res.status(204).end(); // No Content response for successful deletion
  } catch (error) {
    console.error('Error deleting game:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not delete game' });
  }
});

// POST /api/games - Neues Spiel erstellen
app.post('/api/games', async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerIds, gameType, startingScore, settings } = req.body;
    
    // Create game with explicit relations
    const game = await prisma.game.create({
      data: {
        gameType,
        startTime: new Date(),
        startingScore,
        settings: typeof settings === 'string' ? settings : JSON.stringify(settings),
        isFinished: false,
        status: 'ongoing',
        players: {
          create: playerIds.map((playerId: number, index: number) => ({
            player: {
              connect: { id: playerId }
            },
            position: index + 1,
            averageScore: 0,
            highestScore: 0,
            checkoutPercentage: 0
          }))
        }
      },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    });

    console.log(`Created game ${game.id} with players:`, game.players.map(gp => gp.player.name));
    res.json(game);
  } catch (error) {
    console.error('Error creating game:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not create game' });
  }
});

// POST /api/throws - Neuen Wurf registrieren
app.post('/api/throws', async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, playerId, roundNumber, dartNumber, score, multiplier, targetNumber, isBull } = req.body;
    const throwData = await prisma.throw.create({
      data: {
        gameId,
        playerId,
        roundNumber,
        dartNumber,
        score,
        multiplier,
        targetNumber,
        isBull
      }
    });
    res.json(throwData);
  } catch (error) {
    console.error('Error registering throw:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not register throw' });
  }
});

// DELETE /api/throws/:id - Wurf löschen
app.delete('/api/throws/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const throwId = parseInt(req.params.id);
    await prisma.throw.delete({
      where: { id: throwId }
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting throw:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not delete throw' });
  }
});

// GET /api/throws/:id - Get throw details
app.get('/api/throws/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const throwId = parseInt(req.params.id);
    const throwData = await prisma.throw.findUnique({
      where: { id: throwId }
    });
    
    if (!throwData) {
      res.status(404).json({ error: 'Throw not found' });
      return;
    }
    
    console.log(`[get-throw] Retrieved throw ID ${throwId}:`, throwData);
    res.json(throwData);
  } catch (error) {
    console.error('Error getting throw:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not get throw' });
  }
});

// POST /api/games/:id/end - Spiel beenden
app.post('/api/games/:id/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    const { winnerId, winningThrowId } = req.body;
    
    console.log('Ending game with winner:', { gameId, winnerId, winningThrowId });

    if (!winnerId || isNaN(winnerId)) {
      throw new Error('Invalid winner ID');
    }

    // Start a transaction to ensure all updates happen together
    const game = await prisma.$transaction(async (prisma) => {
      // 1. Get the winning throw details to create winning double record
      if (winningThrowId) {
        const winningThrow = await prisma.throw.findUnique({
          where: { id: winningThrowId }
        });

        if (winningThrow && winningThrow.multiplier === 2) {
          // Create winning double record only for double-out throws
          await prisma.winningDouble.create({
            data: {
              playerId: winnerId,
              gameId: gameId,
              value: winningThrow.targetNumber || 0 // Use actual target number or 0 as fallback
            }
          });
        }

        // Update the throw to mark it as winning throw
        await prisma.throw.update({
          where: { id: winningThrowId },
          data: {
            isWinningThrow: true,
            busted: false
          }
        });
      }

      // 2. Update the game status and winner
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          endTime: new Date(),
          isFinished: true,
          status: 'finished',
          winnerId: winnerId
        },
        include: {
          winner: true,
          players: {
            include: {
              player: true
            }
          }
        }
      });

      return updatedGame;
    });

    res.json(game);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error ending game:', message);
    res.status(500).json({ error: 'Could not end game', details: message });
  }
});

// PUT /api/games/:id/winner - Set the winner of a game
app.put('/api/games/:id/winner', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    const { winnerId } = req.body;
    
    // Update the game with the winner ID
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        winnerId
      }
    });
    
    console.log(`[setGameWinner] Set winner ${winnerId} for game ${gameId}`);
    res.json(game);
  } catch (error) {
    console.error('Error setting game winner:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not set game winner' });
  }
});

// PUT /api/players/:id/statistics - Update player statistics
app.put('/api/players/:id/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = parseInt(req.params.id);
    const statistics = req.body;
    
    // Find the player
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });
    
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    
    // Update player with new statistics
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        gamesPlayed: statistics.gamesPlayed ?? player.gamesPlayed,
        gamesWon: statistics.gamesWon ?? player.gamesWon,
        averageScore: statistics.averageScore ?? player.averageScore,
        highestScore: statistics.highestScore ?? player.highestScore,
        checkoutPercentage: statistics.checkoutPercentage ?? player.checkoutPercentage,
        favoriteDouble: statistics.favoriteDouble ?? player.favoriteDouble
      }
    });
    
    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player statistics:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not update player statistics' });
  }
});

// Get game by ID
app.get('/api/games/:id', (async (req: Request, res: Response): Promise<void> => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(game);
  } catch (error) {
    console.error('Error getting game:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to get game' });
  }
}) as RequestHandler);

// Get last throw ID for a game
app.get('/api/games/:gameId/last-throw', async (req: Request, res: Response): Promise<void> => {
  try {
    const lastThrow = await prisma.throw.findFirst({
      where: { gameId: parseInt(req.params.gameId) },
      orderBy: { id: 'desc' }
    });
    res.json({ throwId: lastThrow?.id || null });
  } catch (error) {
    console.error('Error getting last throw:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to get last throw' });
  }
});

// GET /api/games/:gameId/player-stats/:playerId - Spielerstatistiken abrufen
app.get('/api/games/:gameId/player-stats/:playerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.gameId);
    const playerId = parseInt(req.params.playerId);

    // Hole alle Würfe des Spielers in diesem Spiel
    const throws = await prisma.throw.findMany({
      where: {
        gameId,
        playerId,
        busted: false // Only count non-busted throws
      },
      orderBy: [
        { roundNumber: 'asc' },
        { dartNumber: 'asc' }
      ]
    });

    // If the player has no throws, return all zeros
    if (throws.length === 0) {
      console.log(`[player-stats] No throws found for player ${playerId} in game ${gameId}, returning zeros`);
      res.json({
        average: 0,
        dartsThrown: 0,
        highestScore: 0,
        totalPoints: 0
      });
      return;
    }

    // Gruppiere Würfe nach Runden
    const rounds = new Map<number, number[]>();
    throws.forEach(t => {
      if (!rounds.has(t.roundNumber)) {
        rounds.set(t.roundNumber, []);
      }
      rounds.get(t.roundNumber)?.push(t.score);
    });

    // Berechne Statistiken nur für komplette Runden
    let totalPointsComplete = 0;
    let completeRounds = 0;
    rounds.forEach((roundThrows, roundNumber) => {
      if (roundThrows.length === 3) {
        totalPointsComplete += roundThrows.reduce((sum, score) => sum + score, 0);
        completeRounds++;
      }
    });

    // Berechne den Average nur für komplette Runden
    const dartsThrown = throws.length;
    const average = completeRounds > 0 ? (totalPointsComplete / (completeRounds * 3)) * 3 : 0;

    // For highest score, first look at complete rounds
    let highestScore = 0;
    
    // For complete rounds, use the total score of the round
    rounds.forEach((roundThrows) => {
      if (roundThrows.length === 3) {
        const roundScore = roundThrows.reduce((sum, score) => sum + score, 0);
        if (roundScore > highestScore) {
          highestScore = roundScore;
        }
      }
    });
    
    // If no complete rounds, look at individual throws
    if (highestScore === 0 && throws.length > 0) {
      highestScore = Math.max(...throws.map(t => t.score));
    }

    // Berechne die Gesamtpunktzahl (inkl. unvollständiger Runden)
    const totalPoints = throws.reduce((sum, t) => sum + t.score, 0);
    
    console.log(`[player-stats] Stats for player ${playerId}: throws=${dartsThrown}, avg=${average.toFixed(1)}, high=${highestScore}, total=${totalPoints}`);

    res.json({
      average,
      dartsThrown,
      highestScore,
      totalPoints
    });
  } catch (error) {
    console.error('Error fetching player stats:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: 'Could not fetch player stats',
      average: 0,
      dartsThrown: 0,
      highestScore: 0,
      totalPoints: 0
    });
  }
});

// GET /api/games/:gameId/player-throws/:playerId - Letzte Würfe eines Spielers abrufen
app.get('/api/games/:gameId/player-throws/:playerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.gameId);
    const playerId = parseInt(req.params.playerId);

    // Check if the round parameter is provided
    const roundParam = req.query.round ? parseInt(req.query.round as string) : undefined;
    
    // NEW: Check if fallback is disabled (client wants empty fields instead of previous round's throws)
    const disableFallback = req.query.disableFallback === 'true';
    console.log(`[player-throws] Fallback ${disableFallback ? 'DISABLED' : 'enabled'} for request - client wants ${disableFallback ? 'ONLY current round throws' : 'complete display with fallback'}`);
    
    // If no specific round is requested, get the most recent round
    let targetRound = roundParam;
    if (targetRound === undefined) {
      const mostRecentThrow = await prisma.throw.findFirst({
        where: {
          gameId,
          playerId // Important: filter by playerId first
        },
        orderBy: {
          id: 'desc'
        },
        select: {
          roundNumber: true
        }
    });

      targetRound = mostRecentThrow?.roundNumber || 1;
    }
    
    console.log(`[player-throws] Looking for throws in gameId=${gameId}, playerId=${playerId}, EXACT round=${targetRound}`);

    // First check if there are ANY throws for this player in this specific round
    const throwCount = await prisma.throw.count({
      where: {
        gameId,
        playerId,
        roundNumber: targetRound
      }
    });
    
    console.log(`[player-throws] Found ${throwCount} total throws for this round`);
    
    // Get ALL throws for this player in this game for debugging
    const allPlayerThrows = await prisma.throw.findMany({
      where: {
        gameId,
        playerId // Important: filter by playerId only
      },
      orderBy: [
        { roundNumber: 'asc' },
        { dartNumber: 'asc' }
      ]
    });
    
    console.log(`[player-throws] All throws for this player:`, 
      allPlayerThrows.map(t => ({ 
        round: t.roundNumber, 
        dart: t.dartNumber, 
        score: t.score,
        busted: t.busted 
      })));
    
    // Count busted throws for this round
    const bustedThrowCount = await prisma.throw.count({
      where: {
        gameId,
        playerId,
        roundNumber: targetRound,
        busted: true
      }
    });
    
    console.log(`[player-throws] Found ${bustedThrowCount} busted throws in round ${targetRound}`);
    
    // FALLBACK LOGIC: If there are no throws in the requested round,
    // find the player's most recent round with throws UNLESS fallback is disabled
    let effectiveRound = targetRound;
    let roundThrows: SelectedThrowData[] = [];
    let usedFallback = false;
    
    if (throwCount === 0 && allPlayerThrows.length > 0 && !disableFallback) {
      console.log(`[player-throws] No throws in requested round ${targetRound}, looking for most recent round...`);
      
      // Find the most recent round number where THIS PLAYER has throws - filter by playerId first!
      const mostRecentRound = await prisma.throw.findFirst({
        where: {
          gameId,
          playerId, // Important: filter by playerId first
        },
        orderBy: {
          roundNumber: 'desc'
        },
        select: {
          roundNumber: true
        }
      });
      
      if (mostRecentRound) {
        effectiveRound = mostRecentRound.roundNumber;
        usedFallback = true;
        console.log(`[player-throws] Found most recent round: ${effectiveRound}`);
        
        // Now get throws from that round for THIS PLAYER, including multiplier
        roundThrows = await prisma.throw.findMany({
          where: {
            gameId,
            playerId, // Important: filter by playerId
            roundNumber: effectiveRound
          },
          orderBy: {
            dartNumber: 'asc'
          },
          select: { // Select specific fields including multiplier
            score: true,
            multiplier: true,
            dartNumber: true,
            busted: true
          } 
        });
        
        console.log(`[player-throws] Using throws from round ${effectiveRound} as fallback:`,
          roundThrows.map(t => ({ dart: t.dartNumber, score: t.score, busted: t.busted, multiplier: t.multiplier })));
      }
    } else {
      // If fallback is disabled and there are no throws, we'll return empty throws
      if (throwCount === 0 && disableFallback) {
        console.log(`[player-throws] No throws in requested round ${targetRound} and fallback disabled, returning empty array`);
        roundThrows = [];
      } else {
        // Fetch throws for the specific round, including multiplier - EXPLICITLY restrict to the exact round for THIS PLAYER
        roundThrows = await prisma.throw.findMany({
          where: {
            gameId,
            playerId, // Important: filter by playerId
            roundNumber: {
              equals: targetRound
            }
          },
          orderBy: {
            dartNumber: 'asc'
          },
          select: { // Select specific fields including multiplier
            score: true,
            multiplier: true,
            dartNumber: true,
            roundNumber: true, // Keep round number for logging
            busted: true
          } 
        });

        console.log(`[player-throws] Found ${roundThrows.length} throws for EXACT round ${targetRound}:`, 
          roundThrows.map(t => ({ dart: t.dartNumber, score: t.score, round: t.roundNumber, busted: t.busted, multiplier: t.multiplier })));
      }
    }

    // Create an array with 3 positions (for dart 1, 2, 3)
    const formattedThrows: ({ score: number; multiplier: number } | null)[] = [null, null, null];
    
    // Ensure throws are positioned correctly in the array based on their dartNumber
    if (roundThrows && roundThrows.length > 0) {
      // First clear any previous data to ensure no old data appears
      formattedThrows.fill(null);
      
      // Then add the throws in the correct positions based on dartNumber
      for (const t of roundThrows) {
        // Make sure we only process valid dart numbers (1, 2, or 3)
        if (t.dartNumber >= 1 && t.dartNumber <= 3) {
          // Position in array is dartNumber - 1 (so dart 1 goes in position 0)
          const arrayPosition = t.dartNumber - 1;
          
          // If busted, store score as negative value but keep the multiplier
          if (t.busted) {
            formattedThrows[arrayPosition] = { score: t.score * -1, multiplier: t.multiplier };
          } else {
            formattedThrows[arrayPosition] = { score: t.score, multiplier: t.multiplier };
          }
        }
      }
    }

    // Calculate if we have any throws at all for this player
    const hasAnyThrows = await prisma.throw.count({
      where: {
        gameId,
        playerId // Important: filter by playerId
      }
    }) > 0;

    // Calculate the most recent round THIS PLAYER has thrown in
    const mostRecentRound = hasAnyThrows ? 
      (await prisma.throw.findFirst({
        where: { 
          gameId, 
          playerId // Important: filter by playerId
        },
        orderBy: { roundNumber: 'desc' },
        select: { roundNumber: true }
      }))?.roundNumber || 1 : 1;

    // Return detailed information
    res.json({
      lastThrows: formattedThrows,
      currentRound: targetRound,
      mostRecentRound: mostRecentRound,
      isRoundComplete: roundThrows?.length === 3,
      hasThrows: roundThrows?.length > 0,
      effectiveRound: effectiveRound, // Added to response to inform client which round's data we're showing
      usedFallback, // Added to indicate if we fell back to a previous round
      hasBustedThrows: bustedThrowCount > 0, // Add flag showing if there are busted throws
      bustedThrowCount: bustedThrowCount, // Add count of busted throws
      debug: {
        requestedRound: roundParam,
        targetRound,
        effectiveRound,
        throwCount,
        throwsFound: roundThrows?.length || 0,
        bustedThrowCount,
        hasAnyThrows,
        disableFallback,
        usedFallback,
        allRounds: allPlayerThrows.map(t => t.roundNumber).filter((v, i, a) => a.indexOf(v) === i), // Unique rounds
        roundThrows: roundThrows?.map(t => ({ 
          dart: t.dartNumber, 
          score: t.score, 
          round: t.roundNumber,
          busted: t.busted,
          multiplier: t.multiplier
        })) || []
      }
    });
  } catch (error) {
    console.error('Error getting player throws:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Could not get player throws',
      lastThrows: [null, null, null],
      currentRound: 1,
      mostRecentRound: 1,
      isRoundComplete: false,
      hasThrows: false
    });
  }
});

// POST /api/games/:gameId/mark-round-busted - Mark all throws in a round as busted
app.post('/api/games/:gameId/mark-round-busted', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.gameId);
    const { playerId, roundNumber } = req.body;
    
    console.log(`[mark-round-busted] Marking throws as busted for player ${playerId} in round ${roundNumber}`);
    
    // Find all throws for this player in this round
    const throws = await prisma.throw.findMany({
      where: {
        gameId,
        playerId,
        roundNumber
      }
    });

    console.log(`[mark-round-busted] Found ${throws.length} throws to mark as busted:`, 
      throws.map(t => ({ id: t.id, dart: t.dartNumber, score: t.score, busted: t.busted })));

    // Mark all throws as busted
    const updates: pkg.Throw[] = [];
    for (const throwData of throws) {
      console.log(`[mark-round-busted] Marking throw ID ${throwData.id} (dart ${throwData.dartNumber}, score ${throwData.score}) as busted`);
      
      if (!throwData.busted) {
        const update = await prisma.throw.update({
          where: { id: throwData.id },
          data: { busted: true }
        });
        updates.push(update);
        console.log(`[mark-round-busted] Successfully marked throw ID ${throwData.id} as busted`);
      } else {
        console.log(`[mark-round-busted] Throw ID ${throwData.id} already busted, skipping`);
      }
    }

    // Return the updated throws
    const updatedThrows = await prisma.throw.findMany({
      where: {
        gameId,
        playerId,
        roundNumber
      }
    });

    console.log(`[mark-round-busted] Marked ${updates.length} throws as busted`);

    res.json({ 
      success: true, 
      throws: updatedThrows,
      message: `Marked ${updates.length} throws as busted for player ${playerId} in round ${roundNumber}`,
      updatesApplied: updates.length
    });
  } catch (error) {
    console.error('Error marking throws as busted:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not mark throws as busted' });
  }
});

// POST /api/games/:gameId/unmark-round-busted - Restore all throws in a round from busted to normal state
app.post('/api/games/:gameId/unmark-round-busted', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.gameId);
    const { playerId, roundNumber } = req.body;
    
    console.log(`[unmark-round-busted] Restoring throws for player ${playerId} in round ${roundNumber}`);
    
    // Find all throws for this player in this round
    const throws = await prisma.throw.findMany({
      where: {
        gameId,
        playerId,
        roundNumber
      }
    });

    console.log(`[unmark-round-busted] Found ${throws.length} throws to restore:`, 
      throws.map(t => ({ id: t.id, dart: t.dartNumber, score: t.score, busted: t.busted })));

    // CRITICAL FIX: If no throws were found to restore, log this clearly
    if (throws.length === 0) {
      console.error(`[unmark-round-busted] NO THROWS FOUND for player ${playerId} in round ${roundNumber}. Nothing to restore!`);
      res.json({ 
        success: false, 
        message: `No throws found for player ${playerId} in round ${roundNumber}`,
        updatesApplied: 0
      });
      return;
    }

    // Try a more direct SQL approach to ensure updates are happening
    try {
      // Use Prisma's executeRaw for a direct SQL update as a backup method
      const result = await prisma.$executeRaw`
        UPDATE "Throw"
        SET "busted" = false
        WHERE "gameId" = ${gameId} 
        AND "playerId" = ${playerId} 
        AND "roundNumber" = ${roundNumber}
      `;
      console.log(`[unmark-round-busted] DIRECT SQL UPDATE affected ${result} rows`);
    } catch (sqlError) {
      console.error('[unmark-round-busted] Error with direct SQL update:', sqlError);
    }

    // Mark all throws as NOT busted using Prisma's update
    const updates: pkg.Throw[] = [];
    for (const throwData of throws) {
      console.log(`[unmark-round-busted] Restoring throw ID ${throwData.id} (dart ${throwData.dartNumber}, score ${throwData.score}, was busted: ${throwData.busted})`);
      
      if (throwData.busted) {
        try {
          const update = await prisma.throw.update({
            where: { id: throwData.id },
            data: { busted: false }
          });
          updates.push(update);
          console.log(`[unmark-round-busted] Successfully restored throw ID ${throwData.id}`);
        } catch (updateError) {
          console.error(`[unmark-round-busted] ERROR updating throw ID ${throwData.id}:`, updateError);
        }
      } else {
        console.log(`[unmark-round-busted] Throw ID ${throwData.id} was not busted, skipping`);
      }
    }

    // Verify the changes were actually made by re-fetching
    const verifiedThrows = await prisma.throw.findMany({
      where: {
        gameId,
        playerId,
        roundNumber
      }
    });
    
    console.log(`[unmark-round-busted] VERIFICATION: Current state after updates:`, 
      verifiedThrows.map(t => ({ id: t.id, dart: t.dartNumber, score: t.score, busted: t.busted })));

    const stillBusted = verifiedThrows.filter(t => t.busted);
    if (stillBusted.length > 0) {
      console.error(`[unmark-round-busted] WARNING: ${stillBusted.length} throws are STILL marked as busted after update!`);
    }

    // Return the updated throws
    res.json({ 
      success: true, 
      throws: verifiedThrows,
      message: `Restored ${updates.length} throws from busted state for player ${playerId} in round ${roundNumber}`,
      updatesApplied: updates.length,
      verification: {
        throwsChecked: verifiedThrows.length,
        stillBusted: stillBusted.length,
        details: verifiedThrows.map(t => ({ id: t.id, dart: t.dartNumber, busted: t.busted }))
      }
    });
  } catch (error) {
    console.error('Error restoring throws from busted state:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Could not restore throws from busted state' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
