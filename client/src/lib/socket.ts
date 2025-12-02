import { socketEvents, type ChatMessage } from "@shared/schema";

export type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected';

export interface SocketState {
  status: ConnectionStatus;
  partnerId: string | null;
  messages: ChatMessage[];
  isPartnerTyping: boolean;
}

class SocketManager {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): WebSocket {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.socket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        this.emit(type, data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.socket.onclose = () => {
      this.emit('disconnected', {});
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return this.socket;
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(type: string, data: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  joinQueue() {
    this.send(socketEvents.JOIN_QUEUE);
  }

  leaveQueue() {
    this.send(socketEvents.LEAVE_QUEUE);
  }

  sendMessage(content: string) {
    this.send(socketEvents.SEND_MESSAGE, { content });
  }

  sendTyping() {
    this.send(socketEvents.TYPING);
  }

  sendStopTyping() {
    this.send(socketEvents.STOP_TYPING);
  }

  disconnectChat() {
    this.send(socketEvents.DISCONNECT_CHAT);
  }

  sendMedia(url: string, kind: 'image' | 'video', name?: string, size?: number) {
    this.send(socketEvents.SEND_MEDIA, { url, kind, name, size });
  }
}

export const socketManager = new SocketManager();
