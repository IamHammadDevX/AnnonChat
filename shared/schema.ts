import { z } from "zod";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// ============= Database Tables =============

// Banned IPs table
export const bannedIps = sqliteTable("banned_ips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip").notNull().unique(),
  reason: text("reason").notNull(),
  bannedAt: integer("banned_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  bannedBy: text("banned_by").notNull(),
});

// Chat sessions table (for logging completed sessions)
export const chatSessions = sqliteTable("chat_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  user1Ip: text("user1_ip").notNull(),
  user2Ip: text("user2_ip").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  messageCount: integer("message_count").default(0).notNull(),
  isActive: integer("is_active").default(1).notNull(),
});

// Chat messages table (for logging messages)
export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  senderIp: text("sender_ip").notNull(),
  content: text("content").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  flagged: integer("flagged").default(0).notNull(),
  flagReason: text("flag_reason"),
});

// Analytics daily stats table
export const dailyStats = sqliteTable("daily_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  totalMessages: integer("total_messages").default(0).notNull(),
  totalSessions: integer("total_sessions").default(0).notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  peakConcurrentChats: integer("peak_concurrent_chats").default(0).notNull(),
  avgSessionDuration: integer("avg_session_duration").default(0).notNull(),
});

// Hourly stats for peak hours analysis
export const hourlyStats = sqliteTable("hourly_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  hour: integer("hour").notNull(),
  messages: integer("messages").default(0).notNull(),
  sessions: integer("sessions").default(0).notNull(),
});

// Ban appeals table
export const banAppeals = sqliteTable("ban_appeals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip").notNull(),
  email: text("email").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending").notNull(),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  reviewedBy: text("reviewed_by"),
  reviewNotes: text("review_notes"),
});

// Rate limiting tracking table
export const rateLimits = sqliteTable("rate_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip").notNull(),
  actionType: text("action_type").notNull(),
  count: integer("count").default(0).notNull(),
  windowStart: integer("window_start", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============= Relations =============

export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.sessionId],
  }),
}));

// ============= Zod Schemas =============

export const insertBannedIpSchema = createInsertSchema(bannedIps).omit({ id: true, bannedAt: true });
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({ id: true, startedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, sentAt: true });
export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({ id: true });
export const insertHourlyStatsSchema = createInsertSchema(hourlyStats).omit({ id: true });
export const insertBanAppealSchema = createInsertSchema(banAppeals).omit({ id: true, submittedAt: true, reviewedAt: true, reviewedBy: true, reviewNotes: true, status: true });
export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({ id: true, windowStart: true });

// ============= Types =============

export type BannedIpDb = typeof bannedIps.$inferSelect;
export type InsertBannedIpDb = z.infer<typeof insertBannedIpSchema>;

export type ChatSessionDb = typeof chatSessions.$inferSelect;
export type InsertChatSessionDb = z.infer<typeof insertChatSessionSchema>;

export type ChatMessageDb = typeof chatMessages.$inferSelect;
export type InsertChatMessageDb = z.infer<typeof insertChatMessageSchema>;

export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;

export type HourlyStats = typeof hourlyStats.$inferSelect;
export type InsertHourlyStats = z.infer<typeof insertHourlyStatsSchema>;

export type BanAppealDb = typeof banAppeals.$inferSelect;
export type InsertBanAppealDb = z.infer<typeof insertBanAppealSchema>;

export type RateLimitDb = typeof rateLimits.$inferSelect;
export type InsertRateLimitDb = z.infer<typeof insertRateLimitSchema>;

// ============= Runtime Types (In-Memory) =============

// Chat message type for real-time communication
export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
  type: 'user' | 'system';
  mediaUrl?: string;
  mediaKind?: 'image' | 'video';
  fileName?: string;
  fileSize?: number;
}

// Chat session for tracking active chats (in-memory)
export interface ChatSession {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Ip: string;
  user2Ip: string;
  startedAt: number;
  messageCount: number;
  lastActivity: number;
}

// Banned IP record (combined in-memory and DB)
export interface BannedIp {
  id: string;
  ip: string;
  reason: string;
  bannedAt: number;
  bannedBy: string;
}

// Waiting user in queue
export interface WaitingUser {
  id: string;
  socketId: string;
  ip: string;
  joinedAt: number;
}

// Admin stats
export interface AdminStats {
  activeChats: number;
  waitingUsers: number;
  totalBannedIps: number;
  totalMessagesToday: number;
}

// Analytics data for charts
export interface AnalyticsData {
  dailyMessages: { date: string; count: number }[];
  hourlyActivity: { hour: number; count: number }[];
  sessionStats: { avgDuration: number; totalSessions: number };
  weeklyTrend: { date: string; messages: number; sessions: number }[];
}

// Ban appeal (runtime type)
export interface BanAppeal {
  id: number;
  ip: string;
  email: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

// Socket events
export const socketEvents = {
  // Client -> Server
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  SEND_MESSAGE: 'send_message',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  DISCONNECT_CHAT: 'disconnect_chat',
  SEND_MEDIA: 'send_media',
  
  // Server -> Client
  QUEUE_JOINED: 'queue_joined',
  PARTNER_FOUND: 'partner_found',
  MESSAGE_RECEIVED: 'message_received',
  MEDIA_RECEIVED: 'media_received',
  PARTNER_TYPING: 'partner_typing',
  PARTNER_STOPPED_TYPING: 'partner_stopped_typing',
  PARTNER_DISCONNECTED: 'partner_disconnected',
  BANNED: 'banned',
  ERROR: 'error',
  RATE_LIMITED: 'rate_limited',
  MESSAGE_FLAGGED: 'message_flagged',
  
  // Admin events
  ADMIN_STATS: 'admin_stats',
  ADMIN_CHATS: 'admin_chats',
  ADMIN_QUEUE: 'admin_queue',
} as const;

// Validation schemas
export const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const banIpSchema = z.object({
  ip: z.string().min(7).max(45),
  reason: z.string().min(1).max(500),
});

export const banAppealFormSchema = z.object({
  ip: z.string().min(7).max(45),
  email: z.string().email(),
  reason: z.string().min(10).max(1000),
});

export type InsertBannedIp = z.infer<typeof banIpSchema>;
export type BanAppealForm = z.infer<typeof banAppealFormSchema>;
