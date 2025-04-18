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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
