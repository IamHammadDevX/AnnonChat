import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, sql, lt } from "drizzle-orm";
import {
  bannedIps,
  chatSessions,
  chatMessages,
  dailyStats,
  hourlyStats,
  banAppeals,
  rateLimits,
  type BannedIp,
  type InsertBannedIp,
  type ChatSession,
  type WaitingUser,
  type AdminStats,
  type AnalyticsData,
  type BanAppeal,
  type ChatMessage,
} from "@shared/schema";

export interface IStorage {
  // Banned IPs
  getBannedIps(): Promise<BannedIp[]>;
  getBannedIpByIp(ip: string): Promise<BannedIp | undefined>;
  addBannedIp(ban: InsertBannedIp, bannedBy: string): Promise<BannedIp>;
  removeBannedIp(id: string): Promise<boolean>;
  isIpBanned(ip: string): Promise<boolean>;
  
  // Active chats tracking (in-memory)
  getActiveChats(): Promise<ChatSession[]>;
  addActiveChat(chat: ChatSession): Promise<void>;
  removeActiveChat(id: string): Promise<void>;
  updateChatActivity(id: string): Promise<void>;
  incrementMessageCount(id: string): Promise<void>;
  
  // Waiting queue tracking (in-memory)
  getWaitingUsers(): Promise<WaitingUser[]>;
  addWaitingUser(user: WaitingUser): Promise<void>;
  removeWaitingUser(id: string): Promise<void>;
  getFirstWaitingUser(): Promise<WaitingUser | undefined>;
  
  // Stats
  getStats(): Promise<AdminStats>;
  incrementTodayMessages(): void;
  resetDailyMessages(): void;
  
  // Chat logging (database)
  logChatSession(sessionId: string, user1Ip: string, user2Ip: string): Promise<void>;
  endChatSession(sessionId: string): Promise<void>;
  logMessage(sessionId: string, senderIp: string, content: string, flagged?: boolean, flagReason?: string): Promise<void>;
  
  // Analytics
  getAnalytics(): Promise<AnalyticsData>;
  recordHourlyStats(): Promise<void>;
  
  // Ban appeals
  createBanAppeal(ip: string, email: string, reason: string): Promise<BanAppeal>;
  getBanAppeals(status?: string): Promise<BanAppeal[]>;
  updateBanAppealStatus(id: number, status: 'approved' | 'rejected', reviewedBy: string, notes?: string): Promise<BanAppeal | null>;
  getAppealByIp(ip: string): Promise<BanAppeal | null>;
  
