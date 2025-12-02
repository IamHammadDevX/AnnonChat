import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { socketEvents, messageSchema, banIpSchema, banAppealFormSchema, type ChatMessage, type ChatSession, type WaitingUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { z } from "zod";
import { checkProfanity, filterContent, isSpam, getSpamScore } from "./profanityFilter";

interface ConnectedUser {
  id: string;
  socket: WebSocket;
  ip: string;
  partnerId: string | null;
  roomId: string | null;
}

// Rate limit configuration
const RATE_LIMITS = {
  message: { limit: 20, windowSeconds: 60 }, // 20 messages per minute
  connection: { limit: 5, windowSeconds: 60 }, // 5 connections per minute
};

const connectedUsers = new Map<string, ConnectedUser>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '0.0.0.0';
}

function sanitizeMessage(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 2000);
}

function sendToUser(userId: string, type: string, data: any = {}) {
  const user = connectedUsers.get(userId);
  if (user && user.socket.readyState === WebSocket.OPEN) {
    user.socket.send(JSON.stringify({ type, data }));
  }
}

async function matchUsers() {
  const waitingUsers = await storage.getWaitingUsers();
  
  while (waitingUsers.length >= 2) {
    const user1Data = waitingUsers.shift()!;
    const user2Data = waitingUsers.shift()!;
    
    const user1 = connectedUsers.get(user1Data.id);
    const user2 = connectedUsers.get(user2Data.id);
    
    if (!user1 || !user2) {
      if (user1) await storage.addWaitingUser(user1Data);
      if (user2) await storage.addWaitingUser(user2Data);
      continue;
    }
    
    await storage.removeWaitingUser(user1Data.id);
    await storage.removeWaitingUser(user2Data.id);
    
    const roomId = randomUUID();
    
    user1.partnerId = user2.id;
    user1.roomId = roomId;
    user2.partnerId = user1.id;
    user2.roomId = roomId;
    
    const chatSession: ChatSession = {
      id: roomId,
      user1Id: user1.id,
      user2Id: user2.id,
      user1Ip: user1.ip,
      user2Ip: user2.ip,
      startedAt: Date.now(),
      messageCount: 0,
      lastActivity: Date.now(),
    };
    
    await storage.addActiveChat(chatSession);
    
    sendToUser(user1.id, socketEvents.PARTNER_FOUND, { roomId });
    sendToUser(user2.id, socketEvents.PARTNER_FOUND, { roomId });
  }
}

