import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import * as schema from "@shared/schema";
import fs from 'fs';

const SQL = await initSqlJs();
let fileBuffer: Buffer | undefined;
try {
  fileBuffer = await fs.promises.readFile('sqlite.db');
} catch {}
const sqlite = new SQL.Database(fileBuffer ? new Uint8Array(fileBuffer) : undefined);
sqlite.exec(`
CREATE TABLE IF NOT EXISTS banned_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  banned_at INTEGER NOT NULL DEFAULT (unixepoch()),
  banned_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  user1_ip TEXT NOT NULL,
  user2_ip TEXT NOT NULL,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  ended_at INTEGER,
  message_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender_ip TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_at INTEGER NOT NULL DEFAULT (unixepoch()),
  flagged INTEGER NOT NULL DEFAULT 0,
  flag_reason TEXT
);
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  peak_concurrent_chats INTEGER NOT NULL DEFAULT 0,
  avg_session_duration INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS hourly_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ban_appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  reviewed_at INTEGER,
  reviewed_by TEXT,
  review_notes TEXT
);
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL DEFAULT (unixepoch())
);
`);
export const db = drizzle(sqlite, { schema });
process.on('exit', () => {
  const data = sqlite.export();
  fs.writeFileSync('sqlite.db', Buffer.from(data));
});
