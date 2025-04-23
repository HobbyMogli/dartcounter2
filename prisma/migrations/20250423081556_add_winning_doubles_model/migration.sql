/*
  Warnings:

  - You are about to drop the column `score` on the `games` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "winning_doubles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "winning_doubles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameType" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ongoing',
    "startingScore" INTEGER NOT NULL DEFAULT 501,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "settings" TEXT NOT NULL,
    "winnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "games_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_games" ("createdAt", "endTime", "gameType", "id", "isFinished", "settings", "startTime", "status", "updatedAt", "winnerId") SELECT "createdAt", "endTime", "gameType", "id", "isFinished", "settings", "startTime", "status", "updatedAt", "winnerId" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
CREATE INDEX "games_winnerId_idx" ON "games"("winnerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "winning_doubles_playerId_idx" ON "winning_doubles"("playerId");
