import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { socketManager, type ConnectionStatus } from "@/lib/socket";
import { socketEvents, type ChatMessage } from "@shared/schema";
import { 
  MessageCircle, 
  Send, 
  X, 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  Loader2,
  UserCircle2,
  RefreshCw
} from "lucide-react";

export default function Chat() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    socketManager.connect();

    const unsubConnected = socketManager.on('connected', () => {
      setStatus('disconnected');
    });

    const unsubDisconnected = socketManager.on('disconnected', () => {
      setStatus('disconnected');
    });

    const unsubQueueJoined = socketManager.on(socketEvents.QUEUE_JOINED, () => {
      setStatus('waiting');
      addSystemMessage('Looking for someone to chat with...');
    });

    const unsubPartnerFound = socketManager.on(socketEvents.PARTNER_FOUND, () => {
      setStatus('connected');
      addSystemMessage('You are now connected with a stranger. Say hi!');
      inputRef.current?.focus();
    });

    const unsubMessageReceived = socketManager.on(socketEvents.MESSAGE_RECEIVED, (data: { message: ChatMessage }) => {
      setMessages(prev => [...prev, data.message]);
      setIsPartnerTyping(false);
    });

    const unsubPartnerTyping = socketManager.on(socketEvents.PARTNER_TYPING, () => {
      setIsPartnerTyping(true);
    });

    const unsubPartnerStoppedTyping = socketManager.on(socketEvents.PARTNER_STOPPED_TYPING, () => {
      setIsPartnerTyping(false);
    });

    const unsubPartnerDisconnected = socketManager.on(socketEvents.PARTNER_DISCONNECTED, () => {
      setStatus('disconnected');
      addSystemMessage('Stranger has disconnected.');
      setIsPartnerTyping(false);
    });

    const unsubBanned = socketManager.on(socketEvents.BANNED, () => {
      setIsBanned(true);
      setStatus('disconnected');
      addSystemMessage('You have been banned from this service.');
    });

    const unsubError = socketManager.on(socketEvents.ERROR, (data: { message: string }) => {
      addSystemMessage(`Error: ${data.message}`);
    });

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubQueueJoined();
      unsubPartnerFound();
      unsubMessageReceived();
      unsubPartnerTyping();
      unsubPartnerStoppedTyping();
      unsubPartnerDisconnected();
      unsubBanned();
      unsubError();
    };
  }, []);

  const addSystemMessage = (content: string) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      content,
      senderId: 'system',
      timestamp: Date.now(),
      type: 'system'
    };
    setMessages(prev => [...prev, message]);
  };

  const handleStartChat = () => {
    if (isBanned) return;
    setMessages([]);
    setStatus('connecting');
    
    const socket = socketManager.connect();
    
    // Wait for socket to open before joining queue
    if (socket.readyState === WebSocket.OPEN) {
      socketManager.joinQueue();
    } else {
      const handleOpen = () => {
        socketManager.joinQueue();
        socket.removeEventListener('open', handleOpen);
      };
      socket.addEventListener('open', handleOpen);
    }
  };

  const handleDisconnect = () => {
    socketManager.disconnectChat();
    setStatus('disconnected');
    addSystemMessage('You have disconnected.');
    setIsPartnerTyping(false);
  };

  const handleNewChat = () => {
    socketManager.disconnectChat();
    setMessages([]);
    setIsPartnerTyping(false);
    setStatus('waiting');
    socketManager.joinQueue();
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || status !== 'connected') return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      content: inputValue.trim(),
      senderId: 'self',
      timestamp: Date.now(),
      type: 'user'
    };

    setMessages(prev => [...prev, message]);
    socketManager.sendMessage(inputValue.trim());
    setInputValue('');
    
    if (isTypingRef.current) {
      socketManager.sendStopTyping();
      isTypingRef.current = false;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || status !== 'connected') return;
    setUploadError(null);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setUploadError('Only images and videos are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large (max 5MB)');
      return;
    }

    const form = new FormData();
    form.append('file', file);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            const message: ChatMessage = {
              id: crypto.randomUUID(),
              content: resp.url,
              senderId: 'self',
              timestamp: Date.now(),
              type: 'user',
              mediaUrl: resp.url,
              mediaKind: resp.kind,
              fileName: resp.name,
              fileSize: resp.size,
            };
            setMessages(prev => [...prev, message]);
            socketManager.sendMedia(resp.url, resp.kind, resp.name, resp.size);
            resolve();
          } catch (err) {
            setUploadError('Failed to parse upload response');
            reject(err);
          }
        } else {
          setUploadError('Upload failed');
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => {
        setUploadProgress(null);
        setUploadError('Upload error');
        reject(new Error('Upload error'));
      };
      xhr.send(form);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (status !== 'connected') return;

    if (!isTypingRef.current && e.target.value.length > 0) {
      isTypingRef.current = true;
      socketManager.sendTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socketManager.sendStopTyping();
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'disconnected':
        return (
          <Badge variant="secondary" className="gap-1.5">
            <WifiOff className="w-3 h-3" />
            Disconnected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'waiting':
        return (
          <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Finding partner...
          </Badge>
        );
      case 'connected':
        return (
          <Badge variant="secondary" className="gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            <Wifi className="w-3 h-3" />
            Connected
          </Badge>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 h-16 px-4 flex items-center justify-between gap-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-semibold hidden sm:inline">AnonChat</span>
          </div>
        </div>

        <div className="flex items-center gap-2" data-testid="status-badge">
          {getStatusBadge()}
        </div>

        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNewChat}
              className="gap-1.5"
              data-testid="button-new-chat"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          )}
          {(status === 'connected' || status === 'waiting') && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDisconnect}
              className="gap-1.5"
              data-testid="button-disconnect"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Disconnect</span>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {status === 'disconnected' && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center">
              {isBanned ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                    <X className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
                  <p className="text-muted-foreground mb-6">
                    You have been banned from using this service. 
                    This may be due to a violation of our community guidelines.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <UserCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Ready to Chat?</h2>
                  <p className="text-muted-foreground mb-6">
                    Click the button below to connect with a random stranger. 
                    Your conversation is completely anonymous.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={handleStartChat}
                    className="w-full gap-2"
                    data-testid="button-start-chatting"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start Chatting
                  </Button>
                </>
              )}
            </Card>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                
                {isPartnerTyping && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Stranger is typing...</span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="shrink-0 p-4 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={handleFileSelect}
                  disabled={status !== 'connected'}
                  className="hidden" 
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button variant="outline" size="icon" disabled={status !== 'connected'}>
                    📎
                  </Button>
                </label>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={status === 'connected' ? "Type a message..." : "Waiting for connection..."}
                  disabled={status !== 'connected'}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button 
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={status !== 'connected' || !inputValue.trim()}
                  data-testid="button-send-message"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {uploadProgress !== null && (
                <div className="max-w-3xl mx-auto mt-2">
                  <div className="w-full h-2 bg-muted rounded">
                    <div className="h-2 bg-primary rounded" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</p>
                </div>
              )}
              {uploadError && (
                <div className="max-w-3xl mx-auto mt-2 text-destructive text-sm">{uploadError}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const isSelf = message.senderId === 'self';
  const time = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] sm:max-w-[70%]`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isSelf
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card border border-card-border rounded-bl-sm'
          }`}
          data-testid={`message-${message.id}`}
        >
          {message.mediaUrl ? (
            message.mediaKind === 'image' ? (
              <img src={message.mediaUrl} alt={message.fileName || 'image'} className="max-w-full rounded-md" />
            ) : (
              <video src={message.mediaUrl} controls className="max-w-full rounded-md" />
            )
          ) : (
            <p className="break-words whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <p className={`text-xs text-muted-foreground mt-1 ${isSelf ? 'text-right' : 'text-left'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
