import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';

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
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // Sende "No Content" für Favicon-Anfragen
});

// GET /api/players - Alle Spieler abrufen
app.get('/api/players', async (req, res) => {
  try {
    const players = await prisma.player.findMany();
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Could not fetch players' });
  }
});

// POST /api/players - Neuen Spieler erstellen
app.post('/api/players', async (req, res) => {
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
app.put('/api/players/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const { name, nickname } = req.body;

    // Überprüfen, ob der Spieler existiert
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found' });
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
app.delete('/api/players/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);

    // Überprüfen, ob der Spieler existiert
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found' });
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

    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Could not delete player' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