async function handleDisconnect(userId: string) {
  const user = connectedUsers.get(userId);
  if (!user) return;
  
  if (user.partnerId) {
    sendToUser(user.partnerId, socketEvents.PARTNER_DISCONNECTED, {});
    const partner = connectedUsers.get(user.partnerId);
    if (partner) {
      partner.partnerId = null;
      partner.roomId = null;
    }
  }
  
  if (user.roomId) {
    await storage.removeActiveChat(user.roomId);
  }
  
  await storage.removeWaitingUser(userId);
  connectedUsers.delete(userId);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============= Admin API Routes =============
  
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/chats', async (req, res) => {
    try {
      const chats = await storage.getActiveChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

  app.get('/api/admin/queue', async (req, res) => {
    try {
      const queue = await storage.getWaitingUsers();
      res.json(queue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch queue' });
    }
  });

  app.get('/api/admin/bans', async (req, res) => {
    try {
      const bans = await storage.getBannedIps();
      res.json(bans);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bans' });
    }
  });

  app.post('/api/admin/bans', async (req, res) => {
    try {
      const data = banIpSchema.parse(req.body);
      const existingBan = await storage.getBannedIpByIp(data.ip);
      if (existingBan) {
        return res.status(400).json({ error: 'IP is already banned' });
      }
      const ban = await storage.addBannedIp(data, 'Admin');
      res.status(201).json(ban);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to add ban' });
    }
  });

  app.delete('/api/admin/bans/:id', async (req, res) => {
    try {
      const success = await storage.removeBannedIp(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Ban not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove ban' });
    }
  });

  // ============= Analytics API Routes =============
  
  app.get('/api/admin/analytics', async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // ============= Ban Appeals API Routes =============
  
  app.get('/api/admin/appeals', async (req, res) => {
    try {
      const { status } = req.query;
      const appeals = await storage.getBanAppeals(status as string | undefined);
      res.json(appeals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch appeals' });
    }
  });

  app.post('/api/appeals', async (req, res) => {
    try {
      const data = banAppealFormSchema.parse(req.body);
      
      // Check if IP is actually banned
      const isBanned = await storage.isIpBanned(data.ip);
      if (!isBanned) {
        return res.status(400).json({ error: 'This IP is not currently banned' });
      }
      
      // Check if there's already a pending appeal
      const existingAppeal = await storage.getAppealByIp(data.ip);
      if (existingAppeal) {
        return res.status(400).json({ error: 'An appeal for this IP is already pending' });
      }
      
      const appeal = await storage.createBanAppeal(data.ip, data.email, data.reason);
      res.status(201).json(appeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to submit appeal' });
    }
  });

  app.patch('/api/admin/appeals/:id', async (req, res) => {
    try {
      const { status, notes } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const appeal = await storage.updateBanAppealStatus(
        parseInt(req.params.id),
        status,
        'Admin',
        notes
      );
      
      if (!appeal) {
        return res.status(404).json({ error: 'Appeal not found' });
      }
      
      res.json(appeal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update appeal' });
    }
  });

  // Check if IP is banned (for ban appeal page)
  app.get('/api/check-ban', async (req, res) => {
    try {
      const ip = getClientIp(req as Request);
      const isBanned = await storage.isIpBanned(ip);
      res.json({ banned: isBanned, ip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check ban status' });
    }
  });

  // ============= WebSocket Server =============
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const userId = randomUUID();
    const ip = getClientIp(req as unknown as Request);
    
    // Check if IP is banned
    const isBanned = await storage.isIpBanned(ip);
    if (isBanned) {
      ws.send(JSON.stringify({ type: socketEvents.BANNED, data: {} }));
      ws.close();
      return;
    }
    
    // Check connection rate limit
    const canConnect = await storage.checkRateLimit(ip, 'connection', RATE_LIMITS.connection.limit, RATE_LIMITS.connection.windowSeconds);
    if (!canConnect) {
      ws.send(JSON.stringify({ type: socketEvents.RATE_LIMITED, data: { message: 'Too many connection attempts. Please wait and try again.' } }));
      ws.close();
      return;
    }
    await storage.incrementRateLimit(ip, 'connection');
    
    const user: ConnectedUser = {
      id: userId,
      socket: ws,
      ip,
      partnerId: null,
      roomId: null,
    };
    
    connectedUsers.set(userId, user);
    
    ws.on('message', async (rawMessage) => {
      try {
        const { type, data } = JSON.parse(rawMessage.toString());
        
        switch (type) {
          case socketEvents.JOIN_QUEUE: {
            // Check if already waiting or connected
            if (user.partnerId) {
              sendToUser(userId, socketEvents.ERROR, { message: 'Already in a chat' });
              return;
            }
            
            const waitingUser: WaitingUser = {
              id: userId,
              socketId: ws.toString(),
              ip: user.ip,
              joinedAt: Date.now(),
            };
            
            await storage.addWaitingUser(waitingUser);
            sendToUser(userId, socketEvents.QUEUE_JOINED, {});
            
            // Try to match users
            await matchUsers();
            break;
          }
          
          case socketEvents.LEAVE_QUEUE: {
            await storage.removeWaitingUser(userId);
            break;
          }
          
          case socketEvents.SEND_MESSAGE: {
            if (!user.partnerId) {
              sendToUser(userId, socketEvents.ERROR, { message: 'Not connected to a partner' });
              return;
            }
            
            // Check message rate limit
            const canSend = await storage.checkRateLimit(user.ip, 'message', RATE_LIMITS.message.limit, RATE_LIMITS.message.windowSeconds);
            if (!canSend) {
              sendToUser(userId, socketEvents.RATE_LIMITED, { message: 'Slow down! You are sending messages too fast.' });
              return;
            }
            await storage.incrementRateLimit(user.ip, 'message');
            
            try {
              const parsed = messageSchema.parse(data);
              let sanitizedContent = sanitizeMessage(parsed.content);
              
              // Check for spam
              if (isSpam(sanitizedContent)) {
                sendToUser(userId, socketEvents.MESSAGE_FLAGGED, { 
                  message: 'Your message appears to be spam and was not sent.' 
                });
                
                // Log flagged message
                if (user.roomId) {
                  await storage.logMessage(user.roomId, user.ip, sanitizedContent, true, 'spam');
                }
                return;
              }
              
              // Check for profanity
              const profanityResult = checkProfanity(sanitizedContent);
              
              if (profanityResult.severity === 'blocked') {
                sendToUser(userId, socketEvents.MESSAGE_FLAGGED, { 
                  message: 'Your message contains prohibited content and was not sent.' 
                });
                
                // Log flagged message
                if (user.roomId) {
                  await storage.logMessage(user.roomId, user.ip, sanitizedContent, true, 'profanity');
                }
                return;
              }
              
              // Apply content filter for warning-level content (let it through but filtered)
              if (profanityResult.severity === 'warning') {
                sanitizedContent = filterContent(sanitizedContent);
              }
              
              const message: ChatMessage = {
                id: randomUUID(),
                content: sanitizedContent,
                senderId: userId,
                timestamp: Date.now(),
                type: 'user',
              };
              
              sendToUser(user.partnerId, socketEvents.MESSAGE_RECEIVED, { message });
              
              if (user.roomId) {
                await storage.incrementMessageCount(user.roomId);
                storage.incrementTodayMessages();
                
                // Log message to database
                await storage.logMessage(
                  user.roomId, 
                  user.ip, 
                  sanitizedContent, 
                  profanityResult.flagged,
                  profanityResult.reason
                );
              }
            } catch (error) {
              sendToUser(userId, socketEvents.ERROR, { message: 'Invalid message' });
            }
            break;
          }
          
          case socketEvents.TYPING: {
            if (user.partnerId) {
              sendToUser(user.partnerId, socketEvents.PARTNER_TYPING, {});
            }
            break;
          }
          
          case socketEvents.STOP_TYPING: {
            if (user.partnerId) {
              sendToUser(user.partnerId, socketEvents.PARTNER_STOPPED_TYPING, {});
            }
            break;
          }
          
          case socketEvents.DISCONNECT_CHAT: {
            if (user.partnerId) {
              sendToUser(user.partnerId, socketEvents.PARTNER_DISCONNECTED, {});
              const partner = connectedUsers.get(user.partnerId);
              if (partner) {
                partner.partnerId = null;
                partner.roomId = null;
              }
            }
            
            if (user.roomId) {
              await storage.removeActiveChat(user.roomId);
            }
            
            user.partnerId = null;
            user.roomId = null;
            break;
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    ws.on('close', () => {
      handleDisconnect(userId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleDisconnect(userId);
    });
  });

  return httpServer;
}
