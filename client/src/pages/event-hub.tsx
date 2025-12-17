import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  LayoutDashboard,
  Ticket,
  Users,
  Armchair,
  Package,
  Euro,
  Activity,
  Settings,
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  QrCode,
  UserPlus,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Bell,
  MoreHorizontal,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Circle,
  BarChart3,
  PieChart,
  FileText,
  Download,
  Share2,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MessageSquare,
  Megaphone,
  ShieldAlert,
  Shield,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  X,
  LogIn,
  Link2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { EventCashierAllocations } from "./event-cashier-allocations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  Event,
  Station,
  GuestList,
  GuestListEntry,
  EventTable,
  TableBooking,
  SiaeTicketedEvent,
  SiaeEventSector,
  SiaeTransaction,
  SiaeTicket,
  User,
  Product,
  Location as LocationType,
} from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType; gradient: string }> = {
  draft: { label: 'Bozza', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: Circle, gradient: 'from-slate-500 to-slate-600' },
  scheduled: { label: 'Programmato', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Calendar, gradient: 'from-blue-500 to-indigo-600' },
  ongoing: { label: 'In Corso', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: Zap, gradient: 'from-emerald-500 to-teal-600' },
  closed: { label: 'Chiuso', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2, gradient: 'from-rose-500 to-pink-600' },
};

interface ActivityLogItem {
  id: string;
  type: 'check_in' | 'ticket_sold' | 'table_booked' | 'guest_added' | 'status_change' | 'stock_transfer' | 'alert';
  message: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, any>;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissed?: boolean;
}

