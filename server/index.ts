import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import type { Request, Response, RequestHandler } from 'express';

const app = express();
const prisma = new PrismaClient();
const port = 3001; // Behalten Sie 3001 für den API-Server

app.use(cors({
  origin: 'http://localhost:5173', // Vite Dev Server Port
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Favicon-Route hinzufügen
app.get('/favicon.ico', (req: Request, res: Response): void => {
  res.status(204).end(); // Sende "No Content" für Favicon-Anfragen
});

// GET /api/players - Alle Spieler abrufen
app.get('/api/players', async (req: Request, res: Response): Promise<void> => {
  try {
    const players = await prisma.player.findMany();
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
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
    console.error('Error creating player:', error);
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
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Could not update player' });
  }
});

// DELETE /api/players/:id - Spieler löschen
app.delete('/api/players/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = parseInt(req.params.id);

    // Überprüfen, ob der Spieler existiert
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Löschen aller verknüpften GamePlayer-Einträge
    await prisma.gamePlayer.deleteMany({
      where: { playerId }
    });

    // Löschen aller verknüpften Throws
    await prisma.throw.deleteMany({
      where: { playerId }
    });

    // Setze winnerId auf null in allen Spielen, wo dieser Spieler gewonnen hat
    await prisma.game.updateMany({
      where: { winnerId: playerId },
      data: { winnerId: null }
    });

    // Spieler löschen
    await prisma.player.delete({
      where: { id: playerId }
    });

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Could not delete player' });
  }
});

// POST /api/games - Neues Spiel erstellen
app.post('/api/games', async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerIds, gameType, startingScore, settings } = req.body;
    const game = await prisma.game.create({
      data: {
        gameType,
        startTime: new Date(),
        score: startingScore,
        settings: JSON.stringify(settings),
        isFinished: false,
        players: {
          create: playerIds.map((playerId: number, index: number) => ({
            playerId,
            position: index + 1
          }))
        }
      },
      include: {
        players: true
      }
    });
    res.json(game);
  } catch (error) {
    console.error('Error creating game:', error);
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
    console.error('Error registering throw:', error);
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
    console.error('Error deleting throw:', error);
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
    console.error('Error getting throw:', error);
    res.status(500).json({ error: 'Could not get throw' });
  }
});

// POST /api/games/:id/end - Spiel beenden
app.post('/api/games/:id/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    const { finalScore, dartsThrown } = req.body;
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        endTime: new Date(),
        score: finalScore,
        dartsThrown: dartsThrown,
        average: dartsThrown > 0 ? (finalScore / dartsThrown) * 3 : 0,
        isFinished: true
      }
    });
    res.json(game);
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Could not end game' });
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
    console.error('Error getting game:', error);
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
    console.error('Error getting last throw:', error);
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
    console.error('Error fetching player stats:', error);
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
    let roundThrows;
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
        
        // Now get throws from that round for THIS PLAYER
        roundThrows = await prisma.throw.findMany({
          where: {
            gameId,
            playerId, // Important: filter by playerId
            roundNumber: effectiveRound
          },
          orderBy: {
            dartNumber: 'asc'
          }
        });
        
        console.log(`[player-throws] Using throws from round ${effectiveRound} as fallback:`,
          roundThrows.map(t => ({ dart: t.dartNumber, score: t.score, busted: t.busted })));
      }
    } else {
      // If fallback is disabled and there are no throws, we'll return empty throws
      if (throwCount === 0 && disableFallback) {
        console.log(`[player-throws] No throws in requested round ${targetRound} and fallback disabled, returning empty array`);
        roundThrows = [];
      } else {
        // Fetch throws for the specific round - EXPLICITLY restrict to the exact round for THIS PLAYER
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
          }
        });

        console.log(`[player-throws] Found ${roundThrows.length} throws for EXACT round ${targetRound}:`, 
          roundThrows.map(t => ({ dart: t.dartNumber, score: t.score, round: t.roundNumber, busted: t.busted })));
      }
    }

    // Create an array with 3 positions (for dart 1, 2, 3)
    const formattedThrows: (number | null)[] = [null, null, null];
    
    // Ensure throws are positioned correctly in the array based on their dartNumber
    if (roundThrows && roundThrows.length > 0) {
      // First clear any previous data to ensure no old data appears
      formattedThrows.fill(null);
      
      // Then add the throws in the correct positions based on dartNumber
      for (const throw_ of roundThrows) {
        // Make sure we only process valid dart numbers (1, 2, or 3)
        if (throw_.dartNumber >= 1 && throw_.dartNumber <= 3) {
          // Position in array is dartNumber - 1 (so dart 1 goes in position 0)
          const arrayPosition = throw_.dartNumber - 1;
          
          // If busted, store negative value to indicate bust
          if (throw_.busted) {
            formattedThrows[arrayPosition] = throw_.score * -1;
          } else {
            formattedThrows[arrayPosition] = throw_.score;
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
          busted: t.busted 
        })) || []
      }
    });
  } catch (error) {
    console.error('Error getting player throws:', error);
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
    const updates: typeof throws = [];
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
    console.error('Error marking throws as busted:', error);
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
    const updates: typeof throws = [];
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
    console.error('Error restoring throws from busted state:', error);
    res.status(500).json({ error: 'Could not restore throws from busted state' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
