-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "throws_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "throws_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_throws" ("createdAt", "dartNumber", "gameId", "id", "isBull", "multiplier", "playerId", "roundNumber", "score", "targetNumber") SELECT "createdAt", "dartNumber", "gameId", "id", "isBull", "multiplier", "playerId", "roundNumber", "score", "targetNumber" FROM "throws";
DROP TABLE "throws";
ALTER TABLE "new_throws" RENAME TO "throws";
CREATE INDEX "throws_gameId_idx" ON "throws"("gameId");
CREATE INDEX "throws_playerId_idx" ON "throws"("playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
