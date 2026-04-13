-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CharacterState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userCharacterId" TEXT NOT NULL,
    "affection" INTEGER NOT NULL DEFAULT 0,
    "trust" INTEGER NOT NULL DEFAULT 0,
    "relationshipStage" TEXT NOT NULL DEFAULT 'stranger',
    "currentLocation" TEXT NOT NULL DEFAULT '',
    "flags" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterState_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CharacterState" ("affection", "flags", "id", "relationshipStage", "trust", "updatedAt", "userCharacterId") SELECT "affection", "flags", "id", "relationshipStage", "trust", "updatedAt", "userCharacterId" FROM "CharacterState";
DROP TABLE "CharacterState";
ALTER TABLE "new_CharacterState" RENAME TO "CharacterState";
CREATE UNIQUE INDEX "CharacterState_userCharacterId_key" ON "CharacterState"("userCharacterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