  // Rate limiting
  checkRateLimit(ip: string, actionType: string, limit: number, windowSeconds: number): Promise<boolean>;
  incrementRateLimit(ip: string, actionType: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // In-memory storage for real-time features
  private activeChats: Map<string, ChatSession>;
  private waitingUsers: Map<string, WaitingUser>;
  private todayMessages: number;
  private lastResetDate: string;
  private peakConcurrentChats: number;
  private uniqueIpsToday: Set<string>;

  constructor() {
    this.activeChats = new Map();
    this.waitingUsers = new Map();
    this.todayMessages = 0;
    this.lastResetDate = new Date().toDateString();
    this.peakConcurrentChats = 0;
    this.uniqueIpsToday = new Set();
    
    // Schedule daily stats recording
    this.scheduleDailyStatsRecording();
  }

  private scheduleDailyStatsRecording() {
    // Record hourly stats every hour
    setInterval(() => {
      this.recordHourlyStats().catch(console.error);
    }, 60 * 60 * 1000);
  }

  private checkDailyReset() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      // Save yesterday's stats before resetting
      this.saveDailyStats().catch(console.error);
      this.todayMessages = 0;
      this.peakConcurrentChats = 0;
      this.uniqueIpsToday.clear();
      this.lastResetDate = today;
    }
  }

  private async saveDailyStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    try {
      // Get session stats for yesterday
      const sessions = await db.select().from(chatSessions)
        .where(and(
          gte(chatSessions.startedAt, new Date(yesterday.setHours(0, 0, 0, 0))),
          lt(chatSessions.startedAt, new Date(yesterday.setHours(24, 0, 0, 0)))
        ));
      
      const totalSessions = sessions.length;
      const avgDuration = sessions.length > 0 
        ? sessions.reduce((acc, s) => {
            if (s.endedAt) {
              return acc + (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000;
            }
            return acc;
          }, 0) / sessions.length
        : 0;

      await db.insert(dailyStats).values({
        date: dateStr,
        totalMessages: this.todayMessages,
        totalSessions,
        uniqueUsers: this.uniqueIpsToday.size,
        peakConcurrentChats: this.peakConcurrentChats,
        avgSessionDuration: Math.floor(avgDuration),
      }).onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          totalMessages: this.todayMessages,
          totalSessions,
          uniqueUsers: this.uniqueIpsToday.size,
          peakConcurrentChats: this.peakConcurrentChats,
          avgSessionDuration: Math.floor(avgDuration),
        }
      });
    } catch (error) {
      console.error('Error saving daily stats:', error);
    }
  }

  // ============= Banned IPs (Database) =============

  async getBannedIps(): Promise<BannedIp[]> {
    const bans = await db.select().from(bannedIps).orderBy(desc(bannedIps.bannedAt));
    return bans.map(ban => ({
      id: ban.id.toString(),
      ip: ban.ip,
      reason: ban.reason,
      bannedAt: ban.bannedAt.getTime(),
      bannedBy: ban.bannedBy,
    }));
  }

  async getBannedIpByIp(ip: string): Promise<BannedIp | undefined> {
    const [ban] = await db.select().from(bannedIps).where(eq(bannedIps.ip, ip));
    if (!ban) return undefined;
    return {
      id: ban.id.toString(),
      ip: ban.ip,
      reason: ban.reason,
      bannedAt: ban.bannedAt.getTime(),
      bannedBy: ban.bannedBy,
    };
  }

  async addBannedIp(ban: InsertBannedIp, bannedBy: string): Promise<BannedIp> {
    const [newBan] = await db.insert(bannedIps).values({
      ip: ban.ip,
      reason: ban.reason,
      bannedBy,
    }).returning();
    
    return {
      id: newBan.id.toString(),
      ip: newBan.ip,
      reason: newBan.reason,
      bannedAt: newBan.bannedAt.getTime(),
      bannedBy: newBan.bannedBy,
    };
  }

  async removeBannedIp(id: string): Promise<boolean> {
    const result = await db.delete(bannedIps).where(eq(bannedIps.id, parseInt(id)));
    return (result.rowCount ?? 0) > 0;
  }

  async isIpBanned(ip: string): Promise<boolean> {
    const [ban] = await db.select().from(bannedIps).where(eq(bannedIps.ip, ip)).limit(1);
    return !!ban;
  }

  // ============= Active Chats (In-Memory) =============

  async getActiveChats(): Promise<ChatSession[]> {
    return Array.from(this.activeChats.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  async addActiveChat(chat: ChatSession): Promise<void> {
    this.activeChats.set(chat.id, chat);
    
    // Track peak concurrent chats
    if (this.activeChats.size > this.peakConcurrentChats) {
      this.peakConcurrentChats = this.activeChats.size;
    }
    
    // Track unique users
    this.uniqueIpsToday.add(chat.user1Ip);
    this.uniqueIpsToday.add(chat.user2Ip);
    
    // Log to database
    await this.logChatSession(chat.id, chat.user1Ip, chat.user2Ip);
  }

  async removeActiveChat(id: string): Promise<void> {
    this.activeChats.delete(id);
    
    // End session in database
    await this.endChatSession(id);
  }

  async updateChatActivity(id: string): Promise<void> {
    const chat = this.activeChats.get(id);
    if (chat) {
      chat.lastActivity = Date.now();
    }
  }

  async incrementMessageCount(id: string): Promise<void> {
    const chat = this.activeChats.get(id);
    if (chat) {
      chat.messageCount++;
      chat.lastActivity = Date.now();
    }
  }

  // ============= Waiting Users (In-Memory) =============

  async getWaitingUsers(): Promise<WaitingUser[]> {
    return Array.from(this.waitingUsers.values()).sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async addWaitingUser(user: WaitingUser): Promise<void> {
    this.waitingUsers.set(user.id, user);
    this.uniqueIpsToday.add(user.ip);
  }

  async removeWaitingUser(id: string): Promise<void> {
    this.waitingUsers.delete(id);
  }

  async getFirstWaitingUser(): Promise<WaitingUser | undefined> {
    const users = await this.getWaitingUsers();
    return users[0];
  }

  // ============= Stats =============

  async getStats(): Promise<AdminStats> {
    this.checkDailyReset();
    const bansCount = await db.select({ count: sql<number>`count(*)` }).from(bannedIps);
    
    return {
      activeChats: this.activeChats.size,
      waitingUsers: this.waitingUsers.size,
      totalBannedIps: Number(bansCount[0]?.count ?? 0),
      totalMessagesToday: this.todayMessages,
    };
  }

  incrementTodayMessages(): void {
    this.checkDailyReset();
    this.todayMessages++;
  }

  resetDailyMessages(): void {
    this.todayMessages = 0;
    this.lastResetDate = new Date().toDateString();
  }

  // ============= Chat Logging (Database) =============

  async logChatSession(sessionId: string, user1Ip: string, user2Ip: string): Promise<void> {
    try {
      await db.insert(chatSessions).values({
        sessionId,
        user1Ip,
        user2Ip,
        messageCount: 0,
        isActive: 1,
      });
    } catch (error) {
      console.error('Error logging chat session:', error);
    }
  }

  async endChatSession(sessionId: string): Promise<void> {
    try {
      const chat = this.activeChats.get(sessionId);
      await db.update(chatSessions)
        .set({ 
          endedAt: new Date(),
          isActive: 0,
          messageCount: chat?.messageCount ?? 0
        })
        .where(eq(chatSessions.sessionId, sessionId));
    } catch (error) {
      console.error('Error ending chat session:', error);
    }
  }

  async logMessage(sessionId: string, senderIp: string, content: string, flagged = false, flagReason?: string): Promise<void> {
    try {
      await db.insert(chatMessages).values({
        sessionId,
        senderIp,
        content,
        flagged: flagged ? 1 : 0,
        flagReason,
      });
      
      // Increment message count in session
      await db.update(chatSessions)
        .set({ messageCount: sql`${chatSessions.messageCount} + 1` })
        .where(eq(chatSessions.sessionId, sessionId));
    } catch (error) {
      console.error('Error logging message:', error);
    }
  }

  // ============= Analytics =============

  async getAnalytics(): Promise<AnalyticsData> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get daily message counts for the past 7 days
    const dailyData = await db.select().from(dailyStats)
      .where(gte(dailyStats.date, sevenDaysAgo.toISOString().split('T')[0]))
      .orderBy(dailyStats.date);

    // Get hourly activity for today
    const todayStr = now.toISOString().split('T')[0];
    const hourlyData = await db.select().from(hourlyStats)
      .where(eq(hourlyStats.date, todayStr))
      .orderBy(hourlyStats.hour);

    // Get session statistics
    const recentSessions = await db.select().from(chatSessions)
      .where(gte(chatSessions.startedAt, sevenDaysAgo))
      .limit(1000);

    let totalDuration = 0;
    let completedSessions = 0;
    for (const session of recentSessions) {
      if (session.endedAt) {
        totalDuration += (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000;
        completedSessions++;
      }
    }

    return {
      dailyMessages: dailyData.map(d => ({ date: d.date, count: d.totalMessages })),
      hourlyActivity: hourlyData.map(h => ({ hour: h.hour, count: h.messages })),
      sessionStats: {
        avgDuration: completedSessions > 0 ? Math.floor(totalDuration / completedSessions) : 0,
        totalSessions: recentSessions.length,
      },
      weeklyTrend: dailyData.map(d => ({ 
        date: d.date, 
        messages: d.totalMessages, 
        sessions: d.totalSessions 
      })),
    };
  }

  async recordHourlyStats(): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hour = now.getHours();

    try {
      await db.insert(hourlyStats).values({
        date: dateStr,
        hour,
        messages: this.todayMessages,
        sessions: this.activeChats.size,
      }).onConflictDoNothing();
    } catch (error) {
      console.error('Error recording hourly stats:', error);
    }
  }

  // ============= Ban Appeals =============

  async createBanAppeal(ip: string, email: string, reason: string): Promise<BanAppeal> {
    const [appeal] = await db.insert(banAppeals).values({
      ip,
      email,
      reason,
    }).returning();

    return {
      id: appeal.id,
      ip: appeal.ip,
      email: appeal.email,
      reason: appeal.reason,
      status: appeal.status as 'pending' | 'approved' | 'rejected',
      submittedAt: appeal.submittedAt,
      reviewedAt: appeal.reviewedAt ?? undefined,
      reviewedBy: appeal.reviewedBy ?? undefined,
      reviewNotes: appeal.reviewNotes ?? undefined,
    };
  }

  async getBanAppeals(status?: string): Promise<BanAppeal[]> {
    let query = db.select().from(banAppeals).orderBy(desc(banAppeals.submittedAt));
    
    const appeals = status 
      ? await db.select().from(banAppeals).where(eq(banAppeals.status, status)).orderBy(desc(banAppeals.submittedAt))
      : await db.select().from(banAppeals).orderBy(desc(banAppeals.submittedAt));

    return appeals.map(a => ({
      id: a.id,
      ip: a.ip,
      email: a.email,
      reason: a.reason,
      status: a.status as 'pending' | 'approved' | 'rejected',
      submittedAt: a.submittedAt,
      reviewedAt: a.reviewedAt ?? undefined,
      reviewedBy: a.reviewedBy ?? undefined,
      reviewNotes: a.reviewNotes ?? undefined,
    }));
  }

  async updateBanAppealStatus(id: number, status: 'approved' | 'rejected', reviewedBy: string, notes?: string): Promise<BanAppeal | null> {
    const [updated] = await db.update(banAppeals)
      .set({
        status,
        reviewedAt: new Date(),
        reviewedBy,
        reviewNotes: notes,
      })
      .where(eq(banAppeals.id, id))
      .returning();

    if (!updated) return null;

    // If approved, remove the IP ban
    if (status === 'approved') {
      await db.delete(bannedIps).where(eq(bannedIps.ip, updated.ip));
    }

    return {
      id: updated.id,
      ip: updated.ip,
      email: updated.email,
      reason: updated.reason,
      status: updated.status as 'pending' | 'approved' | 'rejected',
      submittedAt: updated.submittedAt,
      reviewedAt: updated.reviewedAt ?? undefined,
      reviewedBy: updated.reviewedBy ?? undefined,
      reviewNotes: updated.reviewNotes ?? undefined,
    };
  }

  async getAppealByIp(ip: string): Promise<BanAppeal | null> {
    const [appeal] = await db.select().from(banAppeals)
      .where(and(eq(banAppeals.ip, ip), eq(banAppeals.status, 'pending')))
      .limit(1);
    
    if (!appeal) return null;

    return {
      id: appeal.id,
      ip: appeal.ip,
      email: appeal.email,
      reason: appeal.reason,
      status: appeal.status as 'pending' | 'approved' | 'rejected',
      submittedAt: appeal.submittedAt,
      reviewedAt: appeal.reviewedAt ?? undefined,
      reviewedBy: appeal.reviewedBy ?? undefined,
      reviewNotes: appeal.reviewNotes ?? undefined,
    };
  }

  // ============= Rate Limiting =============

  async checkRateLimit(ip: string, actionType: string, limit: number, windowSeconds: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    
    const [record] = await db.select().from(rateLimits)
      .where(and(
        eq(rateLimits.ip, ip),
        eq(rateLimits.actionType, actionType),
        gte(rateLimits.windowStart, windowStart)
      ))
      .limit(1);

    if (!record) return true; // No record means not rate limited
    return record.count < limit;
  }

  async incrementRateLimit(ip: string, actionType: string): Promise<void> {
    const windowStart = new Date(Date.now() - 60 * 1000); // 1 minute window
    
    // Try to update existing record
    const result = await db.update(rateLimits)
      .set({ count: sql`${rateLimits.count} + 1` })
      .where(and(
        eq(rateLimits.ip, ip),
        eq(rateLimits.actionType, actionType),
        gte(rateLimits.windowStart, windowStart)
      ));

    // If no record updated, create new one
    if ((result.rowCount ?? 0) === 0) {
      await db.insert(rateLimits).values({
        ip,
        actionType,
        count: 1,
      }).onConflictDoNothing();
    }
  }
}

export const storage = new DatabaseStorage();
