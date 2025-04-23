/*
  Warnings:

  - You are about to drop the column `winnerName` on the `games` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameType" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "startingScore" INTEGER NOT NULL DEFAULT 501,
    "status" TEXT NOT NULL DEFAULT 'ongoing',
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" INTEGER,
    "winnerPlayerName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    CONSTRAINT "games_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_games" ("createdAt", "endTime", "gameType", "id", "isFinished", "settings", "startTime", "startingScore", "status", "updatedAt", "winnerId") SELECT "createdAt", "endTime", "gameType", "id", "isFinished", "settings", "startTime", "startingScore", "status", "updatedAt", "winnerId" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
CREATE INDEX "games_winnerId_idx" ON "games"("winnerId");
CREATE TABLE "new_throws" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "dartNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "multiplier" INTEGER NOT NULL,
    "targetNumber" INTEGER,
    "isBull" BOOLEAN NOT NULL,
    "busted" BOOLEAN NOT NULL DEFAULT false,
    "isWinningThrow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "throws_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "throws_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_throws" ("busted", "createdAt", "dartNumber", "gameId", "id", "isBull", "multiplier", "playerId", "roundNumber", "score", "targetNumber") SELECT "busted", "createdAt", "dartNumber", "gameId", "id", "isBull", "multiplier", "playerId", "roundNumber", "score", "targetNumber" FROM "throws";
DROP TABLE "throws";
ALTER TABLE "new_throws" RENAME TO "throws";
CREATE INDEX "throws_gameId_idx" ON "throws"("gameId");
CREATE INDEX "throws_playerId_idx" ON "throws"("playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
