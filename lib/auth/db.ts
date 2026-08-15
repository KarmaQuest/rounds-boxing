import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Base SQLite locale (`.data/rounds.db`) — comptes utilisateurs + favoris.
 * Choisie pour la phase de test : fichier local, transactionnelle, prête
 * pour un déploiement VM. (En serverless il faudra migrer vers une base
 * hébergée — cf. docs/AUDIT.md.)
 */

const DB_FILE = process.env.ROUNDS_DB_FILE ?? join(process.cwd(), ".data", "rounds.db");

function createDb(): Database.Database {
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  const db = new Database(/* turbopackIgnore: true */ DB_FILE);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, slug)
    );
  `);
  return db;
}

// Instance unique (singleton) : better-sqlite3 est synchrone, une seule
// connexion par processus suffit.
const db = createDb();

export interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export function findUserByEmail(email: string): DbUser | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | DbUser
    | undefined;
}

export function findUserById(id: number): DbUser | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
}

export function createUser(email: string, passwordHash: string): DbUser {
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email.toLowerCase(), passwordHash);
  return findUserById(Number(info.lastInsertRowid))!;
}

export function updateUserPassword(id: number, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

/** Slug favoris d'un utilisateur, du plus récent au plus ancien. */
export function listFavoriteSlugs(userId: number): string[] {
  const rows = db
    .prepare("SELECT slug FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{ slug: string }>;
  return rows.map((r) => r.slug);
}

export function isFavorite(userId: number, slug: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND slug = ?").get(userId, slug)
  );
}

export function addFavorite(userId: number, slug: string): void {
  db.prepare("INSERT OR IGNORE INTO favorites (user_id, slug) VALUES (?, ?)").run(userId, slug);
}

export function removeFavorite(userId: number, slug: string): void {
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND slug = ?").run(userId, slug);
}