function LiveIndicator({ isLive }: { isLive: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      isLive ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
      {isLive ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}

function KPICard({
  title,
  value,
  subValue,
  icon: Icon,
  gradient,
  progress,
  trend,
  onClick,
  testId,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  gradient: string;
  progress?: number;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  testId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass-card p-4 ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
      {progress !== undefined && (
        <Progress value={progress} className="h-1.5 mt-3" />
      )}
    </motion.div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  testId: string;
}) {
  const variantStyles = {
    default: 'bg-white/5 hover:bg-white/10 text-foreground',
    success: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400',
    warning: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-2 p-4 min-h-11 rounded-xl transition-all ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-testid={testId}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium text-center">{label}</span>
    </button>
  );
}

function ActivityLogEntry({ item }: { item: ActivityLogItem }) {
  const iconMap = {
    check_in: { icon: UserPlus, color: 'text-emerald-400' },
    ticket_sold: { icon: Ticket, color: 'text-blue-400' },
    table_booked: { icon: Armchair, color: 'text-purple-400' },
    guest_added: { icon: Users, color: 'text-cyan-400' },
    status_change: { icon: Activity, color: 'text-amber-400' },
    stock_transfer: { icon: Package, color: 'text-indigo-400' },
    alert: { icon: AlertTriangle, color: 'text-red-400' },
  };
  
  const { icon: Icon, color } = iconMap[item.type];

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{item.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {format(item.timestamp, 'HH:mm', { locale: it })}
          </span>
          {item.user && (
            <span className="text-xs text-muted-foreground">• {item.user}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ alert, onDismiss }: { alert: AlertItem; onDismiss: () => void }) {
  const styles = {
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  };
  
  const icons = {
    warning: AlertTriangle,
    error: ShieldAlert,
    info: Bell,
    success: CheckCircle2,
  };
  
  const Icon = icons[alert.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${styles[alert.type]}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{alert.title}</p>
        <p className="text-xs opacity-80">{alert.message}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
        <span className="sr-only">Chiudi</span>
        ×
      </Button>
    </motion.div>
  );
}

function EntranceChart({ data }: { data: Array<{ time: string; entries: number; cumulative: number }> }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Flusso Ingressi
        </CardTitle>
        <CardDescription>Ingressi per fascia oraria</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[160px] md:h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <LogIn className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessun check-in registrato</p>
            </div>
          </div>
        ) : (
          <div className="h-[160px] md:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="entriesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="entries"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#entriesGradient)"
                  name="Ingressi"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VenueMap({ 
  tables, 
  bookings, 
  onTableClick 
}: { 
  tables: EventTable[]; 
  bookings: TableBooking[];
  onTableClick?: (table: EventTable) => void;
}) {
  const getTableStatus = (tableId: string) => {
    const booking = bookings.find(b => b.tableId === tableId && b.status !== 'cancelled');
    if (!booking) return 'available';
    if (booking.status === 'seated') return 'occupied';
    if (booking.status === 'confirmed') return 'reserved';
    return 'pending';
  };

  const statusColors = {
    available: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    reserved: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    occupied: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    pending: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  };

  const tablesByType = useMemo(() => {
    const grouped: Record<string, EventTable[]> = {};
    tables.forEach(table => {
      const type = table.tableType || 'standard';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(table);
    });
    return grouped;
  }, [tables]);

  if (tables.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-400" />
            Mappa Venue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun tavolo configurato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-400" />
            Mappa Venue
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Libero
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" /> Prenotato
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" /> Occupato
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(tablesByType).map(([type, typeTables]) => (
            <div key={type}>
              <h4 className="text-sm font-medium mb-2 capitalize text-muted-foreground">
                {type === 'standard' ? 'Standard' : type === 'vip' ? 'VIP' : type === 'prive' ? 'Privé' : type}
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {typeTables.map(table => {
                  const status = getTableStatus(table.id);
                  const booking = bookings.find(b => b.tableId === table.id && b.status !== 'cancelled');
                  
                  return (
                    <motion.button
                      key={table.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onTableClick?.(table)}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${statusColors[status]}`}
                      title={booking ? `${booking.customerName} - ${booking.guestsCount} ospiti` : 'Disponibile'}
                    >
                      <Armchair className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-medium truncate w-full text-center">
                        {table.name}
                      </span>
                      {table.capacity && (
                        <span className="text-[9px] opacity-70">{table.capacity}p</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopConsumptionsWidget({ eventId }: { eventId: string }) {
  const { data: consumptions, isLoading } = useQuery<Array<{ productName: string; quantity: number; revenue: number }>>({
    queryKey: ['/api/events', eventId, 'top-consumptions'],
    enabled: !!eventId,
  });

  const COLORS = ['#FFD700', '#22d3ee', '#a855f7', '#f472b6', '#34d399'];
  const data = consumptions || [];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-400" />
          Top Consumi
        </CardTitle>
        <CardDescription>Prodotti più consumati stasera</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessun consumo registrato</p>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    dataKey="quantity"
                    strokeWidth={0}
                  >
                    {data.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {data.slice(0, 5).map((item, index) => (
                <div key={item.productName} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate max-w-[120px]">{item.productName}</span>
                  </div>
                  <span className="font-medium">{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EventHub() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLive, setIsLive] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pauseTicketingDialogOpen, setPauseTicketingDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportType, setReportType] = useState<'C1' | 'C2' | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // E4U Dialog State
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [showCreateTableTypeDialog, setShowCreateTableTypeDialog] = useState(false);
  const [newListData, setNewListData] = useState({ name: '', maxCapacity: '', price: '' });
  const [newTableTypeData, setNewTableTypeData] = useState({ name: '', price: '', maxGuests: '', totalQuantity: '' });
  
  // E4U Staff/PR/Scanner Dialog State
  const [showAssignStaffDialog, setShowAssignStaffDialog] = useState(false);
  const [showAssignPrDialog, setShowAssignPrDialog] = useState(false);
  const [showAssignScannerDialog, setShowAssignScannerDialog] = useState(false);
  const [showScannerAccessDialog, setShowScannerAccessDialog] = useState(false);
  const [selectedScannerForAccess, setSelectedScannerForAccess] = useState<any>(null);
  const [scannerAccessAllSectors, setScannerAccessAllSectors] = useState(true);
  const [scannerAccessSelectedSectors, setScannerAccessSelectedSectors] = useState<string[]>([]);
  const [selectedStaffForPr, setSelectedStaffForPr] = useState<string | null>(null);
  const [newStaffData, setNewStaffData] = useState({ userId: '', canManageLists: true, canManageTables: true, canCreatePr: false, canApproveTables: false });
  const [newPrData, setNewPrData] = useState({ userId: '', staffUserId: '', canAddToLists: true, canProposeTables: false });
  const [newScannerData, setNewScannerData] = useState({ userId: '', canScanLists: true, canScanTables: true, canScanTickets: true });

  // Biglietti Emessi state
  const [ticketSectorFilter, setTicketSectorFilter] = useState<string>("all");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("all");
  const [ticketsDisplayLimit, setTicketsDisplayLimit] = useState(20);
  const [cancelTicketDialogOpen, setCancelTicketDialogOpen] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState<SiaeTicket | null>(null);
  const [cancelReason, setCancelReason] = useState("01");
  const [cancelNote, setCancelNote] = useState("");

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: location } = useQuery<LocationType>({
    queryKey: ['/api/locations', event?.locationId],
    enabled: !!event?.locationId,
  });

  const { data: eventStations = [] } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const { data: eventStocks = [] } = useQuery<Array<{ id: string; productId: string; quantity: string }>>({
    queryKey: ['/api/events', id, 'stocks'],
    enabled: !!id,
  });

  const { data: guestLists = [] } = useQuery<GuestList[]>({
    queryKey: ['/api/pr/events', id, 'guest-lists'],
    enabled: !!id,
  });

  const { data: tables = [] } = useQuery<EventTable[]>({
    queryKey: ['/api/pr/events', id, 'tables'],
    enabled: !!id,
  });

  const { data: bookings = [] } = useQuery<TableBooking[]>({
    queryKey: ['/api/pr/events', id, 'bookings'],
    enabled: !!id,
  });

  const { data: ticketedEvent } = useQuery<SiaeTicketedEvent & { sectors?: SiaeEventSector[] }>({
    queryKey: ['/api/siae/events', id, 'ticketing'],
    enabled: !!id,
  });

  const { data: siaeTransactions = [] } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'transactions'],
    enabled: !!ticketedEvent?.id,
  });

  // Biglietti Emessi query
  const { data: siaeTickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'tickets'],
    enabled: !!ticketedEvent?.id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // E4U Lists
  const { data: e4uLists = [] } = useQuery<any[]>({
    queryKey: ['/api/e4u/events', id, 'lists'],
    enabled: !!id,
  });

  // E4U Table Types
  const { data: e4uTableTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/e4u/events', id, 'table-types'],
    enabled: !!id,
  });

  // E4U Reservations
  const { data: e4uReservations = [] } = useQuery<any[]>({
    queryKey: ['/api/e4u/events', id, 'reservations'],
    enabled: !!id,
  });

  // E4U Stats
  const { data: e4uStats } = useQuery<any>({
    queryKey: ['/api/e4u/events', id, 'stats'],
    enabled: !!id,
  });

  // E4U Staff Assignments
  const { data: e4uStaff = [] } = useQuery<any[]>({
    queryKey: ['/api/e4u/events', id, 'staff'],
    enabled: !!id,
  });

  // E4U PR Assignments
  const { data: e4uPr = [] } = useQuery<any[]>({
    queryKey: ['/api/e4u/events', id, 'pr'],
    enabled: !!id,
  });

  // E4U Scanners
  const { data: e4uScanners = [] } = useQuery<any[]>({
    queryKey: ['/api/e4u/events', id, 'scanners'],
    enabled: !!id,
  });

  // E4U Report Data
  const { data: e4uReport } = useQuery<any>({
    queryKey: ['/api/e4u/events', id, 'report'],
    enabled: !!id,
  });

  // SIAE sector mutations
  const [editingSector, setEditingSector] = useState<SiaeEventSector | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<string>('');

  const toggleSectorMutation = useMutation({
    mutationFn: async ({ sectorId, active }: { sectorId: string; active: boolean }) => {
      await apiRequest('PATCH', `/api/siae/event-sectors/${sectorId}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      toast({
        title: "Biglietto aggiornato",
        description: "Lo stato del biglietto è stato modificato.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare il biglietto.",
        variant: "destructive",
      });
    },
  });

  const updateSectorCapacityMutation = useMutation({
    mutationFn: async ({ sectorId, capacity, currentSoldCount }: { sectorId: string; capacity: number; currentSoldCount: number }) => {
      if (capacity < currentSoldCount) {
        throw new Error(`La quantità non può essere inferiore ai biglietti già venduti (${currentSoldCount})`);
      }
      await apiRequest('PATCH', `/api/siae/event-sectors/${sectorId}`, { 
        capacity, 
        availableSeats: capacity - currentSoldCount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      setEditingSector(null);
      toast({
        title: "Quantità aggiornata",
        description: "La quantità del biglietto è stata modificata.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare la quantità.",
        variant: "destructive",
      });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest('PATCH', `/api/events/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setStatusChangeDialogOpen(false);
      toast({
        title: "Stato aggiornato",
        description: "Lo stato dell'evento è stato modificato con successo.",
      });
      addActivityLog({
        type: 'status_change',
        message: 'Stato evento aggiornato',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare lo stato dell'evento.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato eliminato con successo.",
      });
      navigate('/events');
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile eliminare l'evento.",
        variant: "destructive",
      });
    },
  });

  // E4U Mutations
  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; maxCapacity?: number; price?: string }) => {
      return apiRequest('POST', `/api/e4u/events/${id}/lists`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pr/events', id, 'guest-lists'] });
      setShowCreateListDialog(false);
      setNewListData({ name: '', maxCapacity: '', price: '' });
      toast({ title: "Lista creata con successo" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile creare la lista", variant: "destructive" });
    },
  });

  const createTableTypeMutation = useMutation({
    mutationFn: async (data: { name: string; price: string; maxGuests: number; totalQuantity: number }) => {
      return apiRequest('POST', `/api/e4u/events/${id}/table-types`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'table-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pr/events', id, 'tables'] });
      setShowCreateTableTypeDialog(false);
      setNewTableTypeData({ name: '', price: '', maxGuests: '', totalQuantity: '' });
      toast({ title: "Tipologia tavolo creata" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile creare la tipologia", variant: "destructive" });
    },
  });

  const approveReservationMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return apiRequest('POST', `/api/e4u/reservations/${reservationId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'reservations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pr/events', id, 'bookings'] });
      toast({ title: "Prenotazione approvata" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile approvare", variant: "destructive" });
    },
  });

  const rejectReservationMutation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason?: string }) => {
      return apiRequest('POST', `/api/e4u/reservations/${reservationId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'reservations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pr/events', id, 'bookings'] });
      toast({ title: "Prenotazione rifiutata" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile rifiutare", variant: "destructive" });
    },
  });

  // Assign Staff mutation
  const assignStaffMutation = useMutation({
    mutationFn: async (data: { userId: string; canManageLists: boolean; canManageTables: boolean; canCreatePr: boolean; canApproveTables: boolean }) => {
      return apiRequest('POST', `/api/e4u/events/${id}/staff`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'staff'] });
      toast({ title: "Staff assegnato all'evento" });
      setShowAssignStaffDialog(false);
      setNewStaffData({ userId: '', canManageLists: true, canManageTables: true, canCreatePr: false, canApproveTables: false });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile assegnare lo staff", variant: "destructive" });
    },
  });

  // Assign PR mutation
  const assignPrMutation = useMutation({
    mutationFn: async (data: { userId: string; staffUserId?: string; canAddToLists: boolean; canProposeTables: boolean }) => {
      return apiRequest('POST', `/api/e4u/events/${id}/pr`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'pr'] });
      toast({ title: "PR assegnato all'evento" });
      setShowAssignPrDialog(false);
      setNewPrData({ userId: '', staffUserId: '', canAddToLists: true, canProposeTables: false });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile assegnare il PR", variant: "destructive" });
    },
  });

  // Assign Scanner mutation
  const assignScannerMutation = useMutation({
    mutationFn: async (data: { userId: string; canScanLists: boolean; canScanTables: boolean; canScanTickets: boolean }) => {
      return apiRequest('POST', `/api/e4u/events/${id}/scanners`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'scanners'] });
      toast({ title: "Scanner assegnato all'evento" });
      setShowAssignScannerDialog(false);
      setNewScannerData({ userId: '', canScanLists: true, canScanTables: true, canScanTickets: true });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile assegnare lo scanner", variant: "destructive" });
    },
  });

  // Remove Staff mutation
  const removeStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest('DELETE', `/api/e4u/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'staff'] });
      toast({ title: "Staff rimosso" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile rimuovere lo staff", variant: "destructive" });
    },
  });

  // Remove PR mutation
  const removePrMutation = useMutation({
    mutationFn: async (prId: string) => {
      return apiRequest('DELETE', `/api/e4u/pr/${prId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'pr'] });
      toast({ title: "PR rimosso" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile rimuovere il PR", variant: "destructive" });
    },
  });

  // Remove Scanner mutation
  const removeScannerMutation = useMutation({
    mutationFn: async (scannerId: string) => {
      return apiRequest('DELETE', `/api/e4u/scanners/${scannerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'scanners'] });
      toast({ title: "Scanner rimosso" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile rimuovere lo scanner", variant: "destructive" });
    },
  });

  // Update Scanner Access mutation
  const updateScannerAccessMutation = useMutation({
    mutationFn: async ({ scannerId, allowedSectorIds }: { scannerId: string; allowedSectorIds: string[] }) => {
      return apiRequest('PATCH', `/api/e4u/scanners/${scannerId}/access`, { allowedSectorIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', id, 'scanners'] });
      toast({ title: "Accesso Scanner Aggiornato", description: "Le restrizioni di settore sono state salvate." });
      setShowScannerAccessDialog(false);
      setSelectedScannerForAccess(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error?.message || "Impossibile aggiornare l'accesso dello scanner", variant: "destructive" });
    },
  });

  // Open scanner access dialog
  const openScannerAccessDialog = (scanner: any) => {
    setSelectedScannerForAccess(scanner);
    const allowedSectors = scanner.scanner?.allowedSectorIds || scanner.allowedSectorIds || [];
    const hasAllSectors = !allowedSectors || allowedSectors.length === 0;
    setScannerAccessAllSectors(hasAllSectors);
    setScannerAccessSelectedSectors(hasAllSectors ? [] : allowedSectors);
    setShowScannerAccessDialog(true);
  };

  // Handle save scanner access
  const handleSaveScannerAccess = () => {
    if (!selectedScannerForAccess) return;
    const scannerId = selectedScannerForAccess.scanner?.id || selectedScannerForAccess.id;
    const allowedSectorIds = scannerAccessAllSectors ? [] : scannerAccessSelectedSectors;
    updateScannerAccessMutation.mutate({ scannerId, allowedSectorIds });
  };

  // Toggle sector selection
  const toggleSectorSelection = (sectorId: string) => {
    setScannerAccessSelectedSectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(id => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  // Select/Deselect all sectors
  const toggleAllSectors = (selectAll: boolean) => {
    if (selectAll && ticketedEvent?.sectors) {
      setScannerAccessSelectedSectors(ticketedEvent.sectors.map(s => s.id));
    } else {
      setScannerAccessSelectedSectors([]);
    }
  };

  // Get scanner sector count display
  const getScannerSectorDisplay = (scanner: any) => {
    const allowedSectors = scanner.scanner?.allowedSectorIds || scanner.allowedSectorIds || [];
    if (!allowedSectors || allowedSectors.length === 0) {
      return { label: 'Tutti i settori', color: 'bg-emerald-500/20 text-emerald-400' };
    }
    return { label: `${allowedSectors.length} settori`, color: 'bg-amber-500/20 text-amber-400' };
  };

  // Cancel ticket mutation
  const cancelTicketMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      return apiRequest('POST', `/api/siae/tickets/${ticketId}/cancel`, { reasonCode: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      setCancelTicketDialogOpen(false);
      setTicketToCancel(null);
      setCancelReason("01");
      setCancelNote("");
      toast({ title: "Biglietto Annullato", description: "Il biglietto è stato annullato con successo." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore Annullamento", 
        description: error?.message || "Impossibile annullare il biglietto", 
        variant: "destructive" 
      });
    },
  });

  // Helper to get filtered tickets
  const filteredTickets = useMemo(() => {
    let filtered = siaeTickets;
    if (ticketSectorFilter !== "all") {
      filtered = filtered.filter(t => t.sectorId === ticketSectorFilter);
    }
    if (ticketStatusFilter !== "all") {
      filtered = filtered.filter(t => t.status === ticketStatusFilter);
    }
    return filtered;
  }, [siaeTickets, ticketSectorFilter, ticketStatusFilter]);

  const displayedTickets = filteredTickets.slice(0, ticketsDisplayLimit);

  const getSectorName = useCallback((sectorId: string) => {
    const sector = ticketedEvent?.sectors?.find(s => s.id === sectorId);
    return sector?.name || "Settore Sconosciuto";
  }, [ticketedEvent?.sectors]);

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Valido</Badge>;
      case 'used':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Usato</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCancelTicket = (ticket: SiaeTicket) => {
    setTicketToCancel(ticket);
    setCancelTicketDialogOpen(true);
  };

  const confirmCancelTicket = () => {
    if (!ticketToCancel) return;
    cancelTicketMutation.mutate({ 
      ticketId: ticketToCancel.id, 
      reason: cancelNote ? `${cancelReason}: ${cancelNote}` : cancelReason 
    });
  };

  const handleReportC1 = () => {
    if (!ticketedEvent?.id) {
      toast({ title: "Errore", description: "Nessun evento SIAE associato.", variant: "destructive" });
      return;
    }
    window.open(`/siae/reports/c1/${ticketedEvent.id}`, '_blank');
  };

  const handleReportC2 = async () => {
    if (!ticketedEvent?.id) {
      toast({ title: "Errore", description: "Nessun evento SIAE associato.", variant: "destructive" });
      return;
    }
    setReportLoading(true);
    setReportType('C2');
    try {
      const response = await fetch(`/api/siae/ticketed-events/${ticketedEvent.id}/reports/c2`, { credentials: 'include' });
      if (!response.ok) throw new Error("Errore nel caricamento del report");
      const data = await response.json();
      setReportData(data);
      setReportDialogOpen(true);
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Impossibile generare il report C2.", variant: "destructive" });
      setReportType(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportXML = async () => {
    if (!ticketedEvent?.id) {
      toast({ title: "Errore", description: "Nessun evento SIAE associato.", variant: "destructive" });
      return;
    }
    setReportLoading(true);
    toast({ title: "Generazione XML", description: "Preparazione file XML in corso..." });
    try {
      const response = await fetch(`/api/siae/ticketed-events/${ticketedEvent.id}/reports/xml`, { credentials: 'include' });
      if (!response.ok) throw new Error("Errore nel download del file XML");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIAE_Report_${ticketedEvent.id}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Download completato", description: "File XML scaricato con successo." });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Impossibile scaricare il file XML.", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!ticketedEvent?.id) {
      toast({ title: "Errore", description: "Nessun evento SIAE associato.", variant: "destructive" });
      return;
    }
    setReportLoading(true);
    toast({ title: "Generazione PDF", description: "Preparazione file PDF in corso..." });
    try {
      const response = await fetch(`/api/siae/ticketed-events/${ticketedEvent.id}/reports/pdf`, { credentials: 'include' });
      if (!response.ok) throw new Error("Errore nel caricamento dei dati");
      const data = await response.json();
      
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Registro SIAE', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Evento: ${data.eventName || 'N/D'}`, 20, 35);
      doc.text(`Data: ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('it-IT') : 'N/D'}`, 20, 42);
      doc.text(`Luogo: ${data.eventLocation || 'N/D'}`, 20, 49);
      doc.text(`Genere: ${data.eventGenre || 'N/D'}`, 20, 56);
      
      doc.setFontSize(14);
      doc.text('Riepilogo', 20, 70);
      doc.setFontSize(11);
      doc.text(`Capienza Totale: ${data.summary?.totalCapacity || 0}`, 20, 78);
      doc.text(`Biglietti Venduti: ${data.summary?.ticketsSold || 0}`, 20, 85);
      doc.text(`Biglietti Annullati: ${data.summary?.ticketsCancelled || 0}`, 20, 92);
      doc.text(`Incasso Totale: EUR ${(data.summary?.totalRevenue || 0).toFixed(2)}`, 20, 99);
      doc.text(`Aliquota IVA: ${data.summary?.vatRate || 10}%`, 20, 106);
      
      if (data.sectors && data.sectors.length > 0) {
        doc.setFontSize(14);
        doc.text('Settori/Tipologie Biglietto', 20, 120);
        doc.setFontSize(10);
        let yPos = 128;
        for (const sector of data.sectors) {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${sector.name}: ${sector.soldCount}/${sector.capacity} - EUR ${sector.revenue?.toFixed(2) || '0.00'}`, 20, yPos);
          yPos += 7;
        }
      }
      
      doc.setFontSize(8);
      doc.text(`Generato il: ${new Date(data.generatedAt).toLocaleString('it-IT')}`, 20, 285);
      
      doc.save(`SIAE_Registro_${data.eventName?.replace(/[^a-zA-Z0-9]/g, '_') || 'evento'}.pdf`);
      toast({ title: "Download completato", description: "File PDF generato con successo." });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Impossibile generare il PDF.", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const addActivityLog = useCallback((item: Omit<ActivityLogItem, 'id' | 'timestamp'>) => {
    setActivityLog(prev => [{
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      user: user?.firstName || user?.email || undefined,
    }, ...prev].slice(0, 50));
  }, [user]);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id' | 'timestamp'>) => {
    setAlerts(prev => [{
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }, ...prev]);
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  useEffect(() => {
    if (event?.status === 'ongoing') {
      try {
        const ws = new WebSocket(`ws://localhost:18765/events/${id}`);
        ws.onopen = () => {
          setIsLive(true);
          setWsConnection(ws);
        };
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === 'activity') {
              addActivityLog(data.payload);
            } else if (data.type === 'alert') {
              addAlert(data.payload);
            } else if (data.type === 'refresh') {
              queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e);
          }
        };
        ws.onclose = () => {
          setIsLive(false);
          setWsConnection(null);
        };
        ws.onerror = () => {
          setIsLive(false);
        };
        return () => ws.close();
      } catch (e) {
        console.error('WebSocket connection failed:', e);
      }
    }
  }, [event?.status, id, addActivityLog, addAlert]);

  const totalGuests = useMemo(() => {
    return guestLists.reduce((acc, list) => acc + (list.currentCount || 0), 0);
  }, [guestLists]);

  const maxGuests = useMemo(() => {
    return guestLists.reduce((acc, list) => acc + (list.maxGuests || 0), 0);
  }, [guestLists]);

  const checkedInGuests = useMemo(() => {
    return guestLists.reduce((acc, list) => acc + ((list as any).checkedInCount || 0), 0);
  }, [guestLists]);

  const bookedTables = useMemo(() => {
    return bookings.filter(b => b.status !== 'cancelled').length;
  }, [bookings]);

  const totalRevenue = useMemo(() => {
    let revenue = 0;
    if (ticketedEvent) {
      revenue += Number(ticketedEvent.totalRevenue || 0);
    }
    bookings.forEach(b => {
      if (b.status === 'confirmed' || b.status === 'seated') {
        revenue += Number(b.depositPaid || 0);
      }
    });
    return revenue;
  }, [ticketedEvent, bookings]);

  const status = statusConfig[event?.status || 'draft'];
  const StatusIcon = status?.icon || Circle;

  if (eventLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-20 w-full mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Evento non trovato</h2>
            <p className="text-muted-foreground mb-4">L'evento richiesto non esiste o è stato eliminato.</p>
            <Button onClick={() => navigate('/events')} data-testid="button-back-to-events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna agli Eventi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusTransitions: Record<string, { next: string; label: string; icon: React.ElementType }> = {
    draft: { next: 'scheduled', label: 'Programma Evento', icon: Calendar },
    scheduled: { next: 'ongoing', label: 'Avvia Evento', icon: Play },
    ongoing: { next: 'closed', label: 'Chiudi Evento', icon: StopCircle },
  };

  const currentTransition = statusTransitions[event.status];

  return (
    <div className="min-h-screen pb-24 md:pb-8" data-testid="page-event-hub">
      <AnimatePresence>
        {alerts.filter(a => !a.dismissed).map(alert => (
          <div key={alert.id} className="px-4 md:px-6 pt-2">
            <AlertBanner alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          </div>
        ))}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/events')}
                className="rounded-xl"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold" data-testid="event-title">{event.name}</h1>
                  <Badge className={`${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  <LiveIndicator isLive={isLive} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(event.startDatetime), "EEEE d MMMM", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(event.startDatetime), "HH:mm", { locale: it })}
                    {event.endDatetime && ` - ${format(new Date(event.endDatetime), "HH:mm", { locale: it })}`}
                  </span>
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(user?.role === 'super_admin' || user?.role === 'gestore') && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="button-delete-event"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {currentTransition && (
                <Button
                  onClick={() => setStatusChangeDialogOpen(true)}
                  className={`bg-gradient-to-r ${status.gradient} text-white`}
                  data-testid="button-change-status"
                >
                  <currentTransition.icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{currentTransition.label}</span>
                </Button>
              )}

              <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-quick-actions">
                    <Zap className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Azioni Rapide</SheetTitle>
                    <SheetDescription>
                      Operazioni veloci per gestire l'evento
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <QuickActionButton
                      icon={QrCode}
                      label="Scansiona QR"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate('/pr/scanner');
                      }}
                      testId="quick-action-scan"
                    />
                    <QuickActionButton
                      icon={UserPlus}
                      label="Aggiungi Ospite"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/pr/guest-lists?eventId=${id}`);
                      }}
                      testId="quick-action-add-guest"
                    />
                    <QuickActionButton
                      icon={Armchair}
                      label="Prenota Tavolo"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/pr/tables?eventId=${id}`);
                      }}
                      testId="quick-action-book-table"
                    />
                    <QuickActionButton
                      icon={Package}
                      label="Trasferisci Stock"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/events/${id}`);
                      }}
                      testId="quick-action-transfer"
                    />
                    <QuickActionButton
                      icon={BarChart3}
                      label="Report Live"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/reports?eventId=${id}`);
                      }}
                      testId="quick-action-report"
                    />
                    <QuickActionButton
                      icon={FileText}
                      label="File Serata"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/night-file?eventId=${id}`);
                      }}
                      testId="quick-action-night-file"
                    />
                  </div>

                  <Separator className="my-6" />

                  <h4 className="font-medium mb-3 text-sm">Azioni di Emergenza</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickActionButton
                      icon={Pause}
                      label="Pausa Vendite"
                      onClick={() => {
                        setPauseTicketingDialogOpen(true);
                      }}
                      variant="warning"
                      disabled={event.status !== 'ongoing'}
                      testId="quick-action-pause"
                    />
                    <QuickActionButton
                      icon={ShieldAlert}
                      label="SOS Sicurezza"
                      onClick={() => {
                        toast({
                          title: "SOS Sicurezza",
                          description: "Alert inviato al team sicurezza",
                          variant: "destructive",
                        });
                        addAlert({
                          type: 'error',
                          title: 'SOS Sicurezza Attivato',
                          message: 'Il team sicurezza è stato allertato',
                        });
                      }}
                      variant="danger"
                      testId="quick-action-sos"
                    />
                    <QuickActionButton
                      icon={Megaphone}
                      label="Annuncio Staff"
                      onClick={() => {
                        toast({
                          title: "Annuncio Staff",
                          description: "Funzione in arrivo",
                        });
                      }}
                      testId="quick-action-announce"
                    />
                    <QuickActionButton
                      icon={Lock}
                      label="Blocca Ingressi"
                      onClick={() => {
                        toast({
                          title: "Ingressi Bloccati",
                          description: "Nessun nuovo ingresso consentito",
                          variant: "destructive",
                        });
                      }}
                      variant="danger"
                      disabled={event.status !== 'ongoing'}
                      testId="quick-action-lock"
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-more-options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/events/wizard/${id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica Evento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/reports?eventId=${id}`)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Visualizza Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/night-file?eventId=${id}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    File della Serata
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
                    toast({ title: "Dati aggiornati" });
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aggiorna Dati
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Biglietti"
            value={ticketedEvent?.ticketsSold || 0}
            subValue={ticketedEvent ? `/ ${ticketedEvent.totalCapacity}` : 'Non attivo'}
            icon={Ticket}
            gradient="from-blue-500 to-indigo-600"
            progress={ticketedEvent ? (ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100 : 0}
            onClick={() => setActiveTab('ticketing')}
            testId="kpi-tickets"
          />
          <KPICard
            title="Ospiti Liste"
            value={`${checkedInGuests}/${totalGuests}`}
            subValue={maxGuests > 0 ? `Max ${maxGuests}` : 'Nessuna lista'}
            icon={Users}
            gradient="from-cyan-500 to-teal-600"
            progress={maxGuests > 0 ? (checkedInGuests / maxGuests) * 100 : 0}
            onClick={() => setActiveTab('guests')}
            testId="kpi-guests"
          />
          <KPICard
            title="Tavoli"
            value={`${bookedTables}/${tables.length}`}
            subValue={tables.length > 0 ? 'Prenotati' : 'Nessun tavolo'}
            icon={Armchair}
            gradient="from-purple-500 to-pink-600"
            progress={tables.length > 0 ? (bookedTables / tables.length) * 100 : 0}
            onClick={() => setActiveTab('tables')}
            testId="kpi-tables"
          />
          <KPICard
            title="Incasso"
            value={`€${totalRevenue.toFixed(0)}`}
            subValue="Totale evento"
            icon={Euro}
            gradient="from-amber-500 to-orange-600"
            trend={totalRevenue > 0 ? { value: 12, isPositive: true } : undefined}
            onClick={() => setActiveTab('finance')}
            testId="kpi-revenue"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" data-testid="tabs-scroll-container">
            <TabsList className="inline-flex justify-start bg-transparent gap-1 p-0 min-w-max">
              {[
                { id: 'overview', label: 'Panoramica', shortLabel: 'Home', icon: LayoutDashboard },
                { id: 'ticketing', label: 'Biglietteria', shortLabel: 'Ticket', icon: Ticket },
                { id: 'guests', label: 'Liste', shortLabel: 'Liste', icon: Users },
                { id: 'tables', label: 'Tavoli', shortLabel: 'Tavoli', icon: Armchair },
                { id: 'staff', label: 'Staff', shortLabel: 'Staff', icon: Users },
                { id: 'pr', label: 'PR', shortLabel: 'PR', icon: Megaphone },
                { id: 'links', label: 'Link', shortLabel: 'Link', icon: Link2 },
                { id: 'access', label: 'Controllo Accessi', shortLabel: 'Accessi', icon: Shield },
                { id: 'inventory', label: 'Inventario', shortLabel: 'Stock', icon: Package },
                { id: 'finance', label: 'Incassi', shortLabel: 'Incassi', icon: Euro },
                { id: 'report', label: 'Report', shortLabel: 'Report', icon: BarChart3 },
              ].map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap text-xs sm:text-sm sm:px-3 sm:min-h-10"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="md:col-span-1 lg:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Stato Evento
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {Object.entries(statusConfig).map(([key, config], index) => {
                        const isActive = event.status === key;
                        const isPassed = Object.keys(statusConfig).indexOf(event.status) > index;
                        const IconComponent = config.icon;
                        
                        return (
                          <div key={key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                                isActive 
                                  ? 'border-primary bg-primary text-primary-foreground scale-110' 
                                  : isPassed 
                                  ? 'border-primary bg-primary/20 text-primary' 
                                  : 'border-muted bg-muted/20 text-muted-foreground'
                              }`}>
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <span className={`text-xs text-center ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                                {config.label}
                              </span>
                            </div>
                            {index < 3 && (
                              <div className={`h-0.5 w-full mx-2 rounded-full ${
                                isPassed ? 'bg-primary' : 'bg-muted'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-400" />
                        Azioni Rapide
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <QuickActionButton
                        icon={QrCode}
                        label="Scansiona"
                        onClick={() => navigate('/pr/scanner')}
                        testId="overview-scan"
                      />
                      <QuickActionButton
                        icon={UserPlus}
                        label="Ospite"
                        onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)}
                        testId="overview-add-guest"
                      />
                      <QuickActionButton
                        icon={Armchair}
                        label="Tavolo"
                        onClick={() => navigate(`/pr/tables?eventId=${id}`)}
                        testId="overview-table"
                      />
                      <QuickActionButton
                        icon={Package}
                        label="Stock"
                        onClick={() => navigate(`/events/${id}`)}
                        testId="overview-stock"
                      />
                      <QuickActionButton
                        icon={BarChart3}
                        label="Report"
                        onClick={() => navigate(`/reports?eventId=${id}`)}
                        testId="overview-report"
                      />
                      <QuickActionButton
                        icon={FileText}
                        label="File Serata"
                        onClick={() => navigate(`/night-file?eventId=${id}`)}
                        testId="overview-night-file"
                      />
                    </div>
                  </CardContent>
                </Card>

                {event.notes && (
                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Note Evento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <EntranceChart 
                  data={e4uStats?.entranceFlowData || []} 
                />

                <VenueMap 
                  tables={tables} 
                  bookings={bookings}
                  onTableClick={(table) => {
                    navigate(`/pr/tables?tableId=${table.id}`);
                  }}
                />
              </div>

              <div className="space-y-6">
                <TopConsumptionsWidget eventId={id || ''} />
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        Attività Live
                      </CardTitle>
                      <LiveIndicator isLive={isLive} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      {activityLog.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nessuna attività recente</p>
                          <p className="text-xs mt-1">Le attività appariranno qui in tempo reale</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {activityLog.map(item => (
                            <ActivityLogEntry key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-5 w-5 text-amber-400" />
                      Avvisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alerts.length === 0 && eventStocks.length < 5 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                          <div>
                            <p className="text-sm font-medium text-amber-400">Scorte Basse</p>
                            <p className="text-xs text-muted-foreground">Meno di 5 prodotti in evento</p>
                          </div>
                        </div>
                      )}
                      {alerts.length === 0 && tables.length > 0 && bookedTables === tables.length && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          <div>
                            <p className="text-sm font-medium text-emerald-400">Tavoli Completi</p>
                            <p className="text-xs text-muted-foreground">Tutti i tavoli sono prenotati</p>
                          </div>
                        </div>
                      )}
                      {alerts.length === 0 && !ticketedEvent && guestLists.length === 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Bell className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-blue-400">Configura Evento</p>
                            <p className="text-xs text-muted-foreground">Aggiungi liste o biglietteria</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ticketing">
            {ticketedEvent ? (
              <div className="space-y-6">
                {/* Statistiche Generali */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-blue-400" />
                        Riepilogo Biglietteria
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={ticketedEvent.ticketingStatus === 'active' ? 'default' : 'secondary'}>
                          {ticketedEvent.ticketingStatus === 'active' ? 'Attiva' : 
                           ticketedEvent.ticketingStatus === 'draft' ? 'Bozza' : 
                           ticketedEvent.ticketingStatus === 'suspended' ? 'Sospesa' : 'Chiusa'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="p-4 rounded-lg bg-background/50 border" data-testid="stat-sold">
                        <div className="text-2xl font-bold text-blue-400">{ticketedEvent.ticketsSold}</div>
                        <div className="text-xs text-muted-foreground">Venduti</div>
                      </div>
                      <div className="p-4 rounded-lg bg-background/50 border" data-testid="stat-available">
                        <div className="text-2xl font-bold text-emerald-400">{ticketedEvent.totalCapacity - ticketedEvent.ticketsSold}</div>
                        <div className="text-xs text-muted-foreground">Disponibili</div>
                      </div>
                      <div className="p-4 rounded-lg bg-background/50 border" data-testid="stat-cancelled">
                        <div className="text-2xl font-bold text-rose-400">{ticketedEvent.ticketsCancelled}</div>
                        <div className="text-xs text-muted-foreground">Annullati</div>
                      </div>
                      <div className="p-4 rounded-lg bg-background/50 border" data-testid="stat-revenue">
                        <div className="text-2xl font-bold text-amber-400">€{Number(ticketedEvent.totalRevenue || 0).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Incasso</div>
                      </div>
                    </div>
                    <Progress value={ticketedEvent.totalCapacity > 0 ? (ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100 : 0} className="h-3" />
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Occupazione</span>
                      <span className="font-medium">{ticketedEvent.totalCapacity > 0 ? ((ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Elenco Biglietti (Sectors) */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-cyan-400" />
                        Tipologie Biglietti
                      </CardTitle>
                      <Button onClick={() => navigate('/siae/ticketed-events')} variant="outline" size="sm" data-testid="btn-manage-tickets">
                        Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ticketedEvent.sectors && ticketedEvent.sectors.length > 0 ? (
                      <div className="space-y-3">
                        {ticketedEvent.sectors.map((sector) => {
                          const soldCount = sector.capacity - sector.availableSeats;
                          return (
                            <div 
                              key={sector.id} 
                              className="flex items-center justify-between p-4 rounded-lg bg-background/50 border"
                              data-testid={`ticket-row-${sector.id}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-medium">{sector.name}</h4>
                                  <Badge variant={sector.active ? 'default' : 'secondary'} className="text-xs">
                                    {sector.active ? 'Attivo' : 'Disattivato'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>Intero: €{Number(sector.priceIntero).toFixed(2)}</span>
                                  {sector.priceRidotto && <span>Ridotto: €{Number(sector.priceRidotto).toFixed(2)}</span>}
                                  {sector.prevendita && Number(sector.prevendita) > 0 && <span>DDP: €{Number(sector.prevendita).toFixed(2)}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm">
                                    <span className="font-bold text-blue-400">{soldCount}</span>
                                    <span className="text-muted-foreground"> / {sector.capacity}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {sector.availableSeats} disponibili
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={sector.active}
                                    onCheckedChange={(checked) => toggleSectorMutation.mutate({ sectorId: sector.id, active: checked })}
                                    disabled={toggleSectorMutation.isPending}
                                    data-testid={`toggle-sector-${sector.id}`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingSector(sector);
                                      setEditingCapacity(sector.capacity.toString());
                                    }}
                                    data-testid={`btn-edit-sector-${sector.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nessun biglietto configurato</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pulsanti Report */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-400" />
                      Report SIAE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-auto py-4 flex flex-col gap-2" 
                        data-testid="btn-report-c1"
                        onClick={handleReportC1}
                        disabled={!ticketedEvent?.id || reportLoading}
                      >
                        {reportLoading ? <Loader2 className="h-6 w-6 animate-spin text-blue-400" /> : <FileText className="h-6 w-6 text-blue-400" />}
                        <span className="text-sm font-medium">Report C1</span>
                        <span className="text-xs text-muted-foreground">Registro Giornaliero</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-auto py-4 flex flex-col gap-2" 
                        data-testid="btn-report-c2"
                        onClick={handleReportC2}
                        disabled={!ticketedEvent?.id || reportLoading}
                      >
                        {reportLoading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-400" /> : <FileText className="h-6 w-6 text-emerald-400" />}
                        <span className="text-sm font-medium">Report C2</span>
                        <span className="text-xs text-muted-foreground">Riepilogo Evento</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-auto py-4 flex flex-col gap-2" 
                        data-testid="btn-report-xml"
                        onClick={handleExportXML}
                        disabled={!ticketedEvent?.id || reportLoading}
                      >
                        {reportLoading ? <Loader2 className="h-6 w-6 animate-spin text-amber-400" /> : <Download className="h-6 w-6 text-amber-400" />}
                        <span className="text-sm font-medium">Export XML</span>
                        <span className="text-xs text-muted-foreground">Trasmissione SIAE</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-auto py-4 flex flex-col gap-2" 
                        data-testid="btn-report-pdf"
                        onClick={handleExportPDF}
                        disabled={!ticketedEvent?.id || reportLoading}
                      >
                        {reportLoading ? <Loader2 className="h-6 w-6 animate-spin text-rose-400" /> : <Download className="h-6 w-6 text-rose-400" />}
                        <span className="text-sm font-medium">Export PDF</span>
                        <span className="text-xs text-muted-foreground">Stampa Registro</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Transazioni Recenti */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-amber-400" />
                        Transazioni Recenti
                      </CardTitle>
                      <Badge variant="secondary">{siaeTransactions.length} transazioni</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {siaeTransactions.length > 0 ? (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {siaeTransactions.slice(0, 20).map((tx) => (
                            <div 
                              key={tx.id} 
                              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border"
                              data-testid={`transaction-${tx.id}`}
                            >
                              <div>
                                <div className="font-medium text-sm">{tx.transactionCode}</div>
                                <div className="text-xs text-muted-foreground">
                                  {tx.ticketsCount} bigliett{tx.ticketsCount === 1 ? 'o' : 'i'} • {tx.paymentMethod || 'N/D'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-emerald-400">€{Number(tx.totalAmount).toFixed(2)}</div>
                                <Badge 
                                  variant={tx.status === 'completed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {tx.status === 'completed' ? 'Completata' : 
                                   tx.status === 'pending' ? 'In attesa' : 
                                   tx.status === 'refunded' ? 'Rimborsata' : 'Fallita'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nessuna transazione registrata</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dialog Modifica Quantità */}
                <Dialog open={!!editingSector} onOpenChange={(open) => !open && setEditingSector(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifica Quantità</DialogTitle>
                      <DialogDescription>
                        Modifica la quantità disponibile per "{editingSector?.name}"
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="capacity">Quantità Totale</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min={editingSector ? editingSector.capacity - editingSector.availableSeats : 0}
                          value={editingCapacity}
                          onChange={(e) => setEditingCapacity(e.target.value)}
                          data-testid="input-edit-capacity"
                        />
                        {editingSector && (
                          <p className="text-xs text-muted-foreground">
                            Minimo: {editingSector.capacity - editingSector.availableSeats} (già venduti)
                          </p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingSector(null)} data-testid="btn-cancel-edit">
                        Annulla
                      </Button>
                      <Button 
                        onClick={() => {
                          if (editingSector) {
                            const currentSoldCount = editingSector.capacity - editingSector.availableSeats;
                            updateSectorCapacityMutation.mutate({
                              sectorId: editingSector.id,
                              capacity: parseInt(editingCapacity) || editingSector.capacity,
                              currentSoldCount,
                            });
                          }
                        }}
                        disabled={updateSectorCapacityMutation.isPending}
                        data-testid="btn-save-capacity"
                      >
                        {updateSectorCapacityMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                        ) : (
                          'Salva'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-2">Biglietteria Non Attiva</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Attiva la biglietteria SIAE per vendere biglietti
                    </p>
                    <Button onClick={() => navigate('/siae/ticketed-events')} data-testid="btn-activate-ticketing">
                      Attiva Biglietteria
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cashier Allocations Section */}
            {ticketedEvent && (
              <EventCashierAllocations 
                eventId={id || ''} 
                siaeEventId={ticketedEvent?.id}
              />
            )}

            {/* Biglietti Emessi Section */}
            {ticketedEvent && (
              <Card className="glass-card" data-testid="card-biglietti-emessi">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-amber-400" />
                      Biglietti Emessi
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={ticketSectorFilter} onValueChange={setTicketSectorFilter}>
                        <SelectTrigger className="w-[160px]" data-testid="select-sector-filter">
                          <SelectValue placeholder="Tutti i Settori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i Settori</SelectItem>
                          {ticketedEvent.sectors?.map((sector) => (
                            <SelectItem key={sector.id} value={sector.id}>
                              {sector.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                        <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                          <SelectValue placeholder="Tutti gli Stati" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti gli Stati</SelectItem>
                          <SelectItem value="valid">Valido</SelectItem>
                          <SelectItem value="used">Usato</SelectItem>
                          <SelectItem value="cancelled">Annullato</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => refetchTickets()}
                        data-testid="button-refresh-tickets"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {filteredTickets.length} bigliett{filteredTickets.length === 1 ? 'o' : 'i'} 
                    {ticketSectorFilter !== "all" || ticketStatusFilter !== "all" ? " (filtrati)" : " totali"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-8">
                      <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Nessun Biglietto</h3>
                      <p className="text-sm text-muted-foreground">
                        {ticketSectorFilter !== "all" || ticketStatusFilter !== "all" 
                          ? "Nessun biglietto corrisponde ai filtri selezionati"
                          : "Non ci sono biglietti emessi per questo evento"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Codice Biglietto</TableHead>
                            <TableHead>Settore</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Prezzo</TableHead>
                            <TableHead>Data Emissione</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead>Canale</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedTickets.map((ticket) => (
                            <TableRow key={ticket.id} data-testid={`ticket-row-${ticket.id}`}>
                              <TableCell className="font-mono text-sm" data-testid={`ticket-code-${ticket.id}`}>
                                {ticket.fiscalSealCode || ticket.progressiveNumber || ticket.id.slice(0, 8)}
                              </TableCell>
                              <TableCell>{getSectorName(ticket.sectorId)}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {ticket.ticketTypeCode === 'INT' || ticket.ticketTypeCode === '01' ? 'Intero' : 
                                   ticket.ticketTypeCode === 'RID' || ticket.ticketTypeCode === '02' ? 'Ridotto' : 
                                   ticket.ticketTypeCode}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                €{Number(ticket.grossAmount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {ticket.emissionDate ? format(new Date(ticket.emissionDate), 'dd/MM/yyyy HH:mm', { locale: it }) : 'N/A'}
                              </TableCell>
                              <TableCell data-testid={`ticket-status-${ticket.id}`}>
                                {getTicketStatusBadge(ticket.status)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {ticket.emissionChannelCode || ticket.cardCode || "N/A"}
                              </TableCell>
                              <TableCell className="text-right">
                                {ticket.status === 'valid' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelTicket(ticket)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    data-testid={`button-cancel-ticket-${ticket.id}`}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Annulla
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {filteredTickets.length > ticketsDisplayLimit && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setTicketsDisplayLimit(prev => prev + 20)}
                            data-testid="button-load-more-tickets"
                          >
                            Carica altri ({filteredTickets.length - ticketsDisplayLimit} rimanenti)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cancel Ticket Dialog */}
            <AlertDialog open={cancelTicketDialogOpen} onOpenChange={setCancelTicketDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annulla Biglietto</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stai per annullare il biglietto{' '}
                    <span className="font-mono font-semibold">
                      {ticketToCancel?.fiscalSealCode || ticketToCancel?.progressiveNumber || ticketToCancel?.id.slice(0, 8)}
                    </span>.
                    Questa azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">Causale Annullamento</Label>
                    <Select value={cancelReason} onValueChange={setCancelReason}>
                      <SelectTrigger data-testid="select-cancel-reason">
                        <SelectValue placeholder="Seleziona causale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">01 - Richiesta cliente</SelectItem>
                        <SelectItem value="02">02 - Errore emissione</SelectItem>
                        <SelectItem value="03">03 - Evento annullato</SelectItem>
                        <SelectItem value="04">04 - Duplicato</SelectItem>
                        <SelectItem value="99">99 - Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancel-note">Note aggiuntive (opzionale)</Label>
                    <Textarea
                      id="cancel-note"
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      placeholder="Descrivi il motivo dell'annullamento..."
                      className="resize-none"
                      data-testid="input-cancel-note"
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-dialog-close">Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmCancelTicket}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={cancelTicketMutation.isPending}
                    data-testid="button-confirm-cancel-ticket"
                  >
                    {cancelTicketMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Annullamento...
                      </>
                    ) : (
                      'Conferma Annullamento'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="guests">
            <div className="space-y-6">
              {e4uStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <div className="text-2xl font-bold text-cyan-400">{e4uStats.lists?.total || guestLists.length}</div>
                    <div className="text-sm text-muted-foreground">Liste Attive</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold">{(e4uStats.lists?.entries || 0) + (e4uStats.tables?.totalGuests || 0) || totalGuests}</div>
                    <div className="text-sm text-muted-foreground">Iscritti Totali</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-emerald-400">{e4uStats.totalCheckIns || checkedInGuests}</div>
                    <div className="text-sm text-muted-foreground">Check-in</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold">{(() => {
                      const total = (e4uStats.lists?.entries || 0) + (e4uStats.tables?.totalGuests || 0);
                      const checked = e4uStats.totalCheckIns || 0;
                      return total > 0 ? `${Math.round((checked / total) * 100)}%` : '--';
                    })()}</div>
                    <div className="text-sm text-muted-foreground">Tasso Check-in</div>
                  </div>
                </div>
              )}

              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-cyan-400" />
                      Liste Ospiti
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => setShowCreateListDialog(true)} 
                        size="sm"
                        data-testid="btn-create-list"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nuova Lista
                      </Button>
                      <Button onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)} variant="outline" size="sm" data-testid="btn-manage-lists">
                        Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(e4uLists.length > 0 || guestLists.length > 0) ? (
                    <div className="space-y-4">
                      {(e4uLists.length > 0 ? e4uLists : guestLists).map((list: any) => {
                        const entryCount = list.entryCount || list.currentCount || 0;
                        const checkedIn = list.checkedInCount || 0;
                        const maxCapacity = list.maxCapacity || list.maxGuests || 0;
                        const capacityPercent = maxCapacity > 0 ? (entryCount / maxCapacity) * 100 : 0;

                        return (
                          <div 
                            key={list.id} 
                            className="flex items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border hover:border-cyan-500/50 transition-colors"
                            data-testid={`list-item-${list.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium">{list.name}</h4>
                                {list.price && (
                                  <Badge variant="secondary" className="text-xs">€{list.price}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {entryCount} iscritti
                                </span>
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {checkedIn} check-in
                                </span>
                              </div>
                              {maxCapacity > 0 && (
                                <div className="mt-2">
                                  <Progress value={capacityPercent} className="h-1.5" />
                                  <p className="text-xs text-muted-foreground mt-1">{entryCount}/{maxCapacity} ({Math.round(capacityPercent)}%)</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/pr/guest-lists?eventId=${id}&listId=${list.id}`)}
                                data-testid={`btn-view-list-${list.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/pr/guest-lists?eventId=${id}&listId=${list.id}&add=true`)}
                                data-testid={`btn-add-to-list-${list.id}`}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Nessuna Lista</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crea una lista ospiti per questo evento
                      </p>
                      <Button onClick={() => setShowCreateListDialog(true)} data-testid="btn-create-first-list">
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Lista
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tables">
            <div className="space-y-6">
              {(() => {
                const pendingReservations = e4uReservations.filter((r: any) => r.status === 'pending');
                const approvedReservations = e4uReservations.filter((r: any) => r.status === 'approved' || r.status === 'confirmed');
                
                return (
                  <>
                    {(e4uTableTypes.length > 0 || pendingReservations.length > 0) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <div className="text-2xl font-bold text-purple-400">{e4uTableTypes.length || tables.length}</div>
                          <div className="text-sm text-muted-foreground">Tipologie Tavoli</div>
                        </div>
                        <div className="p-4 rounded-lg bg-background/50 border">
                          <div className="text-2xl font-bold">{bookedTables}/{tables.length}</div>
                          <div className="text-sm text-muted-foreground">Prenotati</div>
                        </div>
                        {pendingReservations.length > 0 && (
                          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="text-2xl font-bold text-amber-400">{pendingReservations.length}</div>
                            <div className="text-sm text-muted-foreground">In Attesa</div>
                          </div>
                        )}
                        <div className="p-4 rounded-lg bg-background/50 border">
                          <div className="text-2xl font-bold text-emerald-400">{approvedReservations.length}</div>
                          <div className="text-sm text-muted-foreground">Confermate</div>
                        </div>
                      </div>
                    )}

                    <Card className="glass-card">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="flex items-center gap-2">
                            <Armchair className="h-5 w-5 text-purple-400" />
                            Tipologie Tavoli
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={() => setShowCreateTableTypeDialog(true)} 
                              size="sm"
                              data-testid="btn-create-table-type"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Nuova Tipologia
                            </Button>
                            <Button onClick={() => navigate(`/pr/tables?eventId=${id}`)} variant="outline" size="sm" data-testid="btn-manage-tables">
                              Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(e4uTableTypes.length > 0 || tables.length > 0) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(e4uTableTypes.length > 0 ? e4uTableTypes : Array.from(new Set(tables.map(t => t.tableType))).map(type => ({
                              id: type,
                              name: type,
                              totalQuantity: tables.filter(t => t.tableType === type).length,
                              reserved: bookings.filter(b => tables.find(t => t.id === b.tableId && t.tableType === type) && b.status !== 'cancelled').length,
                            }))).map((tableType: any) => {
                              const available = (tableType.totalQuantity || 0) - (tableType.reserved || 0);
                              const availablePercent = tableType.totalQuantity > 0 ? (available / tableType.totalQuantity) * 100 : 0;

                              return (
                                <div 
                                  key={tableType.id} 
                                  className="p-4 rounded-lg bg-background/50 border hover:border-purple-500/50 transition-colors"
                                  data-testid={`table-type-${tableType.id}`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium capitalize">{tableType.name}</h4>
                                    {tableType.price && (
                                      <Badge className="bg-purple-500/20 text-purple-400">€{tableType.price}</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    {tableType.maxGuests && <span>{tableType.maxGuests} ospiti max • </span>}
                                    <span className={available > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {available} disponibili
                                    </span> / {tableType.totalQuantity} totali
                                  </div>
                                  <Progress value={100 - availablePercent} className="h-1.5" />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Armchair className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="font-semibold mb-2">Nessuna Tipologia</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Crea le tipologie di tavoli per questo evento
                            </p>
                            <Button onClick={() => setShowCreateTableTypeDialog(true)} data-testid="btn-create-first-table-type">
                              <Plus className="h-4 w-4 mr-2" />
                              Crea Tipologia
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {pendingReservations.length > 0 && (
                      <Card className="glass-card border-amber-500/30">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-amber-400">
                            <Clock className="h-5 w-5" />
                            Prenotazioni in Attesa ({pendingReservations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {pendingReservations.map((reservation: any) => (
                              <div 
                                key={reservation.id}
                                className="flex items-center justify-between gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
                                data-testid={`pending-reservation-${reservation.id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{reservation.customerName}</span>
                                    <Badge variant="secondary">{reservation.tableTypeName || reservation.tableType}</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {reservation.guestsCount} ospiti • {reservation.phone || reservation.email || 'N/D'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => approveReservationMutation.mutate(reservation.id)}
                                    disabled={approveReservationMutation.isPending}
                                    data-testid={`btn-approve-${reservation.id}`}
                                  >
                                    {approveReservationMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                    )}
                                    Approva
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => rejectReservationMutation.mutate({ reservationId: reservation.id })}
                                    disabled={rejectReservationMutation.isPending}
                                    data-testid={`btn-reject-${reservation.id}`}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Rifiuta
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {approvedReservations.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            Prenotazioni Confermate ({approvedReservations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {approvedReservations.slice(0, 5).map((reservation: any) => (
                              <div 
                                key={reservation.id}
                                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background/50 border"
                                data-testid={`approved-reservation-${reservation.id}`}
                              >
                                <div>
                                  <span className="font-medium">{reservation.customerName}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {reservation.guestsCount} ospiti • {reservation.tableTypeName || reservation.tableType}
                                  </span>
                                </div>
                                <Badge className="bg-emerald-500/20 text-emerald-400">Confermata</Badge>
                              </div>
                            ))}
                            {approvedReservations.length > 5 && (
                              <Button variant="ghost" className="w-full" onClick={() => navigate(`/pr/tables?eventId=${id}`)}>
                                Vedi tutte ({approvedReservations.length})
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="staff">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/30" data-testid="stat-staff-count">
                  <div className="text-2xl font-bold text-teal-400">{e4uStaff.length}</div>
                  <div className="text-sm text-muted-foreground">Staff Attivi</div>
                </div>
              </div>

              {/* Staff Section */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-teal-400" />
                      Staff
                    </CardTitle>
                    <Button 
                      onClick={() => setShowAssignStaffDialog(true)} 
                      size="sm"
                      data-testid="btn-assign-staff"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assegna Staff
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {e4uStaff.length > 0 ? (
                    <div className="space-y-3">
                      {e4uStaff.map((staff: any) => {
                        const staffUser = users.find(u => u.id === staff.userId);
                        const staffPrs = e4uPr.filter((pr: any) => pr.staffUserId === staff.userId);
                        
                        return (
                          <div 
                            key={staff.id} 
                            className="p-4 rounded-lg bg-background/50 border hover:border-teal-500/50 transition-colors"
                            data-testid={`staff-item-${staff.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-medium">
                                  {staffUser?.firstName?.[0]}{staffUser?.lastName?.[0]}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : 'Utente sconosciuto'}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {staff.canManageLists && (
                                      <Badge variant="secondary" className="text-xs">Liste</Badge>
                                    )}
                                    {staff.canManageTables && (
                                      <Badge variant="secondary" className="text-xs">Tavoli</Badge>
                                    )}
                                    {staff.canCreatePr && (
                                      <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400">Crea PR</Badge>
                                    )}
                                    {staff.canApproveTables && (
                                      <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">Approva Tavoli</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeStaffMutation.mutate(staff.id)}
                                disabled={removeStaffMutation.isPending}
                                data-testid={`btn-remove-staff-${staff.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* PR under this staff */}
                            {staffPrs.length > 0 && (
                              <div className="mt-3 ml-12 space-y-2">
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Megaphone className="h-3 w-3" />
                                  PR gestiti ({staffPrs.length})
                                </div>
                                {staffPrs.map((pr: any) => {
                                  const prUser = users.find(u => u.id === pr.userId);
                                  return (
                                    <div 
                                      key={pr.id}
                                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-orange-500/5 border border-orange-500/20"
                                      data-testid={`staff-pr-${pr.id}`}
                                    >
                                      <span className="text-sm">
                                        {prUser ? `${prUser.firstName} ${prUser.lastName}` : 'PR sconosciuto'}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {pr.canAddToLists && <Badge variant="outline" className="text-xs">Liste</Badge>}
                                        {pr.canProposeTables && <Badge variant="outline" className="text-xs">Tavoli</Badge>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Nessuno Staff</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Assegna membri dello staff a questo evento
                      </p>
                      <Button onClick={() => setShowAssignStaffDialog(true)} data-testid="btn-assign-first-staff">
                        <Plus className="h-4 w-4 mr-2" />
                        Assegna Staff
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pr">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30" data-testid="stat-pr-count">
                  <div className="text-2xl font-bold text-orange-400">{e4uPr.length}</div>
                  <div className="text-sm text-muted-foreground">PR Attivi</div>
                </div>
              </div>

              {/* PR Section */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-orange-400" />
                      PR
                    </CardTitle>
                    <Button 
                      onClick={() => setShowAssignPrDialog(true)} 
                      size="sm"
                      data-testid="btn-assign-pr"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assegna PR
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {e4uPr.length > 0 ? (
                    <div className="space-y-3">
                      {e4uPr.map((prData: any) => {
                        const pr = prData.assignment || prData;
                        const prUser = prData.user || users.find(u => u.id === pr.userId);
                        const supervisorUser = pr.staffUserId ? users.find(u => u.id === pr.staffUserId) : null;
                        const displayName = prUser 
                          ? (prUser.firstName && prUser.lastName 
                              ? `${prUser.firstName} ${prUser.lastName}` 
                              : prUser.email || 'Utente sconosciuto')
                          : 'Utente sconosciuto';
                        const initials = prUser?.firstName?.[0] || prUser?.email?.[0]?.toUpperCase() || '?';
                        const initials2 = prUser?.lastName?.[0] || '';
                        
                        return (
                          <div 
                            key={pr.id} 
                            className="flex items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border hover:border-orange-500/50 transition-colors"
                            data-testid={`pr-item-${pr.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-medium">
                                {initials}{initials2}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {displayName}
                                </div>
                                {supervisorUser && (
                                  <div className="text-xs text-muted-foreground">
                                    Supervisore: {supervisorUser.firstName} {supervisorUser.lastName}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {pr.canAddToLists && (
                                    <Badge variant="secondary" className="text-xs">Liste</Badge>
                                  )}
                                  {pr.canProposeTables && (
                                    <Badge variant="secondary" className="text-xs">Tavoli</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removePrMutation.mutate(pr.id)}
                              disabled={removePrMutation.isPending}
                              data-testid={`btn-remove-pr-${pr.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Nessun PR</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Assegna PR a questo evento
                      </p>
                      <Button onClick={() => setShowAssignPrDialog(true)} data-testid="btn-assign-first-pr">
                        <Plus className="h-4 w-4 mr-2" />
                        Assegna PR
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="links">
            <div className="space-y-6">
              {/* Event Link Section */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      Link Evento
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Gestisci il link pubblico per l'acquisto biglietti
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Link Display */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Link Biglietti</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 rounded-lg bg-background/50 border font-mono text-sm break-all">
                        {`${window.location.origin}/e/${event.id.slice(0, 8)}`}
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/e/${event.id.slice(0, 8)}`);
                          toast({ title: "Link copiato!", description: "Il link è stato copiato negli appunti" });
                        }}
                        data-testid="btn-copy-event-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => window.open(`/e/${event.id.slice(0, 8)}`, '_blank')}
                        data-testid="btn-open-event-link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Link Activation Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {event.isPublic ? (
                          <Unlock className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        Link Attivo
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.isPublic 
                          ? "Il link è attivo e gli utenti possono acquistare biglietti" 
                          : "Il link è disattivato e non accessibile al pubblico"}
                      </p>
                    </div>
                    <Switch
                      checked={event.isPublic || false}
                      onCheckedChange={async (checked) => {
                        try {
                          await apiRequest('PATCH', `/api/events/${event.id}`, { isPublic: checked });
                          queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
                          toast({ 
                            title: checked ? "Link attivato" : "Link disattivato",
                            description: checked 
                              ? "Gli utenti possono ora accedere alla pagina dell'evento" 
                              : "Il link non è più accessibile al pubblico"
                          });
                        } catch (error: any) {
                          toast({ 
                            title: "Errore", 
                            description: error.message || "Impossibile aggiornare lo stato del link",
                            variant: "destructive"
                          });
                        }
                      }}
                      data-testid="switch-event-public"
                    />
                  </div>

                  {/* Additional Info */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Ticket className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-medium text-sm">Pagina Biglietti</div>
                        <p className="text-sm text-muted-foreground">
                          Quando attivato, questo link porta a una pagina dove gli utenti possono visualizzare le informazioni sull'evento e acquistare biglietti online.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="access">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30" data-testid="stat-access-scanner-count">
                  <div className="text-2xl font-bold text-emerald-400">{e4uScanners.length}</div>
                  <div className="text-sm text-muted-foreground">Scanner Attivi</div>
                </div>
              </div>

              {/* Scanner Section */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-emerald-400" />
                      Scanner
                    </CardTitle>
                    <Button 
                      onClick={() => setShowAssignScannerDialog(true)} 
                      size="sm"
                      data-testid="btn-assign-scanner"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assegna Scanner
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {e4uScanners.length > 0 ? (
                    <div className="space-y-3">
                      {e4uScanners.map((scanner: any) => {
                        const scannerUser = scanner.user || users.find(u => u.id === (scanner.scanner?.userId || scanner.userId));
                        const scannerData = scanner.scanner || scanner;
                        const sectorDisplay = getScannerSectorDisplay(scanner);
                        
                        return (
                          <div 
                            key={scannerData.id} 
                            className="flex items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border hover:border-emerald-500/50 transition-colors"
                            data-testid={`scanner-item-${scannerData.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-medium">
                                {scannerUser?.firstName?.[0]}{scannerUser?.lastName?.[0]}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {scannerUser ? `${scannerUser.firstName} ${scannerUser.lastName}` : 'Utente sconosciuto'}
                                </div>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {scannerData.canScanLists && (
                                    <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-400">Liste</Badge>
                                  )}
                                  {scannerData.canScanTables && (
                                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">Tavoli</Badge>
                                  )}
                                  {scannerData.canScanTickets && (
                                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">Biglietti</Badge>
                                  )}
                                </div>
                                {scannerData.canScanTickets && ticketedEvent?.sectors && ticketedEvent.sectors.length > 0 && (
                                  <div className="mt-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs cursor-pointer ${sectorDisplay.color}`}
                                      onClick={() => openScannerAccessDialog(scanner)}
                                      data-testid={`badge-scanner-sectors-${scannerData.id}`}
                                    >
                                      {sectorDisplay.label}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {scannerData.canScanTickets && ticketedEvent?.sectors && ticketedEvent.sectors.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openScannerAccessDialog(scanner)}
                                  data-testid={`button-configure-scanner-access-${scannerData.id}`}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Configura Accesso
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeScannerMutation.mutate(scannerData.id)}
                                disabled={removeScannerMutation.isPending}
                                data-testid={`btn-remove-scanner-${scannerData.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Nessuno Scanner</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Assegna addetti scanner a questo evento
                      </p>
                      <Button onClick={() => setShowAssignScannerDialog(true)} data-testid="btn-assign-first-scanner">
                        <Plus className="h-4 w-4 mr-2" />
                        Assegna Scanner
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-400" />
                    Inventario Evento
                  </CardTitle>
                  <Button onClick={() => navigate(`/events/${id}`)} variant="outline" size="sm">
                    Gestisci Stock <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-indigo-400">{eventStocks.length}</div>
                    <div className="text-sm text-muted-foreground">Prodotti</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-emerald-400">{eventStations.length}</div>
                    <div className="text-sm text-muted-foreground">Postazioni</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-amber-400">
                      {eventStocks.reduce((acc, s) => acc + Number(s.quantity || 0), 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Unità Totali</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-cyan-400">
                      {new Set(eventStations.flatMap(s => s.bartenderIds || [])).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Baristi</div>
                  </div>
                </div>
                {eventStocks.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-2">Nessun Prodotto</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Trasferisci prodotti dal magazzino all'evento
                    </p>
                    <Button onClick={() => navigate(`/events/${id}`)}>
                      Trasferisci Stock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-amber-400" />
                    Incassi e Finanze
                  </CardTitle>
                  <Button onClick={() => navigate(`/reports?eventId=${id}`)} variant="outline" size="sm">
                    Report Completo <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <div className="text-3xl font-bold text-amber-400">€{totalRevenue.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Incasso Totale</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-blue-400">
                      €{Number(ticketedEvent?.totalRevenue || 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Biglietti</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-purple-400">
                      €{bookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + Number(b.depositPaid || 0), 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Caparre Tavoli</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-emerald-400">--</div>
                    <div className="text-sm text-muted-foreground">Consumazioni</div>
                  </div>
                </div>
                <div className="text-center py-8 border-t">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Visualizza il report completo per analisi dettagliate
                  </p>
                  <Button onClick={() => navigate(`/reports?eventId=${id}`)} className="mt-4">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Apri Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                className="p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                data-testid="stats-total-checkins"
              >
                <div className="text-3xl font-bold text-amber-400">
                  {e4uReport?.overview?.totalCheckIns || 0}
                </div>
                <div className="text-sm text-muted-foreground">Totale Ingressi</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30"
                data-testid="stats-checkin-rate"
              >
                <div className="text-3xl font-bold text-orange-400">
                  {e4uReport?.overview?.checkInRate || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Tasso Check-in</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-background/50 border"
                data-testid="stats-list-revenue"
              >
                <div className="text-2xl font-bold text-cyan-400">
                  €{(e4uReport?.overview?.listRevenue || 0).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Incasso Liste</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-background/50 border"
                data-testid="stats-table-revenue"
              >
                <div className="text-2xl font-bold text-purple-400">
                  €{(e4uReport?.overview?.tableRevenue || 0).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Incasso Tavoli</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass-card" data-testid="table-staff-performance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-400" />
                    Performance Staff
                  </CardTitle>
                  <CardDescription>Statistiche per ogni staff assegnato</CardDescription>
                </CardHeader>
                <CardContent>
                  {e4uReport?.staffPerformance && e4uReport.staffPerformance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Staff</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Liste</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Persone</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Tavoli Prop.</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Tavoli Appr.</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Check-in PR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e4uReport.staffPerformance.map((staff: any) => (
                            <tr key={staff.staffId} className="border-b border-border/50 hover:bg-white/5">
                              <td className="py-2 px-2 font-medium">{staff.staffName}</td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                                  {staff.listsCreated}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                                  {staff.entriesAdded}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                  {staff.tablesProposed}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                                  {staff.tablesApproved}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                                  {staff.prCheckIns}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-white/5 font-semibold">
                            <td className="py-2 px-2">Totale</td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-cyan-500/30 text-cyan-300">
                                {e4uReport.staffPerformance.reduce((acc: number, s: any) => acc + s.listsCreated, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-blue-500/30 text-blue-300">
                                {e4uReport.staffPerformance.reduce((acc: number, s: any) => acc + s.entriesAdded, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-purple-500/30 text-purple-300">
                                {e4uReport.staffPerformance.reduce((acc: number, s: any) => acc + s.tablesProposed, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-emerald-500/30 text-emerald-300">
                                {e4uReport.staffPerformance.reduce((acc: number, s: any) => acc + s.tablesApproved, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-amber-500/30 text-amber-300">
                                {e4uReport.staffPerformance.reduce((acc: number, s: any) => acc + s.prCheckIns, 0)}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">Nessuno staff assegnato</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card" data-testid="table-pr-performance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-400" />
                    Performance PR
                  </CardTitle>
                  <CardDescription>Statistiche per ogni PR assegnato</CardDescription>
                </CardHeader>
                <CardContent>
                  {e4uReport?.prPerformance && e4uReport.prPerformance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground">PR</th>
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Staff</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">In Lista</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Ingressi</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Tavoli Prop.</th>
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Tavoli Appr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e4uReport.prPerformance.map((pr: any) => (
                            <tr key={pr.prId} className="border-b border-border/50 hover:bg-white/5">
                              <td className="py-2 px-2 font-medium">{pr.prName}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{pr.staffName}</td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                                  {pr.entriesAdded}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                                  {pr.checkIns}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                  {pr.tablesProposed}
                                </Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                                  {pr.tablesApproved}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-white/5 font-semibold">
                            <td className="py-2 px-2">Totale</td>
                            <td className="py-2 px-2">-</td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-cyan-500/30 text-cyan-300">
                                {e4uReport.prPerformance.reduce((acc: number, p: any) => acc + p.entriesAdded, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-emerald-500/30 text-emerald-300">
                                {e4uReport.prPerformance.reduce((acc: number, p: any) => acc + p.checkIns, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-purple-500/30 text-purple-300">
                                {e4uReport.prPerformance.reduce((acc: number, p: any) => acc + p.tablesProposed, 0)}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Badge className="bg-amber-500/30 text-amber-300">
                                {e4uReport.prPerformance.reduce((acc: number, p: any) => acc + p.tablesApproved, 0)}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">Nessun PR assegnato</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                  Check-in per Ora
                </CardTitle>
                <CardDescription>Distribuzione degli ingressi durante l'evento</CardDescription>
              </CardHeader>
              <CardContent>
                {e4uReport?.hourlyCheckIns && e4uReport.hourlyCheckIns.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={e4uReport.hourlyCheckIns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="checkInsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="hour" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="checkIns"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#checkInsGradient)"
                          name="Check-in"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">Nessun dato sui check-in disponibile</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Cambio Stato</AlertDialogTitle>
            <AlertDialogDescription>
              {currentTransition && (
                <>Vuoi {currentTransition.label.toLowerCase()} "{event.name}"?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentTransition && changeStatusMutation.mutate(currentTransition.next)}
              disabled={changeStatusMutation.isPending}
              className={`bg-gradient-to-r ${status.gradient}`}
            >
              {changeStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà l'evento "{event?.name}" e tutti i dati correlati (postazioni, scorte, prenotazioni, liste ospiti, ecc.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventMutation.mutate()}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pauseTicketingDialogOpen} onOpenChange={setPauseTicketingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
              <Pause className="h-5 w-5" />
              Pausa Vendite Biglietti
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi sospendere temporaneamente la vendita dei biglietti? Gli utenti non potranno acquistare biglietti finché non riprenderai le vendite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast({
                  title: "Vendite Sospese",
                  description: "La vendita biglietti è stata temporaneamente sospesa",
                });
                setPauseTicketingDialogOpen(false);
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Sospendi Vendite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog 
        open={reportDialogOpen} 
        onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) {
            setTimeout(() => {
              setReportData(null);
              setReportType(null);
            }, 200);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative pr-8">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 rounded-full"
              onClick={() => setReportDialogOpen(false)}
              data-testid="btn-close-report-x"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Chiudi</span>
            </Button>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {reportType === 'C1' ? 'Report C1 - Registro Giornaliero' : 'Report C2 - Riepilogo Evento'}
            </DialogTitle>
            <DialogDescription>
              Evento: {reportData?.eventName || event?.name || 'N/D'} - {reportData?.eventDate ? new Date(reportData.eventDate).toLocaleDateString('it-IT') : event?.startDatetime ? new Date(event.startDatetime).toLocaleDateString('it-IT') : 'N/D'}
            </DialogDescription>
          </DialogHeader>
          
          {reportType === 'C1' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-400">{reportData?.totalTicketsSold || 0}</div>
                    <div className="text-sm text-muted-foreground">Biglietti Venduti</div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-emerald-400">EUR {(reportData?.totalRevenue || 0).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Incasso Totale</div>
                  </CardContent>
                </Card>
              </div>
              
              {reportData?.dailySales?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Vendite per Data</h4>
                  <div className="space-y-2">
                    {reportData.dailySales.map((day: any) => (
                      <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                        <div>
                          <div className="font-medium">{day.date}</div>
                          <div className="text-xs text-muted-foreground">{day.ticketsSold} biglietti</div>
                        </div>
                        <div className="text-right font-bold text-emerald-400">EUR {day.totalAmount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {reportData?.sectors?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Dettaglio Settori</h4>
                  <div className="space-y-2">
                    {reportData.sectors.map((sector: any) => (
                      <div key={sector.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                        <div>
                          <div className="font-medium">{sector.name}</div>
                          <div className="text-xs text-muted-foreground">{sector.soldCount}/{sector.capacity} - EUR {Number(sector.priceIntero || 0).toFixed(2)}/biglietto</div>
                        </div>
                        <div className="text-right font-bold text-emerald-400">EUR {sector.revenue.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'C2' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-background/50">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold">{reportData?.summary?.totalCapacity || 0}</div>
                    <div className="text-xs text-muted-foreground">Capienza</div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-blue-400">{reportData?.summary?.ticketsSold || 0}</div>
                    <div className="text-xs text-muted-foreground">Venduti</div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-rose-400">{reportData?.summary?.ticketsCancelled || 0}</div>
                    <div className="text-xs text-muted-foreground">Annullati</div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-amber-400">{reportData?.summary?.occupancyRate || 0}%</div>
                    <div className="text-xs text-muted-foreground">Occupazione</div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Dati Finanziari</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="text-sm text-muted-foreground">Incasso Lordo</div>
                    <div className="font-bold text-lg">EUR {(reportData?.financials?.grossRevenue || 0).toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="text-sm text-muted-foreground">IVA ({reportData?.financials?.vatRate || 10}%)</div>
                    <div className="font-bold text-lg">EUR {(reportData?.financials?.vatAmount || 0).toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="text-sm text-muted-foreground">Incasso Netto</div>
                    <div className="font-bold text-lg text-emerald-400">EUR {(reportData?.financials?.netRevenue || 0).toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="text-sm text-muted-foreground">Transazioni</div>
                    <div className="font-bold text-lg">{reportData?.financials?.transactionCount || 0}</div>
                  </div>
                </div>
              </div>

              {reportData?.paymentBreakdown?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Metodi di Pagamento</h4>
                  <div className="space-y-2">
                    {reportData.paymentBreakdown.map((payment: any) => (
                      <div key={payment.method} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                        <div>
                          <div className="font-medium capitalize">{payment.method === 'cash' ? 'Contanti' : payment.method === 'card' ? 'Carta' : payment.method}</div>
                          <div className="text-xs text-muted-foreground">{payment.count} transazioni</div>
                        </div>
                        <div className="text-right font-bold">EUR {payment.amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reportData?.sectorBreakdown?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Dettaglio per Settore</h4>
                  <div className="space-y-2">
                    {reportData.sectorBreakdown.map((sector: any) => (
                      <div key={sector.id} className="p-3 rounded-lg bg-background/50 border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium">{sector.name}</div>
                          <Badge variant="secondary">{sector.sectorCode || 'N/D'}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Venduti:</span> {sector.ticketsSold}/{sector.capacity}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lordo:</span> EUR {sector.grossRevenue.toFixed(2)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Netto:</span> EUR {sector.netRevenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} data-testid="btn-close-report">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Nuova Lista Ospiti
            </DialogTitle>
            <DialogDescription>
              Crea una nuova lista ospiti per questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Nome Lista *</Label>
              <Input
                id="list-name"
                placeholder="es. Lista VIP, Lista PR Marco..."
                value={newListData.name}
                onChange={(e) => setNewListData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-list-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="list-capacity">Capienza Max</Label>
                <Input
                  id="list-capacity"
                  type="number"
                  placeholder="es. 100"
                  value={newListData.maxCapacity}
                  onChange={(e) => setNewListData(prev => ({ ...prev, maxCapacity: e.target.value }))}
                  data-testid="input-list-capacity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="list-price">Prezzo Ingresso</Label>
                <Input
                  id="list-price"
                  placeholder="es. 15.00"
                  value={newListData.price}
                  onChange={(e) => setNewListData(prev => ({ ...prev, price: e.target.value }))}
                  data-testid="input-list-price"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateListDialog(false);
                setNewListData({ name: '', maxCapacity: '', price: '' });
              }}
              data-testid="btn-cancel-create-list"
            >
              Annulla
            </Button>
            <Button 
              onClick={() => {
                if (!newListData.name.trim()) {
                  toast({ title: "Errore", description: "Il nome della lista è obbligatorio", variant: "destructive" });
                  return;
                }
                createListMutation.mutate({
                  name: newListData.name,
                  maxCapacity: newListData.maxCapacity ? parseInt(newListData.maxCapacity) : undefined,
                  price: newListData.price || undefined,
                });
              }}
              disabled={createListMutation.isPending}
              data-testid="btn-confirm-create-list"
            >
              {createListMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
              ) : (
                'Crea Lista'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateTableTypeDialog} onOpenChange={setShowCreateTableTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="h-5 w-5 text-purple-400" />
              Nuova Tipologia Tavolo
            </DialogTitle>
            <DialogDescription>
              Crea una nuova tipologia di tavoli per questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="table-type-name">Nome Tipologia *</Label>
              <Input
                id="table-type-name"
                placeholder="es. VIP, Privé, Standard..."
                value={newTableTypeData.name}
                onChange={(e) => setNewTableTypeData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-table-type-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-type-price">Prezzo *</Label>
                <Input
                  id="table-type-price"
                  placeholder="es. 500.00"
                  value={newTableTypeData.price}
                  onChange={(e) => setNewTableTypeData(prev => ({ ...prev, price: e.target.value }))}
                  data-testid="input-table-type-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-type-guests">Ospiti Max *</Label>
                <Input
                  id="table-type-guests"
                  type="number"
                  placeholder="es. 8"
                  value={newTableTypeData.maxGuests}
                  onChange={(e) => setNewTableTypeData(prev => ({ ...prev, maxGuests: e.target.value }))}
                  data-testid="input-table-type-guests"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-type-quantity">Quantità Totale *</Label>
              <Input
                id="table-type-quantity"
                type="number"
                placeholder="es. 10"
                value={newTableTypeData.totalQuantity}
                onChange={(e) => setNewTableTypeData(prev => ({ ...prev, totalQuantity: e.target.value }))}
                data-testid="input-table-type-quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateTableTypeDialog(false);
                setNewTableTypeData({ name: '', price: '', maxGuests: '', totalQuantity: '' });
              }}
              data-testid="btn-cancel-create-table-type"
            >
              Annulla
            </Button>
            <Button 
              onClick={() => {
                if (!newTableTypeData.name.trim() || !newTableTypeData.price || !newTableTypeData.maxGuests || !newTableTypeData.totalQuantity) {
                  toast({ title: "Errore", description: "Tutti i campi sono obbligatori", variant: "destructive" });
                  return;
                }
                createTableTypeMutation.mutate({
                  name: newTableTypeData.name,
                  price: newTableTypeData.price,
                  maxGuests: parseInt(newTableTypeData.maxGuests),
                  totalQuantity: parseInt(newTableTypeData.totalQuantity),
                });
              }}
              disabled={createTableTypeMutation.isPending}
              data-testid="btn-confirm-create-table-type"
            >
              {createTableTypeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
              ) : (
                'Crea Tipologia'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={showAssignStaffDialog} onOpenChange={setShowAssignStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-400" />
              Assegna Staff
            </DialogTitle>
            <DialogDescription>
              Seleziona un membro dello staff da assegnare a questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-user">Seleziona Utente *</Label>
              <select
                id="staff-user"
                className="w-full h-10 px-3 rounded-md border bg-background"
                value={newStaffData.userId}
                onChange={(e) => setNewStaffData(prev => ({ ...prev, userId: e.target.value }))}
                data-testid="select-staff-user"
              >
                <option value="">Seleziona un utente...</option>
                {users
                  .filter(u => ['staff', 'capo_staff', 'admin', 'super_admin'].includes(u.role))
                  .filter(u => !e4uStaff.some((s: any) => s.userId === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-3">
              <Label>Permessi</Label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Gestione Liste</div>
                  <div className="text-xs text-muted-foreground">Può gestire le liste ospiti</div>
                </div>
                <Switch
                  checked={newStaffData.canManageLists}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canManageLists: checked }))}
                  data-testid="switch-staff-lists"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Gestione Tavoli</div>
                  <div className="text-xs text-muted-foreground">Può gestire i tavoli</div>
                </div>
                <Switch
                  checked={newStaffData.canManageTables}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canManageTables: checked }))}
                  data-testid="switch-staff-tables"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Crea PR</div>
                  <div className="text-xs text-muted-foreground">Può creare e gestire PR</div>
                </div>
                <Switch
                  checked={newStaffData.canCreatePr}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canCreatePr: checked }))}
                  data-testid="switch-staff-create-pr"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Approva Tavoli</div>
                  <div className="text-xs text-muted-foreground">Può approvare prenotazioni tavoli</div>
                </div>
                <Switch
                  checked={newStaffData.canApproveTables}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canApproveTables: checked }))}
                  data-testid="switch-staff-approve-tables"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignStaffDialog(false);
                setNewStaffData({ userId: '', canManageLists: true, canManageTables: true, canCreatePr: false, canApproveTables: false });
              }}
              data-testid="btn-cancel-assign-staff"
            >
              Annulla
            </Button>
            <Button 
              onClick={() => {
                if (!newStaffData.userId) {
                  toast({ title: "Errore", description: "Seleziona un utente", variant: "destructive" });
                  return;
                }
                assignStaffMutation.mutate(newStaffData);
              }}
              disabled={assignStaffMutation.isPending}
              data-testid="btn-confirm-assign-staff"
            >
              {assignStaffMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Assegnazione...</>
              ) : (
                'Assegna Staff'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign PR Dialog */}
      <Dialog open={showAssignPrDialog} onOpenChange={setShowAssignPrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-400" />
              Assegna PR
            </DialogTitle>
            <DialogDescription>
              Seleziona un PR da assegnare a questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pr-user">Seleziona PR *</Label>
              <select
                id="pr-user"
                className="w-full h-10 px-3 rounded-md border bg-background"
                value={newPrData.userId}
                onChange={(e) => setNewPrData(prev => ({ ...prev, userId: e.target.value }))}
                data-testid="select-pr-user"
              >
                <option value="">Seleziona un utente...</option>
                {users
                  .filter(u => u.role === 'pr' || u.role === 'staff' || u.role === 'capo_staff')
                  .filter(u => !e4uPr.some((p: any) => p.userId === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-supervisor">Supervisore Staff (opzionale)</Label>
              <select
                id="pr-supervisor"
                className="w-full h-10 px-3 rounded-md border bg-background"
                value={newPrData.staffUserId}
                onChange={(e) => setNewPrData(prev => ({ ...prev, staffUserId: e.target.value }))}
                data-testid="select-pr-supervisor"
              >
                <option value="">Nessun supervisore</option>
                {e4uStaff.map((staff: any) => {
                  const staffUser = users.find(u => u.id === staff.userId);
                  return (
                    <option key={staff.id} value={staff.userId}>
                      {staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : 'Staff sconosciuto'}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-3">
              <Label>Permessi</Label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Aggiungere alle Liste</div>
                  <div className="text-xs text-muted-foreground">Può aggiungere ospiti alle liste</div>
                </div>
                <Switch
                  checked={newPrData.canAddToLists}
                  onCheckedChange={(checked) => setNewPrData(prev => ({ ...prev, canAddToLists: checked }))}
                  data-testid="switch-pr-lists"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Proporre Tavoli</div>
                  <div className="text-xs text-muted-foreground">Può proporre prenotazioni tavoli</div>
                </div>
                <Switch
                  checked={newPrData.canProposeTables}
                  onCheckedChange={(checked) => setNewPrData(prev => ({ ...prev, canProposeTables: checked }))}
                  data-testid="switch-pr-tables"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignPrDialog(false);
                setNewPrData({ userId: '', staffUserId: '', canAddToLists: true, canProposeTables: false });
              }}
              data-testid="btn-cancel-assign-pr"
            >
              Annulla
            </Button>
            <Button 
              onClick={() => {
                if (!newPrData.userId) {
                  toast({ title: "Errore", description: "Seleziona un utente", variant: "destructive" });
                  return;
                }
                assignPrMutation.mutate({
                  userId: newPrData.userId,
                  staffUserId: newPrData.staffUserId || undefined,
                  canAddToLists: newPrData.canAddToLists,
                  canProposeTables: newPrData.canProposeTables,
                });
              }}
              disabled={assignPrMutation.isPending}
              data-testid="btn-confirm-assign-pr"
            >
              {assignPrMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Assegnazione...</>
              ) : (
                'Assegna PR'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Scanner Dialog */}
      <Dialog open={showAssignScannerDialog} onOpenChange={setShowAssignScannerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-400" />
              Assegna Scanner
            </DialogTitle>
            <DialogDescription>
              Seleziona un addetto scanner per questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scanner-user">Seleziona Utente *</Label>
              <select
                id="scanner-user"
                className="w-full h-10 px-3 rounded-md border bg-background"
                value={newScannerData.userId}
                onChange={(e) => setNewScannerData(prev => ({ ...prev, userId: e.target.value }))}
                data-testid="select-scanner-user"
              >
                <option value="">Seleziona un utente...</option>
                {users
                  .filter(u => !e4uScanners.some((s: any) => s.userId === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-3">
              <Label>Permessi di Scansione</Label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Scansione Liste</div>
                  <div className="text-xs text-muted-foreground">Può scansionare ospiti delle liste</div>
                </div>
                <Switch
                  checked={newScannerData.canScanLists}
                  onCheckedChange={(checked) => setNewScannerData(prev => ({ ...prev, canScanLists: checked }))}
                  data-testid="switch-scanner-lists"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Scansione Tavoli</div>
                  <div className="text-xs text-muted-foreground">Può scansionare prenotazioni tavoli</div>
                </div>
                <Switch
                  checked={newScannerData.canScanTables}
                  onCheckedChange={(checked) => setNewScannerData(prev => ({ ...prev, canScanTables: checked }))}
                  data-testid="switch-scanner-tables"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                <div>
                  <div className="font-medium text-sm">Scansione Biglietti</div>
                  <div className="text-xs text-muted-foreground">Può scansionare biglietti SIAE</div>
                </div>
                <Switch
                  checked={newScannerData.canScanTickets}
                  onCheckedChange={(checked) => setNewScannerData(prev => ({ ...prev, canScanTickets: checked }))}
                  data-testid="switch-scanner-tickets"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignScannerDialog(false);
                setNewScannerData({ userId: '', canScanLists: true, canScanTables: true, canScanTickets: true });
              }}
              data-testid="btn-cancel-assign-scanner"
            >
              Annulla
            </Button>
            <Button 
              onClick={() => {
                if (!newScannerData.userId) {
                  toast({ title: "Errore", description: "Seleziona un utente", variant: "destructive" });
                  return;
                }
                assignScannerMutation.mutate(newScannerData);
              }}
              disabled={assignScannerMutation.isPending}
              data-testid="btn-confirm-assign-scanner"
            >
              {assignScannerMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Assegnazione...</>
              ) : (
                'Assegna Scanner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner Access Configuration Dialog */}
      <Dialog open={showScannerAccessDialog} onOpenChange={setShowScannerAccessDialog}>
        <DialogContent data-testid="dialog-scanner-access">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-400" />
              Configura Accesso Scanner
            </DialogTitle>
            <DialogDescription>
              {selectedScannerForAccess && (
                <>
                  Configura i settori che{' '}
                  <span className="font-medium">
                    {selectedScannerForAccess.user?.firstName || ''} {selectedScannerForAccess.user?.lastName || ''}
                  </span>{' '}
                  può scansionare
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
              <div>
                <div className="font-medium text-sm">Accesso a tutti i settori</div>
                <div className="text-xs text-muted-foreground">
                  Può scansionare biglietti di tutti i settori
                </div>
              </div>
              <Switch
                checked={scannerAccessAllSectors}
                onCheckedChange={(checked) => {
                  setScannerAccessAllSectors(checked);
                  if (checked) {
                    setScannerAccessSelectedSectors([]);
                  }
                }}
                data-testid="switch-all-sectors"
              />
            </div>
            
            {!scannerAccessAllSectors && ticketedEvent?.sectors && ticketedEvent.sectors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Seleziona i settori autorizzati</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllSectors(true)}
                      className="text-xs"
                    >
                      Seleziona tutti
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllSectors(false)}
                      className="text-xs"
                    >
                      Deseleziona
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ticketedEvent.sectors.map((sector) => (
                    <div
                      key={sector.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border cursor-pointer hover:bg-background/70 transition-colors"
                      onClick={() => toggleSectorSelection(sector.id)}
                    >
                      <input
                        type="checkbox"
                        checked={scannerAccessSelectedSectors.includes(sector.id)}
                        onChange={() => toggleSectorSelection(sector.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        data-testid={`checkbox-sector-${sector.id}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{sector.name}</div>
                        {sector.priceIntero && (
                          <div className="text-xs text-muted-foreground">
                            €{Number(sector.priceIntero).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {scannerAccessSelectedSectors.length > 0 && (
                  <div className="text-xs text-muted-foreground pt-2">
                    {scannerAccessSelectedSectors.length} settori selezionati
                  </div>
                )}
              </div>
            )}
            
            {!scannerAccessAllSectors && (!ticketedEvent?.sectors || ticketedEvent.sectors.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Nessun settore configurato per questo evento.</p>
                <p className="text-xs mt-1">Configura i settori nella sezione Biglietti per abilitare le restrizioni.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScannerAccessDialog(false);
                setSelectedScannerForAccess(null);
              }}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveScannerAccess}
              disabled={updateScannerAccessMutation.isPending || (!scannerAccessAllSectors && scannerAccessSelectedSectors.length === 0)}
              data-testid="button-save-scanner-access"
            >
              {updateScannerAccessMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
              ) : (
                'Salva'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
