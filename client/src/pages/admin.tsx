import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AdminStats, ChatSession, WaitingUser, BannedIp } from "@shared/schema";
import { 
  MessageCircle, 
  Users, 
  Clock, 
  Shield, 
  Ban, 
  Trash2, 
  RefreshCw,
  Activity,
  ArrowLeft,
  LayoutDashboard,
  UserX
} from "lucide-react";

type AdminView = 'dashboard' | 'chats' | 'queue' | 'bans';

export default function Admin() {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banIp, setBanIp] = useState('');
  const [banReason, setBanReason] = useState('');
  const { toast } = useToast();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const { data: stats, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 5000,
  });

  const { data: chats = [], refetch: refetchChats } = useQuery<ChatSession[]>({
    queryKey: ['/api/admin/chats'],
    refetchInterval: 5000,
  });

  const { data: queue = [], refetch: refetchQueue } = useQuery<WaitingUser[]>({
    queryKey: ['/api/admin/queue'],
    refetchInterval: 5000,
  });

  const { data: bans = [], refetch: refetchBans } = useQuery<BannedIp[]>({
    queryKey: ['/api/admin/bans'],
  });

  const banMutation = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      return await apiRequest('POST', '/api/admin/bans', { ip, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "IP Banned", description: "The IP has been successfully banned." });
      setBanDialogOpen(false);
      setBanIp('');
      setBanReason('');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/bans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "IP Unbanned", description: "The IP has been successfully unbanned." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleBanSubmit = () => {
    if (!banIp.trim() || !banReason.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    banMutation.mutate({ ip: banIp.trim(), reason: banReason.trim() });
  };

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchChats();
    refetchQueue();
    refetchBans();
    toast({ title: "Refreshed", description: "Data has been refreshed." });
  }, [refetchStats, refetchChats, refetchQueue, refetchBans, toast]);

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chats' as const, label: 'Active Chats', icon: MessageCircle },
    { id: 'queue' as const, label: 'Waiting Queue', icon: Clock },
    { id: 'bans' as const, label: 'Banned IPs', icon: Ban },
  ];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (startTime: number) => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Admin Panel</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveView(item.id)}
                        isActive={activeView === item.id}
                        data-testid={`nav-${item.id}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="shrink-0 h-16 px-4 flex items-center justify-between gap-4 border-b border-border bg-card/50">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Separator orientation="vertical" className="h-6" />
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Site
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="gap-2"
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <ThemeToggle />
            </div>
          </header>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {activeView === 'dashboard' && (
                <DashboardView stats={stats} />
              )}
              {activeView === 'chats' && (
                <ChatsView chats={chats} formatTime={formatTime} formatDuration={formatDuration} />
              )}
              {activeView === 'queue' && (
                <QueueView queue={queue} formatTime={formatTime} />
              )}
              {activeView === 'bans' && (
                <BansView 
                  bans={bans} 
                  formatTime={formatTime}
                  onUnban={(id) => unbanMutation.mutate(id)}
                  banDialogOpen={banDialogOpen}
                  setBanDialogOpen={setBanDialogOpen}
                  banIp={banIp}
                  setBanIp={setBanIp}
                  banReason={banReason}
                  setBanReason={setBanReason}
                  onBanSubmit={handleBanSubmit}
                  isPending={banMutation.isPending}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </SidebarProvider>
  );
}

function DashboardView({ stats }: { stats?: AdminStats }) {
  const statCards = [
    { 
      label: 'Active Chats', 
      value: stats?.activeChats ?? 0, 
      icon: MessageCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Users Waiting', 
      value: stats?.waitingUsers ?? 0, 
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    { 
      label: 'Banned IPs', 
      value: stats?.totalBannedIps ?? 0, 
      icon: Ban,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10'
    },
    { 
      label: 'Messages Today', 
      value: stats?.totalMessagesToday ?? 0, 
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your anonymous chat platform in real-time.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current platform health and activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              System Online
            </Badge>
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatsView({ 
  chats, 
  formatTime, 
  formatDuration 
}: { 
  chats: ChatSession[]; 
  formatTime: (t: number) => string;
  formatDuration: (t: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Active Chats</h1>
        <p className="text-muted-foreground">Monitor ongoing conversations between users.</p>
      </div>

      {chats.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Chats</h3>
            <p className="text-muted-foreground">There are currently no active chat sessions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chats.map((chat) => (
            <Card key={chat.id} data-testid={`chat-card-${chat.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(chat.startedAt)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">User 1:</span>
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">{chat.user1Ip}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">User 2:</span>
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">{chat.user2Ip}</code>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Messages: {chat.messageCount}</span>
                    <span>Started: {formatTime(chat.startedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function QueueView({ 
  queue, 
  formatTime 
}: { 
  queue: WaitingUser[]; 
  formatTime: (t: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waiting Queue</h1>
        <p className="text-muted-foreground">Users currently waiting to be matched with a partner.</p>
      </div>

      {queue.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Queue Empty</h3>
            <p className="text-muted-foreground">No users are currently waiting for a match.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead>Wait Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((user, index) => {
                const waitTime = Math.floor((Date.now() - user.joinedAt) / 1000);
                return (
                  <TableRow key={user.id} data-testid={`queue-row-${user.id}`}>
                    <TableCell>
                      <Badge variant="outline">{index + 1}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-0.5 bg-muted rounded text-xs">{user.ip}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(user.joinedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {waitTime}s
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function BansView({
  bans,
  formatTime,
  onUnban,
  banDialogOpen,
  setBanDialogOpen,
  banIp,
  setBanIp,
  banReason,
  setBanReason,
  onBanSubmit,
  isPending,
}: {
  bans: BannedIp[];
  formatTime: (t: number) => string;
  onUnban: (id: string) => void;
  banDialogOpen: boolean;
  setBanDialogOpen: (open: boolean) => void;
  banIp: string;
  setBanIp: (ip: string) => void;
  banReason: string;
  setBanReason: (reason: string) => void;
  onBanSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Banned IPs</h1>
          <p className="text-muted-foreground">Manage IP addresses that are banned from the platform.</p>
        </div>
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-ban">
              <UserX className="w-4 h-4" />
              Ban IP Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban IP Address</DialogTitle>
              <DialogDescription>
                Enter the IP address you want to ban and provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address</label>
                <Input
                  placeholder="e.g., 192.168.1.1"
                  value={banIp}
                  onChange={(e) => setBanIp(e.target.value)}
                  data-testid="input-ban-ip"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Input
                  placeholder="Reason for ban..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  data-testid="input-ban-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={onBanSubmit} 
                disabled={isPending}
                data-testid="button-confirm-ban"
              >
                {isPending ? "Banning..." : "Ban IP"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {bans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Banned IPs</h3>
            <p className="text-muted-foreground">There are currently no banned IP addresses.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Banned At</TableHead>
                <TableHead>Banned By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bans.map((ban) => (
                <TableRow key={ban.id} data-testid={`ban-row-${ban.id}`}>
                  <TableCell>
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">{ban.ip}</code>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={ban.reason}>
                    {ban.reason}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTime(ban.bannedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ban.bannedBy}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnban(ban.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-unban-${ban.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
