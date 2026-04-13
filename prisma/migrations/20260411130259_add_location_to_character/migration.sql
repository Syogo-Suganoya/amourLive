-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "speechStyle" TEXT NOT NULL,
    "coreRules" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Character" ("coreRules", "id", "name", "personality", "speechStyle") SELECT "coreRules", "id", "name", "personality", "speechStyle" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
