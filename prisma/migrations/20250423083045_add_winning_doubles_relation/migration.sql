-- AlterTable
ALTER TABLE "games" ADD COLUMN "winnerName" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_winning_doubles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "winning_doubles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "winning_doubles_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_winning_doubles" ("createdAt", "gameId", "id", "playerId", "value") SELECT "createdAt", "gameId", "id", "playerId", "value" FROM "winning_doubles";
DROP TABLE "winning_doubles";
ALTER TABLE "new_winning_doubles" RENAME TO "winning_doubles";
CREATE INDEX "winning_doubles_playerId_idx" ON "winning_doubles"("playerId");
CREATE INDEX "winning_doubles_gameId_idx" ON "winning_doubles"("gameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
