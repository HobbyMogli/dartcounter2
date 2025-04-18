-- CreateTable
CREATE TABLE "players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "averageScore" REAL NOT NULL DEFAULT 0,
    "highestScore" INTEGER NOT NULL DEFAULT 0,
    "checkoutPercentage" REAL NOT NULL DEFAULT 0,
    "favoriteDouble" INTEGER,
    "profileImage" TEXT
);

-- CreateTable
CREATE TABLE "games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameType" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ongoing',
    "score" INTEGER NOT NULL DEFAULT 501,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "settings" TEXT NOT NULL,
    "winnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "games_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "finalScore" INTEGER,
    "averageScore" REAL NOT NULL DEFAULT 0,
    "highestScore" INTEGER NOT NULL DEFAULT 0,
    "checkoutPercentage" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "game_players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "throws" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "dartNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "multiplier" INTEGER NOT NULL,
    "targetNumber" INTEGER,
    "isBull" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "throws_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "throws_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerStatistics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "highestCheckout" INTEGER NOT NULL DEFAULT 0,
    "average" REAL NOT NULL DEFAULT 0,
    "checkoutPercentage" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "PlayerStatistics_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlayerGames" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_PlayerGames_A_fkey" FOREIGN KEY ("A") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PlayerGames_B_fkey" FOREIGN KEY ("B") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlayerWonGames" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_PlayerWonGames_A_fkey" FOREIGN KEY ("A") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PlayerWonGames_B_fkey" FOREIGN KEY ("B") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "players_name_key" ON "players"("name");

-- CreateIndex
CREATE INDEX "games_winnerId_idx" ON "games"("winnerId");

-- CreateIndex
CREATE UNIQUE INDEX "game_players_gameId_playerId_key" ON "game_players"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "throws_gameId_idx" ON "throws"("gameId");

-- CreateIndex
CREATE INDEX "throws_playerId_idx" ON "throws"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatistics_playerId_key" ON "PlayerStatistics"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerGames_AB_unique" ON "_PlayerGames"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerGames_B_index" ON "_PlayerGames"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerWonGames_AB_unique" ON "_PlayerWonGames"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerWonGames_B_index" ON "_PlayerWonGames"("B");
