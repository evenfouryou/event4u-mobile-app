import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  Edit2,
  Trash2,
  Eye,
  Hash,
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
  Banknote,
  Send,
  ChevronDown,
  Repeat,
  UserCog,
  ShoppingCart,
  Upload,
  Palette,
  XCircle,
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
  SiaeNameChange,
  SiaeResale,
  SiaeCustomer,
  User,
  Product,
  Location as LocationType,
} from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sectorFormSchema = z.object({
  name: z.string().min(1, "Nome biglietto richiesto"),
  sectorCode: z.string().min(1, "Codice settore richiesto"),
  capacity: z.number().min(1, "Quantità richiesta"),
  isNumbered: z.boolean().default(false),
  ticketType: z.enum(['INT', 'RID', 'OMA']),
  price: z.string().default("0"),
  ddp: z.string().default("0"),
  ivaRate: z.string().default("22"),
  sortOrder: z.number().default(0),
  active: z.boolean().default(true),
});
type SectorFormData = z.infer<typeof sectorFormSchema>;

const subscriptionTypeFormSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  turnType: z.string().min(1, "Tipo turno obbligatorio"),
  eventsCount: z.number().min(1, "Almeno 1 evento"),
  price: z.string().min(1, "Prezzo obbligatorio"),
  ivaRate: z.string().default("22"),
  maxQuantity: z.number().optional(),
});
type SubscriptionTypeFormData = z.infer<typeof subscriptionTypeFormSchema>;

const activateTicketingSchema = z.object({
  genreCode: z.string().min(1, "Genere evento richiesto"),
  taxType: z.string().min(1),
  totalCapacity: z.number().min(1),
  maxTicketsPerUser: z.number().min(1),
  ivaPreassolta: z.string().default("N"),
  requiresNominative: z.boolean().default(false),
  allowsChangeName: z.boolean().default(false),
  allowsResale: z.boolean().default(false),
});
type ActivateTicketingFormData = z.infer<typeof activateTicketingSchema>;

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
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
      <span>{isLive ? 'LIVE' : 'OFFLINE'}</span>
    </div>
  );
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

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
  const handleClick = useCallback(() => {
    if (onClick) {
      triggerHaptic('light');
      onClick();
    }
  }, [onClick]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={springConfig}
      onClick={handleClick}
      className={`glass-card p-4 min-h-[120px] active:bg-white/5 ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground mb-0.5">{title}</div>
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
    default: 'bg-white/5 active:bg-white/15 text-foreground',
    success: 'bg-emerald-500/20 active:bg-emerald-500/40 text-emerald-400',
    warning: 'bg-amber-500/20 active:bg-amber-500/40 text-amber-400',
    danger: 'bg-red-500/20 active:bg-red-500/40 text-red-400',
  };

  const handleClick = useCallback(() => {
    if (!disabled) {
      triggerHaptic('light');
      onClick();
    }
  }, [disabled, onClick]);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={springConfig}
      onClick={handleClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-2 p-4 min-h-[72px] min-w-[72px] rounded-2xl transition-colors ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-testid={testId}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </motion.button>
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
    <div className="flex items-start gap-3 py-2.5 min-h-[56px]">
      <div className={`p-2 rounded-xl bg-white/5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{item.message}</p>
        <div className="flex items-center gap-2 mt-1">
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
      <CardHeader className="pb-2 px-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Flusso Ingressi
        </CardTitle>
        <CardDescription>Ingressi per fascia oraria</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <LogIn className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nessun check-in registrato</p>
            </div>
          </div>
        ) : (
          <div className="h-[200px]">
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
  const isMobile = useIsMobile();
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

  // Biglietti drill-down state
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<SiaeTicket | null>(null);
  const [showTicketDetailSheet, setShowTicketDetailSheet] = useState(false);

  // Cambio nominativo / Rivendita collapsible sections
  const [nameChangesExpanded, setNameChangesExpanded] = useState(false);
  const [resalesExpanded, setResalesExpanded] = useState(false);

  // Transazioni state
  const [transactionPaymentMethodFilter, setTransactionPaymentMethodFilter] = useState<string>("all");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>("all");
  const [transactionsDisplayLimit, setTransactionsDisplayLimit] = useState(20);

  // Sector creation dialog state
  const [isSectorDialogOpen, setIsSectorDialogOpen] = useState(false);

  // Edit Sector dialog state
  const [isEditSectorDialogOpen, setIsEditSectorDialogOpen] = useState(false);
  const [editingSectorData, setEditingSectorData] = useState<any>(null);

  // Subscription type creation dialog state
  const [isSubscriptionTypeDialogOpen, setIsSubscriptionTypeDialogOpen] = useState(false);

  // Edit Subscription Type dialog state
  const [isEditSubscriptionTypeDialogOpen, setIsEditSubscriptionTypeDialogOpen] = useState(false);
  const [editingSubscriptionTypeData, setEditingSubscriptionTypeData] = useState<any>(null);

  // Activate Ticketing dialog state
  const [isActivateTicketingOpen, setIsActivateTicketingOpen] = useState(false);
  const [pendingSubscriptionTypes, setPendingSubscriptionTypes] = useState<Array<{
    name: string;
    turnType: string;
    eventsCount: number;
    price: string;
  }>>([]);
  const [showSubTypeForm, setShowSubTypeForm] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");
  const [newSubTypeTurnType, setNewSubTypeTurnType] = useState("F");
  const [newSubTypeEventsCount, setNewSubTypeEventsCount] = useState(1);
  const [newSubTypePrice, setNewSubTypePrice] = useState("");

  // Reset pagination when transaction filters change
  useEffect(() => {
    setTransactionsDisplayLimit(20);
  }, [transactionPaymentMethodFilter, transactionStatusFilter]);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: userFeatures } = useQuery<{ beverageEnabled?: boolean }>({
    queryKey: ['/api/user-features/current/my'],
    enabled: !!user,
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

  const { data: siaeTransactions = [], isLoading: transactionsLoading } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'transactions'],
    enabled: !!ticketedEvent?.id,
  });

  // Biglietti Emessi query
  const { data: siaeTickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'tickets'],
    enabled: !!ticketedEvent?.id,
  });

  // Subscription Types query
  const { data: subscriptionTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'subscription-types'],
    enabled: !!ticketedEvent?.id,
  });

  // Name Changes query (cambio nominativo)
  const { data: nameChanges = [] } = useQuery<SiaeNameChange[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'name-changes'],
    enabled: !!ticketedEvent?.id && ticketedEvent?.allowsChangeName,
  });

  // Resales query (rivendita)
  const { data: resales = [] } = useQuery<SiaeResale[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'resales'],
    enabled: !!ticketedEvent?.id && ticketedEvent?.allowsResale,
  });

  // Sector codes for the new sector dialog
  const { data: sectorCodes } = useQuery<any[]>({
    queryKey: ['/api/siae/sector-codes'],
    enabled: isSectorDialogOpen,
  });

  // Genres for activate ticketing dialog (TAB.1)
  const { data: genres } = useQuery<any[]>({
    queryKey: ['/api/siae/event-genres'],
    enabled: isActivateTicketingOpen,
  });

  // Activate ticketing form
  const activateTicketingForm = useForm<ActivateTicketingFormData>({
    resolver: zodResolver(activateTicketingSchema),
    defaultValues: {
      genreCode: "",
      taxType: "S",
      totalCapacity: 500,
      maxTicketsPerUser: 10,
      ivaPreassolta: "N",
      requiresNominative: false,
      allowsChangeName: false,
      allowsResale: false,
    },
  });

  // Reset activate ticketing form when dialog closes
  useEffect(() => {
    if (!isActivateTicketingOpen) {
      activateTicketingForm.reset();
      setPendingSubscriptionTypes([]);
      setShowSubTypeForm(false);
      setNewSubTypeName("");
      setNewSubTypeTurnType("F");
      setNewSubTypeEventsCount(1);
      setNewSubTypePrice("");
    }
  }, [isActivateTicketingOpen]);

  // Activate ticketing mutation
  const activateTicketingMutation = useMutation({
    mutationFn: async (data: ActivateTicketingFormData) => {
      const response = await apiRequest("POST", "/api/siae/ticketed-events", {
        ...data,
        eventId: id,
        companyId: user?.companyId,
        ticketingStatus: "draft",
      });
      const newEvent = await response.json();
      
      for (const subType of pendingSubscriptionTypes) {
        await apiRequest("POST", `/api/siae/ticketed-events/${newEvent.id}/subscription-types`, {
          ...subType,
          ivaRate: "22",
        });
      }
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      setIsActivateTicketingOpen(false);
      setPendingSubscriptionTypes([]);
      activateTicketingForm.reset();
      toast({ title: "Biglietteria SIAE attivata con successo" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const onSubmitActivateTicketing = (data: ActivateTicketingFormData) => {
    activateTicketingMutation.mutate(data);
  };

  // Sector creation form
  const sectorForm = useForm<SectorFormData>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      name: "",
      sectorCode: "",
      capacity: 100,
      isNumbered: false,
      ticketType: "INT",
      price: "0",
      ddp: "0",
      ivaRate: "22",
      sortOrder: 0,
      active: true,
    },
  });

  const watchedTicketType = sectorForm.watch("ticketType");

  // Auto-set price to 0 when Omaggio is selected
  useEffect(() => {
    if (watchedTicketType === 'OMA') {
      sectorForm.setValue('price', '0');
    }
  }, [watchedTicketType, sectorForm]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isSectorDialogOpen) {
      sectorForm.reset();
    }
  }, [isSectorDialogOpen, sectorForm]);

  const createSectorMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/siae/event-sectors`, { ...data, ticketedEventId: ticketedEvent?.id });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      setIsSectorDialogOpen(false);
      sectorForm.reset();
      toast({ title: "Biglietto creato con successo" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const onSubmitSector = (data: SectorFormData) => {
    const priceValue = data.ticketType === 'OMA' ? '0' : (data.price || '0');
    const submitData = {
      sectorCode: data.sectorCode,
      name: data.name,
      capacity: data.capacity,
      availableSeats: data.capacity,
      isNumbered: data.isNumbered,
      priceIntero: data.ticketType === 'INT' ? priceValue : '0',
      priceRidotto: data.ticketType === 'RID' ? priceValue : '0',
      priceOmaggio: '0',
      prevendita: data.ddp || '0',
      ivaRate: data.ivaRate,
      sortOrder: data.sortOrder,
      active: data.active,
    };
    createSectorMutation.mutate(submitData);
  };

  // Edit Sector form
  const editSectorForm = useForm<SectorFormData>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      name: "",
      sectorCode: "",
      capacity: 100,
      isNumbered: false,
      ticketType: "INT",
      price: "0",
      ddp: "0",
      ivaRate: "22",
      sortOrder: 0,
      active: true,
    },
  });

  const updateSectorMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/siae/event-sectors/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      setIsEditSectorDialogOpen(false);
      toast({ title: "Settore aggiornato" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleEditSector = (sectorId: string | null) => {
    if (!sectorId) return;
    const sector = ticketedEvent?.sectors?.find(s => s.id === sectorId);
    if (sector) {
      setEditingSectorData(sector);
      editSectorForm.reset({
        name: sector.name,
        sectorCode: sector.sectorCode,
        capacity: sector.capacity,
        isNumbered: sector.isNumbered || false,
        ticketType: Number(sector.priceIntero) > 0 ? "INT" : (Number(sector.priceRidotto) > 0 ? "RID" : "OMA"),
        price: String(sector.priceIntero || sector.priceRidotto || "0"),
        ddp: String(sector.prevendita || "0"),
        ivaRate: String(sector.ivaRate || "22"),
        sortOrder: sector.sortOrder || 0,
        active: sector.active !== false,
      });
      setIsEditSectorDialogOpen(true);
    }
  };

  // Subscription type creation form
  const subscriptionTypeForm = useForm<SubscriptionTypeFormData>({
    resolver: zodResolver(subscriptionTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      turnType: "F",
      eventsCount: 1,
      price: "0",
      ivaRate: "22",
      maxQuantity: undefined,
    },
  });

  // Edit Subscription type form
  const editSubscriptionTypeForm = useForm<SubscriptionTypeFormData>({
    resolver: zodResolver(subscriptionTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      turnType: "F",
      eventsCount: 1,
      price: "0",
      ivaRate: "22",
      maxQuantity: undefined,
    },
  });

  // Reset subscription type form when dialog closes
  useEffect(() => {
    if (!isSubscriptionTypeDialogOpen) {
      subscriptionTypeForm.reset();
    }
  }, [isSubscriptionTypeDialogOpen, subscriptionTypeForm]);

  const createSubscriptionTypeMutation = useMutation({
    mutationFn: async (data: SubscriptionTypeFormData) => {
      const response = await apiRequest("POST", `/api/siae/ticketed-events/${ticketedEvent?.id}/subscription-types`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'subscription-types'] });
      setIsSubscriptionTypeDialogOpen(false);
      subscriptionTypeForm.reset();
      toast({ title: "Tipo abbonamento creato con successo" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const onSubmitSubscriptionType = (data: SubscriptionTypeFormData) => {
    createSubscriptionTypeMutation.mutate(data);
  };

  // Update subscription type mutation
  const updateSubscriptionTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/siae/subscription-types/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'subscription-types'] });
      setIsEditSubscriptionTypeDialogOpen(false);
      toast({ title: "Abbonamento aggiornato" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  // Handler to open edit subscription type dialog
  const handleEditSubscriptionType = (subTypeId: string) => {
    const subType = subscriptionTypes?.find((s: any) => s.id === subTypeId);
    if (subType) {
      setEditingSubscriptionTypeData(subType);
      editSubscriptionTypeForm.reset({
        name: subType.name || "",
        description: subType.description || "",
        turnType: subType.turnType || "F",
        eventsCount: subType.eventsCount || 1,
        price: String(subType.price || "0"),
        ivaRate: String(subType.ivaRate || "22"),
        maxQuantity: subType.maxQuantity,
      });
      setIsEditSubscriptionTypeDialogOpen(true);
    }
  };

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

  // Online Visibility Mutations
  const togglePublicMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (!event) throw new Error("Event not found");
      return apiRequest('PATCH', `/api/events/${id}`, {
        ...event,
        isPublic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: "Visibilità aggiornata" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare la visibilità",
        variant: "destructive",
      });
    },
  });

  const toggleTicketingStatusMutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (!ticketedEvent) throw new Error("Ticketed event not found");
      return apiRequest('PATCH', `/api/siae/ticketed-events/${ticketedEvent.id}`, {
        ...ticketedEvent,
        ticketingStatus: active ? 'active' : 'suspended',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events'] });
      toast({ title: "Stato vendita aggiornato" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare lo stato vendita",
        variant: "destructive",
      });
    },
  });

  // Update ticketed event flags mutation (cambio nominativo/rivendita)
  const updateTicketedEventFlagsMutation = useMutation({
    mutationFn: async (flags: { allowsChangeName?: boolean; allowsResale?: boolean }) => {
      if (!ticketedEvent) throw new Error("Ticketed event not found");
      return apiRequest('PATCH', `/api/siae/ticketed-events/${ticketedEvent.id}`, {
        ...ticketedEvent,
        ...flags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', id, 'ticketing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events'] });
      toast({ title: "Impostazioni aggiornate" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare le impostazioni",
        variant: "destructive",
      });
    },
  });

  // Public event URL helper
  const getPublicEventUrl = useCallback(() => {
    if (!event) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/events/${event.id}`;
  }, [event]);

  const copyUrlToClipboard = useCallback(() => {
    const url = getPublicEventUrl();
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiato",
      description: "Il link dell'evento è stato copiato negli appunti.",
    });
  }, [getPublicEventUrl, toast]);

  const openPreview = useCallback(() => {
    const url = getPublicEventUrl();
    window.open(url, '_blank');
  }, [getPublicEventUrl]);

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

  // Helper to get filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = siaeTransactions;
    if (transactionPaymentMethodFilter !== "all") {
      filtered = filtered.filter(t => t.paymentMethod === transactionPaymentMethodFilter);
    }
    if (transactionStatusFilter !== "all") {
      filtered = filtered.filter(t => t.status === transactionStatusFilter);
    }
    return filtered;
  }, [siaeTransactions, transactionPaymentMethodFilter, transactionStatusFilter]);

  const displayedTransactions = filteredTransactions.slice(0, transactionsDisplayLimit);

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completata</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In attesa</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Fallita</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Rimborsata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'card':
        return 'Carta';
      case 'cash':
        return 'Contanti';
      case 'bank_transfer':
        return 'Bonifico';
      case 'paypal':
        return 'PayPal';
      default:
        return method || '-';
    }
  };

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

  const handleReportC1 = (type: 'giornaliero' | 'mensile' = 'giornaliero') => {
    if (!ticketedEvent?.id) {
      toast({ title: "Errore", description: "Nessun evento SIAE associato.", variant: "destructive" });
      return;
    }
    window.open(`/siae/reports/c1/${ticketedEvent.id}?type=${type}`, '_blank');
  };

  const handleReportC2 = () => {
    if (!ticketedEvent?.id) {
      toast({ title: "Errore", description: "Nessun evento SIAE associato.", variant: "destructive" });
      return;
    }
    window.open(`/siae/reports/c2/${ticketedEvent.id}`, '_blank');
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
      <MobileAppLayout className="bg-background">
        <div className="p-4 pb-24">
          <Skeleton className="h-20 w-full mb-6" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </MobileAppLayout>
    );
  }

  if (!event) {
    return (
      <MobileAppLayout className="bg-background">
        <div className="p-4 pb-24">
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Package className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Evento non trovato</h2>
              <p className="text-muted-foreground mb-4">L'evento richiesto non esiste o è stato eliminato.</p>
              <HapticButton onClick={() => navigate('/events')} data-testid="button-back-to-events" className="min-h-[48px]">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Torna agli Eventi
              </HapticButton>
            </CardContent>
          </Card>
        </div>
      </MobileAppLayout>
    );
  }

  const statusTransitions: Record<string, { next: string; label: string; icon: React.ElementType }> = {
    draft: { next: 'scheduled', label: 'Programma Evento', icon: Calendar },
    scheduled: { next: 'ongoing', label: 'Avvia Evento', icon: Play },
    ongoing: { next: 'closed', label: 'Chiudi Evento', icon: StopCircle },
  };

  const currentTransition = statusTransitions[event.status];

  const mobileHeader = (
    <div className="bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
        <HapticButton 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/events')} 
          className="h-11 w-11 flex-shrink-0 rounded-xl"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </HapticButton>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" data-testid="event-title">{event.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`${status.bgColor} ${status.color} text-xs px-2 py-0.5`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            {isLive && <LiveIndicator isLive={isLive} />}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <HapticButton variant="ghost" size="icon" className="h-11 w-11 rounded-xl" data-testid="button-more-options-mobile">
              <MoreHorizontal className="h-5 w-5" />
            </HapticButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => { triggerHaptic('light'); navigate(`/events/wizard/${id}`); }} className="min-h-[44px]">
              <Edit className="h-5 w-5 mr-3" />
              Modifica Evento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { triggerHaptic('light'); navigate(`/reports?eventId=${id}`); }} className="min-h-[44px]">
              <BarChart3 className="h-5 w-5 mr-3" />
              Visualizza Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { triggerHaptic('light'); navigate(`/night-file?eventId=${id}`); }} className="min-h-[44px]">
              <FileText className="h-5 w-5 mr-3" />
              File della Serata
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              triggerHaptic('light');
              queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
              toast({ title: "Dati aggiornati" });
            }} className="min-h-[44px]">
              <RefreshCw className="h-5 w-5 mr-3" />
              Aggiorna Dati
            </DropdownMenuItem>
            {(user?.role === 'super_admin' || user?.role === 'gestore') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { triggerHaptic('medium'); setDeleteDialogOpen(true); }}
                  className="text-destructive min-h-[44px]"
                >
                  <Trash2 className="h-5 w-5 mr-3" />
                  Elimina Evento
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground px-4 pb-3">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {format(new Date(event.startDatetime), "d MMM", { locale: it })}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {format(new Date(event.startDatetime), "HH:mm")}
        </span>
        {location && (
          <span className="flex items-center gap-1.5 truncate flex-1 min-w-0">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{location.name}</span>
          </span>
        )}
      </div>
    </div>
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-event-hub">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/events')} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{event.name}</h1>
                <Badge className={`${status.bgColor} ${status.color}`}>
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <LiveIndicator isLive={isLive} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {format(new Date(event.startDatetime), "HH:mm")}
                </span>
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {location.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentTransition && (
              <Button 
                onClick={() => setStatusChangeDialogOpen(true)}
                className={`bg-gradient-to-r ${status.gradient} text-white`}
                data-testid="button-status-change"
              >
                <currentTransition.icon className="h-4 w-4 mr-2" />
                {currentTransition.label}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/events/wizard/${id}`)} data-testid="button-edit-event">
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-more-options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/scanner')}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Apri Scanner
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/reports?eventId=${id}`)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Report
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
                {(user?.role === 'super_admin' || user?.role === 'gestore') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina Evento
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {alerts.filter(a => !a.dismissed).map(alert => (
            <AlertBanner key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          ))}
        </AnimatePresence>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab('ticketing')} data-testid="kpi-card-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Biglietti</p>
                  <p className="text-2xl font-bold">{ticketedEvent?.ticketsSold || 0}</p>
                  <p className="text-xs text-muted-foreground">{ticketedEvent ? `/ ${ticketedEvent.totalCapacity}` : 'Non attivo'}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
              </div>
              {ticketedEvent && (
                <Progress value={(ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100} className="h-1.5 mt-4" />
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab('guests')} data-testid="kpi-card-guests">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ospiti Liste</p>
                  <p className="text-2xl font-bold">{checkedInGuests}/{totalGuests}</p>
                  <p className="text-xs text-muted-foreground">{maxGuests > 0 ? `Max ${maxGuests}` : 'Nessuna lista'}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              {maxGuests > 0 && (
                <Progress value={(checkedInGuests / maxGuests) * 100} className="h-1.5 mt-4" />
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab('tables')} data-testid="kpi-card-tables">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tavoli</p>
                  <p className="text-2xl font-bold">{bookedTables}/{tables.length}</p>
                  <p className="text-xs text-muted-foreground">{tables.length > 0 ? 'Prenotati' : 'Nessun tavolo'}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Armchair className="h-6 w-6 text-white" />
                </div>
              </div>
              {tables.length > 0 && (
                <Progress value={(bookedTables / tables.length) * 100} className="h-1.5 mt-4" />
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab('finance')} data-testid="kpi-card-revenue">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Incasso</p>
                  <p className="text-2xl font-bold">€{totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Totale evento</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Euro className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="biglietteria" data-testid="tab-biglietteria">
              <Ticket className="h-4 w-4 mr-2" />
              Biglietteria
            </TabsTrigger>
            <TabsTrigger value="cashiers" data-testid="tab-cashiers">
              <Banknote className="h-4 w-4 mr-2" />
              Cassieri
            </TabsTrigger>
            <TabsTrigger value="guests" data-testid="tab-guests">
              <Users className="h-4 w-4 mr-2" />
              Ospiti
            </TabsTrigger>
            <TabsTrigger value="tables" data-testid="tab-tables">
              <Armchair className="h-4 w-4 mr-2" />
              Tavoli
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff">
              <Shield className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="pr" data-testid="tab-pr">
              <Megaphone className="h-4 w-4 mr-2" />
              PR
            </TabsTrigger>
            <TabsTrigger value="access" data-testid="tab-access">
              <QrCode className="h-4 w-4 mr-2" />
              Accessi
            </TabsTrigger>
            {(userFeatures?.beverageEnabled !== false) && (
              <TabsTrigger value="inventory" data-testid="tab-inventory">
                <Package className="h-4 w-4 mr-2" />
                Stock
              </TabsTrigger>
            )}
            <TabsTrigger value="finance" data-testid="tab-finance">
              <Euro className="h-4 w-4 mr-2" />
              Finanza
            </TabsTrigger>
            {ticketedEvent && (
              <TabsTrigger value="page-editor" data-testid="tab-page-editor">
                <Palette className="h-4 w-4 mr-2" />
                Pagina Pubblica
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Stato Evento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {Object.entries(statusConfig).map(([key, config], index) => {
                      const isActive = event.status === key;
                      const isPassed = Object.keys(statusConfig).indexOf(event.status) > index;
                      const IconComponent = config.icon;
                      return (
                        <div key={key} className="flex items-center flex-1">
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                              isActive ? 'border-primary bg-primary text-primary-foreground' 
                                : isPassed ? 'border-primary bg-primary/20 text-primary' 
                                : 'border-muted bg-muted/20 text-muted-foreground'
                            }`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <span className={`text-xs text-center ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                              {config.label}
                            </span>
                          </div>
                          {index < 3 && (
                            <div className={`h-0.5 w-full mx-2 rounded-full ${isPassed ? 'bg-primary' : 'bg-muted'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-400" />
                    Azioni Rapide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" onClick={() => navigate('/scanner')} className="flex flex-col h-auto py-4 gap-2" data-testid="quick-scan">
                      <QrCode className="h-5 w-5" />
                      <span className="text-xs">Scansiona</span>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)} className="flex flex-col h-auto py-4 gap-2" data-testid="quick-guest">
                      <UserPlus className="h-5 w-5" />
                      <span className="text-xs">Ospite</span>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/pr/tables?eventId=${id}`)} className="flex flex-col h-auto py-4 gap-2" data-testid="quick-table">
                      <Armchair className="h-5 w-5" />
                      <span className="text-xs">Tavolo</span>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/events/${id}/direct-stock`)} className="flex flex-col h-auto py-4 gap-2" data-testid="quick-stock">
                      <Package className="h-5 w-5" />
                      <span className="text-xs">Stock</span>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/reports?eventId=${id}`)} className="flex flex-col h-auto py-4 gap-2" data-testid="quick-report">
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-xs">Report</span>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/night-file?eventId=${id}`)} className="flex flex-col h-auto py-4 gap-2" data-testid="quick-night-file">
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">File Serata</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              <EntranceChart data={e4uStats?.entranceFlowData || []} />
              <TopConsumptionsWidget eventId={id || ''} />
            </div>

            {/* Venue Map */}
            <VenueMap 
              tables={tables} 
              bookings={bookings}
              onTableClick={(table) => navigate(`/pr/tables?tableId=${table.id}`)}
            />

            {/* Activity Log */}
            {activityLog.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Attività Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {activityLog.slice(0, 10).map(item => (
                      <ActivityLogEntry key={item.id} item={item} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Biglietteria Tab with Sub-tabs */}
          <TabsContent value="biglietteria" className="space-y-6">
            <Tabs defaultValue="biglietti" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="biglietti" data-testid="subtab-biglietti">
                  <Ticket className="h-4 w-4 mr-2" />
                  Biglietti
                </TabsTrigger>
                <TabsTrigger value="transazioni" data-testid="subtab-transazioni">
                  <Banknote className="h-4 w-4 mr-2" />
                  Transazioni
                </TabsTrigger>
                <TabsTrigger value="report" data-testid="subtab-report">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Report
                </TabsTrigger>
                <TabsTrigger value="online" data-testid="subtab-online">
                  <Eye className="h-4 w-4 mr-2" />
                  Online
                </TabsTrigger>
              </TabsList>

              <TabsContent value="biglietti">
                {!selectedSectorId ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div>
                          <CardTitle>Settori e Tipologie</CardTitle>
                          <CardDescription>Seleziona un settore per visualizzare i biglietti emessi</CardDescription>
                        </div>
                        <Button onClick={() => setIsSectorDialogOpen(true)} data-testid="button-new-ticket">
                          <Plus className="w-4 h-4 mr-2" />
                          Nuovo Biglietto
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {!ticketedEvent?.sectors || ticketedEvent.sectors.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nessun settore configurato</p>
                            <p className="text-sm mt-2">Configura i settori dalla gestione biglietteria</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {ticketedEvent.sectors.map(sector => {
                              const soldCount = sector.capacity - sector.availableSeats;
                              const sectorTickets = siaeTickets.filter(t => t.sectorId === sector.id);
                              const minPrice = Math.min(Number(sector.priceIntero), sector.priceRidotto ? Number(sector.priceRidotto) : Infinity);
                              const maxPrice = Math.max(Number(sector.priceIntero), sector.priceRidotto ? Number(sector.priceRidotto) : 0);
                              
                              return (
                                <Card 
                                  key={sector.id} 
                                  className="cursor-pointer hover-elevate transition-all" 
                                  onClick={() => setSelectedSectorId(sector.id)}
                                  data-testid={`sector-card-${sector.id}`}
                                >
                                  <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <CardTitle className="text-lg">{sector.name}</CardTitle>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={sector.active ? 'default' : 'secondary'}>
                                          {sector.active ? 'Attivo' : 'Disattivato'}
                                        </Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-sector-actions-${sector.id}`}>
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem 
                                              onSelect={() => {
                                                const sectorId = sector.id;
                                                setTimeout(() => handleEditSector(sectorId), 150);
                                              }}
                                              data-testid="button-modify"
                                            >
                                              <Edit2 className="h-4 w-4 mr-2" />
                                              Modifica
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => {
                                              const s = sector;
                                              setTimeout(() => {
                                                setEditingSector(s);
                                                setEditingCapacity(String(s.capacity));
                                              }, 150);
                                            }}>
                                              <Hash className="h-4 w-4 mr-2" />
                                              Modifica Capienza
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => {
                                              updateSectorMutation.mutate({
                                                ...sector,
                                                active: !sector.active,
                                              });
                                            }}>
                                              {sector.active ? (
                                                <>
                                                  <XCircle className="h-4 w-4 mr-2" />
                                                  Disattiva
                                                </>
                                              ) : (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                                  Attiva
                                                </>
                                              )}
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                    <CardDescription>
                                      {minPrice === maxPrice ? `€${minPrice.toFixed(2)}` : `€${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}`}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Venduti</span>
                                        <span className="font-semibold text-blue-400">{soldCount}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Capacità</span>
                                        <span className="font-medium">{sector.capacity}</span>
                                      </div>
                                      <Progress value={sector.capacity > 0 ? (soldCount / sector.capacity) * 100 : 0} className="h-2" />
                                      <div className="flex items-center justify-between pt-2">
                                        <span className="text-xs text-muted-foreground">{sectorTickets.length} biglietti</span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Subscription Types Section */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div>
                          <CardTitle>Abbonamenti</CardTitle>
                          <CardDescription>Tipologie di abbonamento per questo evento</CardDescription>
                        </div>
                        <Button onClick={() => setIsSubscriptionTypeDialogOpen(true)} data-testid="button-new-subscription-type">
                          <Plus className="w-4 h-4 mr-2" />
                          Nuovo Abbonamento
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {!subscriptionTypes || subscriptionTypes.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nessun tipo di abbonamento configurato</p>
                            <p className="text-sm mt-2">Configura gli abbonamenti dalla gestione biglietteria</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {subscriptionTypes.map((subType: any) => {
                              const soldCount = subType.soldCount || 0;
                              const maxQuantity = subType.maxQuantity || 0;
                              const isSoldOut = maxQuantity > 0 && soldCount >= maxQuantity;
                              
                              return (
                                <Card 
                                  key={subType.id} 
                                  className="hover-elevate transition-all cursor-pointer" 
                                  onClick={() => handleEditSubscriptionType(subType.id)}
                                  data-testid={`subscription-type-card-${subType.id}`}
                                >
                                  <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <CardTitle className="text-lg">{subType.name}</CardTitle>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={isSoldOut ? 'destructive' : subType.active !== false ? 'default' : 'secondary'}>
                                          {isSoldOut ? 'Esaurito' : subType.active !== false ? 'Attivo' : 'Disattivato'}
                                        </Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-subscription-actions-${subType.id}`}>
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem onSelect={() => {
                                              const subTypeId = subType.id;
                                              setTimeout(() => handleEditSubscriptionType(subTypeId), 150);
                                            }}>
                                              <Edit2 className="h-4 w-4 mr-2" />
                                              Modifica
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => {
                                              updateSubscriptionTypeMutation.mutate({
                                                id: subType.id,
                                                active: subType.active === false ? true : false,
                                              });
                                            }}>
                                              {subType.active !== false ? (
                                                <>
                                                  <XCircle className="h-4 w-4 mr-2" />
                                                  Disattiva
                                                </>
                                              ) : (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                                  Attiva
                                                </>
                                              )}
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                    <CardDescription>
                                      €{Number(subType.price || 0).toFixed(2)}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tipo Turno</span>
                                        <Badge variant="outline">
                                          {subType.turnType === 'fixed' ? 'Fisso' : 'Libero'}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Eventi</span>
                                        <span className="font-medium">{subType.eventsCount || 0}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Venduti</span>
                                        <span className="font-semibold text-blue-400">{soldCount}</span>
                                      </div>
                                      {maxQuantity > 0 && (
                                        <>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Disponibili</span>
                                            <span className="font-medium">{maxQuantity}</span>
                                          </div>
                                          <Progress value={maxQuantity > 0 ? (soldCount / maxQuantity) * 100 : 0} className="h-2" />
                                        </>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Cambio Nominativo & Rivendita Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Cambio Nominativo & Rivendita</CardTitle>
                        <CardDescription>
                          Gestione cambio intestatario e rivendita biglietti (SIAE - Provvedimento 356768/2025)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Toggle Cambio Nominativo */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <UserCog className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">Cambio Nominativo</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Consenti ai clienti di modificare l'intestatario del biglietto (costo €2,50)
                            </p>
                          </div>
                          <Switch
                            checked={ticketedEvent?.allowsChangeName ?? false}
                            onCheckedChange={(checked) => updateTicketedEventFlagsMutation.mutate({ allowsChangeName: checked })}
                            disabled={updateTicketedEventFlagsMutation.isPending}
                            data-testid="switch-allows-change-name"
                          />
                        </div>

                        {/* Sezione Collassabile Cambio Nominativo */}
                        {ticketedEvent?.allowsChangeName && (
                          <div className="border rounded-lg overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between p-4 hover-elevate text-left"
                              onClick={() => setNameChangesExpanded(!nameChangesExpanded)}
                              data-testid="button-expand-name-changes"
                            >
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4" />
                                <span className="font-medium">Richieste Cambio Nominativo</span>
                                <Badge variant="secondary">{nameChanges.length}</Badge>
                              </div>
                              <ChevronDown className={`h-4 w-4 transition-transform ${nameChangesExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {nameChangesExpanded && (
                              <div className="border-t p-4">
                                {nameChanges.length === 0 ? (
                                  <p className="text-center text-muted-foreground py-4">Nessuna richiesta di cambio nominativo</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Biglietto</TableHead>
                                        <TableHead>Nuovo Intestatario</TableHead>
                                        <TableHead>Costo</TableHead>
                                        <TableHead>Stato</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {nameChanges.map((change) => (
                                        <TableRow key={change.id} data-testid={`row-name-change-${change.id}`}>
                                          <TableCell className="text-sm">
                                            {change.createdAt ? format(new Date(change.createdAt), 'dd/MM/yyyy HH:mm', { locale: it }) : '-'}
                                          </TableCell>
                                          <TableCell className="font-mono text-xs">
                                            {change.originalTicketId?.substring(0, 8)}...
                                          </TableCell>
                                          <TableCell>
                                            <span className="font-medium">{change.newFirstName} {change.newLastName}</span>
                                          </TableCell>
                                          <TableCell>€{Number(change.fee || 2.5).toFixed(2)}</TableCell>
                                          <TableCell>
                                            <Badge variant={
                                              change.status === 'completed' ? 'default' :
                                              change.status === 'rejected' ? 'destructive' : 'secondary'
                                            }>
                                              {change.status === 'completed' ? 'Completato' :
                                               change.status === 'rejected' ? 'Rifiutato' : 'In Attesa'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <Separator />

                        {/* Toggle Rivendita */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Repeat className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">Rivendita Biglietti</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Abilita il circuito ufficiale di rivendita (Art. 1 comma 545 L. 232/2016)
                            </p>
                          </div>
                          <Switch
                            checked={ticketedEvent?.allowsResale ?? false}
                            onCheckedChange={(checked) => updateTicketedEventFlagsMutation.mutate({ allowsResale: checked })}
                            disabled={updateTicketedEventFlagsMutation.isPending}
                            data-testid="switch-allows-resale"
                          />
                        </div>

                        {/* Sezione Collassabile Rivendita */}
                        {ticketedEvent?.allowsResale && (
                          <div className="border rounded-lg overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between p-4 hover-elevate text-left"
                              onClick={() => setResalesExpanded(!resalesExpanded)}
                              data-testid="button-expand-resales"
                            >
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" />
                                <span className="font-medium">Biglietti in Rivendita</span>
                                <Badge variant="secondary">{resales.length}</Badge>
                              </div>
                              <ChevronDown className={`h-4 w-4 transition-transform ${resalesExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {resalesExpanded && (
                              <div className="border-t p-4">
                                {resales.length === 0 ? (
                                  <p className="text-center text-muted-foreground py-4">Nessun biglietto in rivendita</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Biglietto</TableHead>
                                        <TableHead>Prezzo Orig.</TableHead>
                                        <TableHead>Prezzo Riv.</TableHead>
                                        <TableHead>Causale</TableHead>
                                        <TableHead>Venditore</TableHead>
                                        <TableHead>Stato</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {resales.map((resale) => (
                                        <TableRow key={resale.id} data-testid={`row-resale-${resale.id}`}>
                                          <TableCell className="text-sm">
                                            {resale.listedAt ? format(new Date(resale.listedAt), 'dd/MM/yyyy', { locale: it }) : '-'}
                                          </TableCell>
                                          <TableCell className="font-mono text-xs">
                                            {resale.originalTicketId?.substring(0, 8)}...
                                          </TableCell>
                                          <TableCell>€{Number(resale.originalPrice || 0).toFixed(2)}</TableCell>
                                          <TableCell>€{Number(resale.resalePrice || 0).toFixed(2)}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">
                                              {resale.causaleRivendita === 'IMP' ? 'Impedimento' :
                                               resale.causaleRivendita === 'RIN' ? 'Rinuncia' :
                                               resale.causaleRivendita === 'ERR' ? 'Errore' : 'Altro'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {resale.venditoreVerificato ? (
                                              <Badge variant="default" className="gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Verificato
                                              </Badge>
                                            ) : (
                                              <Badge variant="secondary">Non verificato</Badge>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={
                                              resale.status === 'sold' ? 'default' :
                                              resale.status === 'cancelled' ? 'destructive' :
                                              resale.status === 'expired' ? 'outline' :
                                              resale.status === 'rejected' ? 'destructive' : 'secondary'
                                            }>
                                              {resale.status === 'sold' ? 'Venduto' :
                                               resale.status === 'cancelled' ? 'Annullato' :
                                               resale.status === 'expired' ? 'Scaduto' :
                                               resale.status === 'listed' ? 'In Vendita' :
                                               resale.status === 'rejected' ? 'Rifiutato' : resale.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSectorId(null)} data-testid="button-back-to-sectors">
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <CardTitle>{getSectorName(selectedSectorId)}</CardTitle>
                          <CardDescription>Biglietti emessi per questo settore</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                          <SelectTrigger className="w-32" data-testid="select-status-filter">
                            <SelectValue placeholder="Stato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tutti</SelectItem>
                            <SelectItem value="valid">Validi</SelectItem>
                            <SelectItem value="used">Usati</SelectItem>
                            <SelectItem value="cancelled">Annullati</SelectItem>
                          </SelectContent>
                        </Select>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button data-testid="button-sector-actions">
                              <Settings className="h-4 w-4 mr-2" />
                              Azioni
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => {
                              const sectorId = selectedSectorId;
                              setTimeout(() => handleEditSector(sectorId), 150);
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Modifica Settore
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => {
                              const sector = ticketedEvent?.sectors?.find(s => s.id === selectedSectorId);
                              if (sector) {
                                setTimeout(() => {
                                  setEditingSector(sector);
                                  setEditingCapacity(String(sector.capacity));
                                }, 150);
                              }
                            }}>
                              <Hash className="h-4 w-4 mr-2" />
                              Modifica Capienza
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => {
                              const sector = ticketedEvent?.sectors?.find(s => s.id === selectedSectorId);
                              if (sector) {
                                updateSectorMutation.mutate({
                                  ...sector,
                                  active: !sector.active,
                                });
                              }
                            }}>
                              {(() => {
                                const sector = ticketedEvent?.sectors?.find(s => s.id === selectedSectorId);
                                return sector?.active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Disattiva Settore
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Attiva Settore
                                  </>
                                );
                              })()}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const sectorTickets = siaeTickets.filter(t => t.sectorId === selectedSectorId);
                        const filteredSectorTickets = ticketStatusFilter === 'all' 
                          ? sectorTickets 
                          : sectorTickets.filter(t => t.status === ticketStatusFilter);
                        const displayedSectorTickets = filteredSectorTickets.slice(0, ticketsDisplayLimit);
                        
                        if (sectorTickets.length === 0) {
                          return (
                            <div className="text-center py-12 text-muted-foreground">
                              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Nessun biglietto emesso per questo settore</p>
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Numero</TableHead>
                                  <TableHead>Partecipante</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Prezzo</TableHead>
                                  <TableHead>Stato</TableHead>
                                  <TableHead>Data</TableHead>
                                  <TableHead className="w-24"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {displayedSectorTickets.map(ticket => (
                                  <TableRow 
                                    key={ticket.id} 
                                    className="cursor-pointer" 
                                    onClick={() => { setSelectedTicketForDetail(ticket); setShowTicketDetailSheet(true); }}
                                    data-testid={`row-ticket-${ticket.id}`}
                                  >
                                    <TableCell className="font-mono">{ticket.progressiveNumber}</TableCell>
                                    <TableCell>
                                      {ticket.participantFirstName || ticket.participantLastName 
                                        ? `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim()
                                        : <span className="text-muted-foreground">-</span>
                                      }
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary">{ticket.ticketTypeCode === '01' ? 'Intero' : 'Ridotto'}</Badge>
                                    </TableCell>
                                    <TableCell>€{Number(ticket.grossAmount).toFixed(2)}</TableCell>
                                    <TableCell>{getTicketStatusBadge(ticket.status)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {ticket.emissionDate ? format(new Date(ticket.emissionDate), 'dd/MM HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedTicketForDetail(ticket); setShowTicketDetailSheet(true); }} data-testid={`button-view-ticket-${ticket.id}`}>
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        {ticket.status === 'valid' && (
                                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleCancelTicket(ticket); }} data-testid={`button-cancel-ticket-${ticket.id}`}>
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {filteredSectorTickets.length > ticketsDisplayLimit && (
                              <div className="text-center mt-4">
                                <Button variant="outline" onClick={() => setTicketsDisplayLimit(prev => prev + 20)}>
                                  Carica altri ({filteredSectorTickets.length - ticketsDisplayLimit} rimanenti)
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="transazioni" data-testid="subtab-transazioni-content">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle>Transazioni</CardTitle>
                      <CardDescription>Elenco di tutte le transazioni dell'evento</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={transactionPaymentMethodFilter} onValueChange={setTransactionPaymentMethodFilter}>
                        <SelectTrigger className="w-36" data-testid="subtab-transazioni-filter-payment">
                          <SelectValue placeholder="Metodo pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti</SelectItem>
                          <SelectItem value="card">Carta</SelectItem>
                          <SelectItem value="cash">Contanti</SelectItem>
                          <SelectItem value="bank_transfer">Bonifico</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={transactionStatusFilter} onValueChange={setTransactionStatusFilter}>
                        <SelectTrigger className="w-36" data-testid="subtab-transazioni-filter-status">
                          <SelectValue placeholder="Stato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti</SelectItem>
                          <SelectItem value="pending">In attesa</SelectItem>
                          <SelectItem value="completed">Completata</SelectItem>
                          <SelectItem value="failed">Fallita</SelectItem>
                          <SelectItem value="refunded">Rimborsata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nessuna transazione registrata</p>
                      </div>
                    ) : (
                      <Table data-testid="table-transactions">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Codice</TableHead>
                            <TableHead>Data/Ora</TableHead>
                            <TableHead>Importo</TableHead>
                            <TableHead>Metodo</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead>Biglietti</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedTransactions.map(transaction => (
                            <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                              <TableCell className="font-mono">{transaction.transactionCode}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {transaction.paymentCompletedAt ? format(new Date(transaction.paymentCompletedAt), 'dd/MM/yyyy HH:mm', { locale: it }) : '-'}
                              </TableCell>
                              <TableCell className="font-medium">€{Number(transaction.totalAmount).toFixed(2)}</TableCell>
                              <TableCell>{getPaymentMethodLabel(transaction.paymentMethod)}</TableCell>
                              <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                              <TableCell>{transaction.ticketsCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {filteredTransactions.length > transactionsDisplayLimit && (
                      <div className="text-center mt-4">
                        <Button variant="outline" onClick={() => setTransactionsDisplayLimit(prev => prev + 20)} data-testid="subtab-transazioni-load-more">
                          Carica altri
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="report">
                <div className="grid grid-cols-2 gap-4">
                  <Card data-testid="report-c1-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        Registro C1 - Riepilogo
                      </CardTitle>
                      <CardDescription>Riepilogo corrispettivi giornalieri per tipo biglietto e canale</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full" 
                        onClick={() => handleReportC1('giornaliero')}
                        disabled={!ticketedEvent?.id}
                        data-testid="button-view-c1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizza Report C1
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" data-testid="button-download-pdf-c1">
                          <Download className="h-4 w-4 mr-1" />
                          Scarica PDF
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" data-testid="button-download-csv-c1">
                          <Download className="h-4 w-4 mr-1" />
                          Scarica CSV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="report-c2-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-400" />
                        Registro C2 - Dettaglio Biglietti
                      </CardTitle>
                      <CardDescription>Dettaglio di tutti i biglietti emessi con numerazione progressiva</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full" 
                        onClick={handleReportC2}
                        disabled={!ticketedEvent?.id}
                        data-testid="button-view-c2"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizza Report C2
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" data-testid="button-download-pdf-c2">
                          <Download className="h-4 w-4 mr-1" />
                          Scarica PDF
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" data-testid="button-download-csv-c2">
                          <Download className="h-4 w-4 mr-1" />
                          Scarica CSV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="report-trasmissioni-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-amber-400" />
                        Trasmissioni AE
                      </CardTitle>
                      <CardDescription>Stato delle trasmissioni all'Agenzia delle Entrate</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ticketedEvent?.transmissionStatus && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                          <Badge variant={ticketedEvent.transmissionStatus === 'completed' ? 'default' : 'secondary'}>
                            {ticketedEvent.transmissionStatus === 'completed' ? 'Trasmesso' : 
                             ticketedEvent.transmissionStatus === 'pending' ? 'In Attesa' : 
                             ticketedEvent.transmissionStatus === 'failed' ? 'Errore' : 'Non Trasmesso'}
                          </Badge>
                        </div>
                      )}
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => navigate(`/siae/transmissions?eventId=${id}`)}
                        data-testid="button-manage-transmissions"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Gestisci Trasmissioni
                      </Button>
                    </CardContent>
                  </Card>

                  <Card data-testid="report-annullamenti-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-rose-400" />
                        Registro Annullamenti e Rimborsi
                      </CardTitle>
                      <CardDescription>Biglietti annullati e rimborsi effettuati</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <div className="text-2xl font-bold text-rose-400">{ticketedEvent?.ticketsCancelled || 0}</div>
                          <div className="text-xs text-muted-foreground">Annullati</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <div className="text-2xl font-bold text-amber-400">{ticketedEvent?.ticketsRefunded || 0}</div>
                          <div className="text-xs text-muted-foreground">Rimborsati</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate(`/siae/tickets?eventId=${id}&status=cancelled`)}
                        data-testid="button-view-cancellations"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizza Registro
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="online">
                <div className="grid gap-6" data-testid="online-visibility-card">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-cyan-400" />
                        Visibilità Evento
                      </CardTitle>
                      <CardDescription>Gestisci la pubblicazione online dell'evento</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <div className="font-medium">Evento Pubblico</div>
                          <div className="text-sm text-muted-foreground">
                            {event?.isPublic 
                              ? "L'evento è visibile al pubblico" 
                              : "L'evento è visibile solo agli organizzatori"}
                          </div>
                        </div>
                        <Switch
                          checked={event?.isPublic ?? false}
                          onCheckedChange={(checked) => togglePublicMutation.mutate(checked)}
                          disabled={!event || event.status === 'closed' || togglePublicMutation.isPending}
                          data-testid="switch-public"
                        />
                      </div>

                      {ticketedEvent && (
                        <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <div className="font-medium">Vendita Online Attiva</div>
                            <div className="text-sm text-muted-foreground">
                              {ticketedEvent.ticketingStatus === 'active'
                                ? "I biglietti sono acquistabili online"
                                : "La vendita online è disattivata"}
                            </div>
                          </div>
                          <Switch
                            checked={ticketedEvent.ticketingStatus === 'active'}
                            onCheckedChange={(checked) => toggleTicketingStatusMutation.mutate(checked)}
                            disabled={!ticketedEvent || event?.status === 'closed' || toggleTicketingStatusMutation.isPending}
                            data-testid="switch-ticketing-active"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-blue-400" />
                        Stato Pubblicazione
                      </CardTitle>
                      <CardDescription>URL e anteprima della pagina pubblica</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${event?.isPublic ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {event?.isPublic ? 'Online' : 'Offline'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {event?.isPublic ? getPublicEventUrl() : 'Pagina non pubblicata'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={copyUrlToClipboard}
                          disabled={!event?.isPublic}
                          data-testid="button-copy-url"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copia Link
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={openPreview}
                          disabled={!event?.isPublic}
                          data-testid="button-preview"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Anteprima
                        </Button>
                      </div>

                      {!event?.isPublic && (
                        <Button
                          className="w-full"
                          onClick={() => togglePublicMutation.mutate(true)}
                          disabled={togglePublicMutation.isPending}
                          data-testid="button-publish"
                        >
                          {togglePublicMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Pubblicazione...
                            </>
                          ) : (
                            <>
                              <Megaphone className="h-4 w-4 mr-2" />
                              Pubblica Ora
                            </>
                          )}
                        </Button>
                      )}

                      {ticketedEvent && ticketedEvent.ticketingStatus === 'active' && (
                        <AlertDialog open={pauseTicketingDialogOpen} onOpenChange={setPauseTicketingDialogOpen}>
                          <Button
                            variant="outline"
                            className="w-full text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                            onClick={() => setPauseTicketingDialogOpen(true)}
                            disabled={toggleTicketingStatusMutation.isPending || event?.status === 'closed'}
                            data-testid="button-suspend-ticketing"
                          >
                            {toggleTicketingStatusMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sospensione...
                              </>
                            ) : (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Sospendi Vendita
                              </>
                            )}
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sospendere la vendita online?</AlertDialogTitle>
                              <AlertDialogDescription>
                                I biglietti non saranno più acquistabili online. Potrai riattivare la vendita in qualsiasi momento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  toggleTicketingStatusMutation.mutate(false);
                                  setPauseTicketingDialogOpen(false);
                                }}
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                Sospendi Vendita
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Cashiers Tab */}
          <TabsContent value="cashiers">
            <EventCashierAllocations eventId={id || ''} />
          </TabsContent>

          {/* Guests Tab */}
          <TabsContent value="guests" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Liste Ospiti</CardTitle>
                  <CardDescription>{totalGuests} ospiti totali, {checkedInGuests} entrati</CardDescription>
                </div>
                <Button onClick={() => setShowCreateListDialog(true)} data-testid="button-create-list">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Lista
                </Button>
              </CardHeader>
              <CardContent>
                {guestLists.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna lista ospiti</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Lista</TableHead>
                        <TableHead>Ospiti</TableHead>
                        <TableHead>Capacità Max</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guestLists.map(list => {
                        const guests = e4uStats?.guestsByList?.[list.id] || { total: 0, checkedIn: 0 };
                        return (
                          <TableRow key={list.id} data-testid={`row-list-${list.id}`}>
                            <TableCell className="font-medium">{list.name}</TableCell>
                            <TableCell>{guests.total}</TableCell>
                            <TableCell>{list.maxGuests || '∞'}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={guests.total > 0 ? (guests.checkedIn / guests.total) * 100 : 0} className="h-2 w-20" />
                                <span className="text-sm text-muted-foreground">{guests.checkedIn}/{guests.total}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/pr/guest-lists?listId=${list.id}`)}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Prenotazioni Tavoli</CardTitle>
                  <CardDescription>{bookedTables} su {tables.length} tavoli prenotati</CardDescription>
                </div>
                <Button onClick={() => setShowCreateTableTypeDialog(true)} data-testid="button-create-table-type">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Tipo Tavolo
                </Button>
              </CardHeader>
              <CardContent>
                <VenueMap 
                  tables={tables} 
                  bookings={bookings}
                  onTableClick={(table) => navigate(`/pr/tables?tableId=${table.id}`)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Staff Evento</CardTitle>
                  <CardDescription>Gestione personale assegnato</CardDescription>
                </div>
                <Button onClick={() => setShowAssignStaffDialog(true)} data-testid="button-assign-staff">
                  <Plus className="h-4 w-4 mr-2" />
                  Assegna Staff
                </Button>
              </CardHeader>
              <CardContent>
                {e4uStaff.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuno staff assegnato</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Permessi</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {e4uStaff.map((staff: any) => {
                        const staffUser = users.find(u => u.id === staff.userId);
                        return (
                          <TableRow key={staff.id} data-testid={`row-staff-${staff.id}`}>
                            <TableCell className="font-medium">
                              {staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : 'Staff sconosciuto'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{staffUser?.role || 'staff'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {staff.canManageLists && <Badge className="bg-cyan-500/20 text-cyan-400">Liste</Badge>}
                                {staff.canManageTables && <Badge className="bg-purple-500/20 text-purple-400">Tavoli</Badge>}
                                {staff.canCreatePr && <Badge className="bg-orange-500/20 text-orange-400">PR</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeStaffMutation.mutate(staff.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PR Tab */}
          <TabsContent value="pr" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>PR Evento</CardTitle>
                  <CardDescription>Gestione promoter</CardDescription>
                </div>
                <Button onClick={() => setShowAssignPrDialog(true)} data-testid="button-assign-pr">
                  <Plus className="h-4 w-4 mr-2" />
                  Assegna PR
                </Button>
              </CardHeader>
              <CardContent>
                {e4uPr.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun PR assegnato</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Supervisore</TableHead>
                        <TableHead>Permessi</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {e4uPr.map((pr: any) => {
                        const prUser = users.find(u => u.id === pr.userId);
                        const supervisorStaff = e4uStaff.find((s: any) => s.userId === pr.staffUserId);
                        const supervisorUser = supervisorStaff ? users.find(u => u.id === supervisorStaff.userId) : null;
                        return (
                          <TableRow key={pr.id} data-testid={`row-pr-${pr.id}`}>
                            <TableCell className="font-medium">
                              {prUser ? `${prUser.firstName} ${prUser.lastName}` : 'PR sconosciuto'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {supervisorUser ? `${supervisorUser.firstName} ${supervisorUser.lastName}` : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {pr.canAddToLists && <Badge className="bg-cyan-500/20 text-cyan-400">Liste</Badge>}
                                {pr.canProposeTables && <Badge className="bg-purple-500/20 text-purple-400">Tavoli</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removePrMutation.mutate(pr.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Tab */}
          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Scanner Accessi</CardTitle>
                  <CardDescription>Gestione addetti scansione</CardDescription>
                </div>
                <Button onClick={() => setShowAssignScannerDialog(true)} data-testid="button-assign-scanner">
                  <Plus className="h-4 w-4 mr-2" />
                  Assegna Scanner
                </Button>
              </CardHeader>
              <CardContent>
                {e4uScanners.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun scanner assegnato</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Permessi</TableHead>
                        <TableHead>Settori</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {e4uScanners.map((scanner: any) => {
                        const scannerUser = users.find(u => u.id === scanner.userId);
                        const sectorDisplay = getScannerSectorDisplay(scanner);
                        return (
                          <TableRow key={scanner.id} data-testid={`row-scanner-${scanner.id}`}>
                            <TableCell className="font-medium">
                              {scannerUser ? `${scannerUser.firstName} ${scannerUser.lastName}` : 'Scanner sconosciuto'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {scanner.canScanLists && <Badge className="bg-cyan-500/20 text-cyan-400">Liste</Badge>}
                                {scanner.canScanTables && <Badge className="bg-purple-500/20 text-purple-400">Tavoli</Badge>}
                                {scanner.canScanTickets && <Badge className="bg-blue-500/20 text-blue-400">Biglietti</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={sectorDisplay.color}>{sectorDisplay.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openScannerAccessDialog(scanner)}>
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeScannerMutation.mutate(scanner.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          {(userFeatures?.beverageEnabled !== false) && (
            <TabsContent value="inventory" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Stock Evento</CardTitle>
                    <CardDescription>Prodotti e giacenze per l'evento</CardDescription>
                  </div>
                  <Button onClick={() => navigate(`/events/${id}/direct-stock`)} data-testid="button-manage-stock">
                    <Package className="h-4 w-4 mr-2" />
                    Gestisci Stock
                  </Button>
                </CardHeader>
                <CardContent>
                  {eventStocks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessun prodotto assegnato all'evento</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prodotto</TableHead>
                          <TableHead>Quantità</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eventStocks.slice(0, 10).map(stock => (
                          <TableRow key={stock.id} data-testid={`row-stock-${stock.id}`}>
                            <TableCell>Prodotto #{stock.productId}</TableCell>
                            <TableCell>{stock.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Biglietti</div>
                  <div className="text-2xl font-bold">€{(e4uReport?.overview?.ticketRevenue || 0).toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Tavoli</div>
                  <div className="text-2xl font-bold">€{(e4uReport?.overview?.tableRevenue || 0).toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Totale</div>
                  <div className="text-2xl font-bold text-primary">€{totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Page Editor Tab */}
          {ticketedEvent && (
            <TabsContent value="page-editor" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Editor Pagina Pubblica
                  </CardTitle>
                  <CardDescription>
                    Personalizza la pagina pubblica dell'evento con hero, lineup DJ, orari e FAQ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Anteprima Pubblica</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Visualizza come appare la pagina ai visitatori
                      </p>
                      <Link href={`/acquista/${id}`}>
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Apri Pagina Pubblica
                        </Button>
                      </Link>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="h-4 w-4 text-primary" />
                        <span className="font-medium">Modifica Contenuti</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Configura hero, lineup, timeline e FAQ
                      </p>
                      <Link href={`/siae/ticketed-events/${ticketedEvent.id}/page-editor`}>
                        <Button className="w-full">
                          <Palette className="h-4 w-4 mr-2" />
                          Apri Editor
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Sezioni configurabili:</p>
                    <ul className="grid grid-cols-2 gap-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Hero con video/immagine
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Info rapide evento
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Line-up artisti/DJ
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Timeline orari
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        FAQ personalizzate
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Countdown Early Bird
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Dialogs - same as mobile version */}
        <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cambia Stato Evento</AlertDialogTitle>
              <AlertDialogDescription>
                {currentTransition && `Vuoi ${currentTransition.label.toLowerCase()} l'evento "${event.name}"?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (currentTransition) {
                  changeStatusMutation.mutate(currentTransition.next);
                }
              }}>
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
                Sei sicuro di voler eliminare l'evento "{event.name}"? Questa azione è irreversibile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteEventMutation.mutate()} className="bg-destructive text-destructive-foreground">
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={cancelTicketDialogOpen} onOpenChange={setCancelTicketDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annulla Biglietto</DialogTitle>
              <DialogDescription>
                Stai per annullare il biglietto #{ticketToCancel?.progressiveNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Motivo Annullamento</Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">Richiesta cliente</SelectItem>
                    <SelectItem value="02">Errore emissione</SelectItem>
                    <SelectItem value="03">Evento annullato</SelectItem>
                    <SelectItem value="04">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Inserisci note aggiuntive..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelTicketDialogOpen(false)}>Annulla</Button>
              <Button variant="destructive" onClick={confirmCancelTicket} disabled={cancelTicketMutation.isPending}>
                {cancelTicketMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Conferma Annullamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket Detail Sheet */}
        <Sheet open={showTicketDetailSheet} onOpenChange={setShowTicketDetailSheet}>
          <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[85vh] rounded-t-2xl" : ""}>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-400" />
                Dettaglio Biglietto
              </SheetTitle>
            </SheetHeader>
            {selectedTicketForDetail && (
              <div className="space-y-6 mt-6">
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-mono font-bold text-blue-400">
                      #{selectedTicketForDetail.progressiveNumber}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedTicketForDetail.fiscalSealCode || 'N/A'}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {getTicketStatusBadge(selectedTicketForDetail.status)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Settore</span>
                    <span className="font-medium">{getSectorName(selectedTicketForDetail.sectorId)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="secondary">{selectedTicketForDetail.ticketTypeCode === '01' ? 'Intero' : 'Ridotto'}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className="font-bold text-emerald-400">€{Number(selectedTicketForDetail.grossAmount).toFixed(2)}</span>
                  </div>
                  {(selectedTicketForDetail.participantFirstName || selectedTicketForDetail.participantLastName) && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Partecipante</span>
                      <span className="font-medium">
                        {`${selectedTicketForDetail.participantFirstName || ''} ${selectedTicketForDetail.participantLastName || ''}`.trim()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Emissione</span>
                    <span className="font-medium">
                      {selectedTicketForDetail.emissionDate 
                        ? format(new Date(selectedTicketForDetail.emissionDate), 'dd/MM/yyyy HH:mm') 
                        : '-'}
                    </span>
                  </div>
                  {selectedTicketForDetail.usedAt && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Utilizzato</span>
                      <span className="font-medium">
                        {format(new Date(selectedTicketForDetail.usedAt), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  {selectedTicketForDetail.status === 'valid' && (
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => {
                        setShowTicketDetailSheet(false);
                        handleCancelTicket(selectedTicketForDetail);
                      }}
                      data-testid="button-cancel-ticket-detail"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annulla Biglietto
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowTicketDetailSheet(false)}
                  >
                    Chiudi
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Create List Dialog */}
        <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Lista Ospiti</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Lista</Label>
                <Input value={newListData.name} onChange={(e) => setNewListData(p => ({ ...p, name: e.target.value }))} placeholder="Es. VIP, Staff, Amici..." />
              </div>
              <div className="space-y-2">
                <Label>Capacità Massima (opzionale)</Label>
                <Input type="number" value={newListData.maxCapacity} onChange={(e) => setNewListData(p => ({ ...p, maxCapacity: e.target.value }))} placeholder="Lascia vuoto per illimitato" />
              </div>
              <div className="space-y-2">
                <Label>Prezzo Ingresso</Label>
                <Input type="number" step="0.01" value={newListData.price} onChange={(e) => setNewListData(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateListDialog(false)}>Annulla</Button>
              <Button onClick={() => {
                createListMutation.mutate({
                  name: newListData.name,
                  maxCapacity: newListData.maxCapacity ? parseInt(newListData.maxCapacity) : undefined,
                  price: newListData.price || "0",
                });
              }} disabled={createListMutation.isPending || !newListData.name}>
                {createListMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Crea Lista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Table Type Dialog */}
        <Dialog open={showCreateTableTypeDialog} onOpenChange={setShowCreateTableTypeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Tipo Tavolo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Tipo</Label>
                <Input value={newTableTypeData.name} onChange={(e) => setNewTableTypeData(p => ({ ...p, name: e.target.value }))} placeholder="Es. VIP, Privé..." />
              </div>
              <div className="space-y-2">
                <Label>Prezzo</Label>
                <Input type="number" step="0.01" value={newTableTypeData.price} onChange={(e) => setNewTableTypeData(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Ospiti Massimi</Label>
                <Input type="number" value={newTableTypeData.maxGuests} onChange={(e) => setNewTableTypeData(p => ({ ...p, maxGuests: e.target.value }))} placeholder="10" />
              </div>
              <div className="space-y-2">
                <Label>Quantità Tavoli</Label>
                <Input type="number" value={newTableTypeData.totalQuantity} onChange={(e) => setNewTableTypeData(p => ({ ...p, totalQuantity: e.target.value }))} placeholder="5" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateTableTypeDialog(false)}>Annulla</Button>
              <Button onClick={() => {
                createTableTypeMutation.mutate({
                  name: newTableTypeData.name,
                  price: newTableTypeData.price || "0",
                  maxGuests: parseInt(newTableTypeData.maxGuests) || 10,
                  totalQuantity: parseInt(newTableTypeData.totalQuantity) || 1,
                });
              }} disabled={createTableTypeMutation.isPending || !newTableTypeData.name}>
                {createTableTypeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Crea Tipo Tavolo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Staff Dialog */}
        <Dialog open={showAssignStaffDialog} onOpenChange={setShowAssignStaffDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assegna Staff</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleziona Utente</Label>
                <select className="w-full h-10 px-3 rounded-md border bg-background" value={newStaffData.userId} onChange={(e) => setNewStaffData(p => ({ ...p, userId: e.target.value }))}>
                  <option value="">Seleziona...</option>
                  {users.filter(u => ['staff', 'capo_staff', 'gestore'].includes(u.role)).filter(u => !e4uStaff.some((s: any) => s.userId === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Permessi</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Gestione Liste</span>
                    <Switch checked={newStaffData.canManageLists} onCheckedChange={(c) => setNewStaffData(p => ({ ...p, canManageLists: c }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Gestione Tavoli</span>
                    <Switch checked={newStaffData.canManageTables} onCheckedChange={(c) => setNewStaffData(p => ({ ...p, canManageTables: c }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Creare PR</span>
                    <Switch checked={newStaffData.canCreatePr} onCheckedChange={(c) => setNewStaffData(p => ({ ...p, canCreatePr: c }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Approvare Tavoli</span>
                    <Switch checked={newStaffData.canApproveTables} onCheckedChange={(c) => setNewStaffData(p => ({ ...p, canApproveTables: c }))} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignStaffDialog(false)}>Annulla</Button>
              <Button onClick={() => assignStaffMutation.mutate(newStaffData)} disabled={assignStaffMutation.isPending || !newStaffData.userId}>
                {assignStaffMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Assegna
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign PR Dialog */}
        <Dialog open={showAssignPrDialog} onOpenChange={setShowAssignPrDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assegna PR</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleziona PR</Label>
                <select className="w-full h-10 px-3 rounded-md border bg-background" value={newPrData.userId} onChange={(e) => setNewPrData(p => ({ ...p, userId: e.target.value }))}>
                  <option value="">Seleziona...</option>
                  {users.filter(u => ['pr', 'staff', 'capo_staff'].includes(u.role)).filter(u => !e4uPr.some((p: any) => p.userId === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Supervisore (opzionale)</Label>
                <select className="w-full h-10 px-3 rounded-md border bg-background" value={newPrData.staffUserId} onChange={(e) => setNewPrData(p => ({ ...p, staffUserId: e.target.value }))}>
                  <option value="">Nessuno</option>
                  {e4uStaff.map((staff: any) => {
                    const u = users.find(u => u.id === staff.userId);
                    return <option key={staff.id} value={staff.userId}>{u ? `${u.firstName} ${u.lastName}` : 'Staff'}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Permessi</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Aggiungere alle Liste</span>
                    <Switch checked={newPrData.canAddToLists} onCheckedChange={(c) => setNewPrData(p => ({ ...p, canAddToLists: c }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Proporre Tavoli</span>
                    <Switch checked={newPrData.canProposeTables} onCheckedChange={(c) => setNewPrData(p => ({ ...p, canProposeTables: c }))} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignPrDialog(false)}>Annulla</Button>
              <Button onClick={() => assignPrMutation.mutate({ userId: newPrData.userId, staffUserId: newPrData.staffUserId || undefined, canAddToLists: newPrData.canAddToLists, canProposeTables: newPrData.canProposeTables })} disabled={assignPrMutation.isPending || !newPrData.userId}>
                {assignPrMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Assegna
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Scanner Dialog */}
        <Dialog open={showAssignScannerDialog} onOpenChange={setShowAssignScannerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assegna Scanner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleziona Utente</Label>
                <select className="w-full h-10 px-3 rounded-md border bg-background" value={newScannerData.userId} onChange={(e) => setNewScannerData(p => ({ ...p, userId: e.target.value }))}>
                  <option value="">Seleziona...</option>
                  {users.filter(u => !e4uScanners.some((s: any) => s.userId === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Permessi Scansione</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Scansione Liste</span>
                    <Switch checked={newScannerData.canScanLists} onCheckedChange={(c) => setNewScannerData(p => ({ ...p, canScanLists: c }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Scansione Tavoli</span>
                    <Switch checked={newScannerData.canScanTables} onCheckedChange={(c) => setNewScannerData(p => ({ ...p, canScanTables: c }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Scansione Biglietti</span>
                    <Switch checked={newScannerData.canScanTickets} onCheckedChange={(c) => setNewScannerData(p => ({ ...p, canScanTickets: c }))} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignScannerDialog(false)}>Annulla</Button>
              <Button onClick={() => assignScannerMutation.mutate(newScannerData)} disabled={assignScannerMutation.isPending || !newScannerData.userId}>
                {assignScannerMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Assegna
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scanner Access Dialog */}
        <Dialog open={showScannerAccessDialog} onOpenChange={setShowScannerAccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configura Accesso Scanner</DialogTitle>
              <DialogDescription>
                {selectedScannerForAccess && `Configura i settori per ${selectedScannerForAccess.user?.firstName || ''} ${selectedScannerForAccess.user?.lastName || ''}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Accesso a tutti i settori</div>
                  <div className="text-sm text-muted-foreground">Può scansionare biglietti di tutti i settori</div>
                </div>
                <Switch checked={scannerAccessAllSectors} onCheckedChange={(c) => { setScannerAccessAllSectors(c); if (c) setScannerAccessSelectedSectors([]); }} />
              </div>
              {!scannerAccessAllSectors && ticketedEvent?.sectors && ticketedEvent.sectors.length > 0 && (
                <div className="space-y-2">
                  <Label>Seleziona Settori</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ticketedEvent.sectors.map(sector => (
                      <div key={sector.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer" onClick={() => toggleSectorSelection(sector.id)}>
                        <input type="checkbox" checked={scannerAccessSelectedSectors.includes(sector.id)} onChange={() => toggleSectorSelection(sector.id)} className="h-4 w-4" />
                        <div>{sector.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScannerAccessDialog(false)}>Annulla</Button>
              <Button onClick={handleSaveScannerAccess} disabled={updateScannerAccessMutation.isPending || (!scannerAccessAllSectors && scannerAccessSelectedSectors.length === 0)}>
                {updateScannerAccessMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sector Creation Dialog - Desktop */}
        <Dialog open={isSectorDialogOpen} onOpenChange={setIsSectorDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nuovo Biglietto</DialogTitle>
              <DialogDescription>
                Crea un nuovo tipo di biglietto per questo evento
              </DialogDescription>
            </DialogHeader>
            <Form {...sectorForm}>
              <form onSubmit={sectorForm.handleSubmit(onSubmitSector)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={sectorForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Biglietto</FormLabel>
                        <FormControl>
                          <Input placeholder="es. Ingresso Standard" {...field} data-testid="input-sector-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sectorForm.control}
                    name="ticketType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipologia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ticket-type">
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INT">Intero</SelectItem>
                            <SelectItem value="RID">Ridotto</SelectItem>
                            <SelectItem value="OMA">Omaggio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={sectorForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo €</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="10.00" 
                            {...field} 
                            disabled={sectorForm.watch("ticketType") === "OMA"}
                            data-testid="input-price" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sectorForm.control}
                    name="ddp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DDP €</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-ddp" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sectorForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantità</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-sector-capacity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={sectorForm.control}
                    name="ivaRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aliquota IVA</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-iva-rate">
                              <SelectValue placeholder="Seleziona IVA" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="22">22%</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sectorForm.control}
                    name="isNumbered"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 pt-8">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-numbered"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Posti numerati</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSectorDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSectorMutation.isPending}
                    data-testid="button-submit-sector"
                  >
                    {createSectorMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
                    ) : (
                      'Crea Biglietto'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Subscription Type Creation Dialog - Desktop */}
        <Dialog open={isSubscriptionTypeDialogOpen} onOpenChange={setIsSubscriptionTypeDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nuovo Abbonamento</DialogTitle>
              <DialogDescription>
                Crea un nuovo tipo di abbonamento per questo evento
              </DialogDescription>
            </DialogHeader>
            <Form {...subscriptionTypeForm}>
              <form onSubmit={subscriptionTypeForm.handleSubmit(onSubmitSubscriptionType)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={subscriptionTypeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Abbonamento</FormLabel>
                        <FormControl>
                          <Input placeholder="es. Pass Weekend" {...field} data-testid="input-subscription-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={subscriptionTypeForm.control}
                    name="turnType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Turno</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subscription-turn-type">
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="F">Fisso</SelectItem>
                            <SelectItem value="L">Libero</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={subscriptionTypeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrizione abbonamento" {...field} data-testid="input-subscription-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={subscriptionTypeForm.control}
                    name="eventsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N. Eventi</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            placeholder="3"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-subscription-events-count"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={subscriptionTypeForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo €</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50.00" {...field} data-testid="input-subscription-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={subscriptionTypeForm.control}
                    name="maxQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantità Max</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0}
                            placeholder="Illimitato"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-subscription-max-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={subscriptionTypeForm.control}
                  name="ivaRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aliquota IVA</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-subscription-iva-rate">
                            <SelectValue placeholder="Seleziona IVA" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="22">22%</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSubscriptionTypeDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSubscriptionTypeMutation.isPending}
                    data-testid="button-submit-subscription-type"
                  >
                    {createSubscriptionTypeMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
                    ) : (
                      'Crea Abbonamento'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Subscription Type Dialog - Desktop */}
        <Dialog open={isEditSubscriptionTypeDialogOpen} onOpenChange={setIsEditSubscriptionTypeDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifica Abbonamento</DialogTitle>
              <DialogDescription>
                Modifica le impostazioni del tipo abbonamento
              </DialogDescription>
            </DialogHeader>
            <Form {...editSubscriptionTypeForm}>
              <form onSubmit={editSubscriptionTypeForm.handleSubmit((data) => {
                updateSubscriptionTypeMutation.mutate({
                  id: editingSubscriptionTypeData?.id,
                  name: data.name,
                  description: data.description,
                  turnType: data.turnType,
                  eventsCount: data.eventsCount,
                  price: data.price,
                  ivaRate: data.ivaRate,
                  maxQuantity: data.maxQuantity,
                });
              })} className="space-y-4">
                <FormField
                  control={editSubscriptionTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Abbonamento</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Pass Weekend" {...field} data-testid="input-edit-subscription-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editSubscriptionTypeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrizione abbonamento" {...field} data-testid="input-edit-subscription-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editSubscriptionTypeForm.control}
                    name="turnType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Turno</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-subscription-turn-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="F">Fisso</SelectItem>
                            <SelectItem value="L">Libero</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editSubscriptionTypeForm.control}
                    name="eventsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero Eventi</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-edit-subscription-events-count"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editSubscriptionTypeForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo (€)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} data-testid="input-edit-subscription-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editSubscriptionTypeForm.control}
                    name="ivaRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aliquota IVA</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-subscription-iva-rate">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="22">22%</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editSubscriptionTypeForm.control}
                  name="maxQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantità Massima (opzionale)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          placeholder="Lascia vuoto per illimitato"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-edit-subscription-max-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditSubscriptionTypeDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateSubscriptionTypeMutation.isPending}
                    data-testid="button-submit-edit-subscription-type"
                  >
                    {updateSubscriptionTypeMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                    ) : (
                      'Salva'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout 
      header={mobileHeader}
      className="bg-background"
      data-testid="page-event-hub"
    >
      <AnimatePresence>
        {alerts.filter(a => !a.dismissed).map(alert => (
          <div key={alert.id} className="px-4 pt-2">
            <AlertBanner alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          </div>
        ))}
      </AnimatePresence>

      {/* Quick Actions Sheet */}
      <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
        <SheetContent className="p-4">
          <div className="flex items-start justify-between">
            <SheetHeader className="pb-4 flex-1">
              <SheetTitle className="text-lg">Azioni Rapide</SheetTitle>
              <SheetDescription className="text-sm">
                Operazioni veloci per gestire l'evento
              </SheetDescription>
            </SheetHeader>
            <HapticButton 
              variant="ghost" 
              size="icon" 
              onClick={() => setQuickActionsOpen(false)}
              className="h-11 w-11 rounded-full -mt-1 -mr-2"
              data-testid="button-close-quick-actions"
            >
              <X className="h-5 w-5" />
            </HapticButton>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <QuickActionButton
              icon={QrCode}
              label="Scansiona QR"
              onClick={() => {
                setQuickActionsOpen(false);
                navigate('/scanner');
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
                navigate(`/events/${id}/direct-stock`);
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

      <div className="px-4 pb-24">
        <div className="grid grid-cols-2 gap-4 mb-6">
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

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            triggerHaptic('light');
            setActiveTab(value);
          }} 
          className="space-y-6"
        >
          <div className="relative -mx-4" data-testid="tabs-scroll-wrapper">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            <div className="overflow-x-auto scrollbar-hide px-4 pb-2" data-testid="tabs-scroll-container">
              <TabsList className="inline-flex h-auto p-1.5 bg-muted/50 rounded-2xl gap-1 min-w-max">
                {[
                  { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
                  { id: 'biglietteria', label: 'Biglietteria', icon: Ticket },
                  { id: 'cashiers', label: 'Cassieri', icon: Banknote },
                  { id: 'guests', label: 'Ospiti', icon: Users },
                  { id: 'tables', label: 'Tavoli', icon: Armchair },
                  { id: 'staff', label: 'Staff', icon: Shield },
                  { id: 'pr', label: 'PR', icon: Megaphone },
                  { id: 'access', label: 'Accessi', icon: QrCode },
                  ...(userFeatures?.beverageEnabled !== false ? [{ id: 'inventory', label: 'Stock', icon: Package }] : []),
                  { id: 'finance', label: 'Finanza', icon: Euro },
                  { id: 'report', label: 'Report', icon: BarChart3 },
                  ...(ticketedEvent ? [{ id: 'page-editor', label: 'Pagina', icon: Palette }] : []),
                ].map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap text-sm font-medium transition-all"
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader className="pb-3 px-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Stato Evento
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="flex items-center gap-2">
                    {Object.entries(statusConfig).map(([key, config], index) => {
                      const isActive = event.status === key;
                      const isPassed = Object.keys(statusConfig).indexOf(event.status) > index;
                      const IconComponent = config.icon;
                      
                      return (
                        <div key={key} className="flex items-center flex-1">
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <motion.div 
                              className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                                isActive 
                                  ? 'border-primary bg-primary text-primary-foreground' 
                                  : isPassed 
                                  ? 'border-primary bg-primary/20 text-primary' 
                                  : 'border-muted bg-muted/20 text-muted-foreground'
                              }`}
                              animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                              transition={springConfig}
                            >
                              <IconComponent className="h-5 w-5" />
                            </motion.div>
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
                <CardHeader className="pb-3 px-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-400" />
                    Azioni Rapide
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="grid grid-cols-3 gap-3">
                      <QuickActionButton
                        icon={QrCode}
                        label="Scansiona"
                        onClick={() => navigate('/scanner')}
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
                      {(userFeatures?.beverageEnabled !== false) && (
                        <QuickActionButton
                          icon={Package}
                          label="Stock"
                          onClick={() => navigate(`/events/${id}/direct-stock`)}
                          testId="overview-stock"
                        />
                      )}
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
                    <CardHeader className="pb-3 px-3 sm:px-4 md:px-6">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Note Evento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 md:px-6">
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

              <TopConsumptionsWidget eventId={id || ''} />
              
              <Card className="glass-card">
                <CardHeader className="pb-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-emerald-400" />
                      Attività Live
                    </CardTitle>
                    <LiveIndicator isLive={isLive} />
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <ScrollArea className="h-[280px] pr-4">
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
                <CardHeader className="pb-3 px-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-400" />
                    Avvisi
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="space-y-3">
                    {alerts.length === 0 && eventStocks.length < 5 && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-400">Scorte Basse</p>
                          <p className="text-xs text-muted-foreground">Meno di 5 prodotti in evento</p>
                        </div>
                      </div>
                    )}
                    {alerts.length === 0 && tables.length > 0 && bookedTables === tables.length && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-emerald-400">Tavoli Completi</p>
                          <p className="text-xs text-muted-foreground">Tutti i tavoli sono prenotati</p>
                        </div>
                      </div>
                    )}
                    {alerts.length === 0 && !ticketedEvent && guestLists.length === 0 && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Bell className="h-5 w-5 text-blue-400 flex-shrink-0" />
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
          </TabsContent>

          <TabsContent value="biglietteria">
            <Tabs defaultValue="biglietti" className="w-full">
              <div className="relative -mx-4 mb-4">
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
                <div className="overflow-x-auto scrollbar-hide px-4">
                  <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-xl gap-1 min-w-max">
                    <TabsTrigger value="biglietti" className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm" data-testid="subtab-biglietti-mobile">
                      <Ticket className="h-4 w-4" />
                      <span>Biglietti</span>
                    </TabsTrigger>
                    <TabsTrigger value="transazioni" className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm" data-testid="subtab-transazioni-mobile">
                      <Banknote className="h-4 w-4" />
                      <span>Transazioni</span>
                    </TabsTrigger>
                    <TabsTrigger value="report" className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm" data-testid="subtab-report-mobile">
                      <BarChart3 className="h-4 w-4" />
                      <span>Report</span>
                    </TabsTrigger>
                    <TabsTrigger value="online" className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm" data-testid="subtab-online-mobile">
                      <Eye className="h-4 w-4" />
                      <span>Online</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="biglietti">
                {ticketedEvent ? (
                  <div className="space-y-6">
                    <Card className="glass-card">
                      <CardHeader className="px-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Ticket className="h-5 w-5 text-blue-400" />
                            Riepilogo Biglietteria
                          </CardTitle>
                          <Badge variant={ticketedEvent.ticketingStatus === 'active' ? 'default' : 'secondary'}>
                            {ticketedEvent.ticketingStatus === 'active' ? 'Attiva' : 
                             ticketedEvent.ticketingStatus === 'draft' ? 'Bozza' : 
                             ticketedEvent.ticketingStatus === 'suspended' ? 'Sospesa' : 'Chiusa'}
                          </Badge>
                        </div>
                      </CardHeader>
                  <CardContent className="px-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-xl bg-background/50 border" data-testid="stat-sold">
                        <div className="text-2xl font-bold text-blue-400">{ticketedEvent.ticketsSold}</div>
                        <div className="text-xs text-muted-foreground">Venduti</div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 border" data-testid="stat-available">
                        <div className="text-2xl font-bold text-emerald-400">{ticketedEvent.totalCapacity - ticketedEvent.ticketsSold}</div>
                        <div className="text-xs text-muted-foreground">Disponibili</div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 border" data-testid="stat-cancelled">
                        <div className="text-2xl font-bold text-rose-400">{ticketedEvent.ticketsCancelled}</div>
                        <div className="text-xs text-muted-foreground">Annullati</div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 border" data-testid="stat-revenue">
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

                {!selectedSectorId ? (
                  <>
                    {/* Sector Cards for Drill-down */}
                    <Card className="glass-card">
                      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="h-5 w-5 text-cyan-400" />
                          Settori Biglietti
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <HapticButton
                              variant="outline"
                              size="sm"
                              data-testid="button-sector-actions-mobile"
                              className="min-h-[44px]"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Azioni
                            </HapticButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              if (ticketedEvent?.sectors?.[0]) {
                                handleEditSector(ticketedEvent.sectors[0].id);
                              }
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Modifica Settore
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              if (ticketedEvent?.sectors?.[0]) {
                                setEditingSector(ticketedEvent.sectors[0]);
                                setEditingCapacity(String(ticketedEvent.sectors[0].capacity));
                              }
                            }}>
                              <Hash className="h-4 w-4 mr-2" />
                              Modifica Capienza
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              if (ticketedEvent?.sectors?.[0]) {
                                const sector = ticketedEvent.sectors[0];
                                updateSectorMutation.mutate({
                                  ...sector,
                                  active: !sector.active,
                                });
                              }
                            }}>
                              {(() => {
                                const sector = ticketedEvent?.sectors?.[0];
                                return sector?.active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Disattiva Settore
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Attiva Settore
                                  </>
                                );
                              })()}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="px-4">
                        {ticketedEvent.sectors && ticketedEvent.sectors.length > 0 ? (
                          <div className="space-y-3">
                            {ticketedEvent.sectors.map((sector) => {
                              const soldCount = sector.capacity - sector.availableSeats;
                              const sectorTickets = siaeTickets.filter(t => t.sectorId === sector.id);
                              const minPrice = Math.min(Number(sector.priceIntero), sector.priceRidotto ? Number(sector.priceRidotto) : Infinity);
                              const maxPrice = Math.max(Number(sector.priceIntero), sector.priceRidotto ? Number(sector.priceRidotto) : 0);
                              
                              return (
                                <motion.div 
                                  key={sector.id} 
                                  className="p-4 rounded-xl bg-background/50 border cursor-pointer"
                                  data-testid={`sector-card-mobile-${sector.id}`}
                                  whileTap={{ scale: 0.98 }}
                                  transition={springConfig}
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setSelectedSectorId(sector.id);
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium text-base">{sector.name}</h4>
                                      <Badge variant={sector.active ? 'default' : 'secondary'} className="text-xs">
                                        {sector.active ? 'Attivo' : 'Disattivato'}
                                      </Badge>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                    <span>{minPrice === maxPrice ? `€${minPrice.toFixed(2)}` : `€${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}`}</span>
                                  </div>
                                  <Progress value={sector.capacity > 0 ? (soldCount / sector.capacity) * 100 : 0} className="h-2 mb-2" />
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      <span className="font-semibold text-blue-400">{soldCount}</span>/{sector.capacity} venduti
                                    </span>
                                    <span className="text-xs text-muted-foreground">{sectorTickets.length} biglietti</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nessun settore configurato</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Subscription Types Section - Mobile */}
                    <Card className="glass-card">
                      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Users className="h-5 w-5 text-purple-400" />
                          Abbonamenti
                        </CardTitle>
                        <HapticButton
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSubscriptionTypeDialogOpen(true)}
                          data-testid="button-new-subscription-type-mobile"
                          className="min-h-[44px]"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nuovo
                        </HapticButton>
                      </CardHeader>
                      <CardContent className="px-4">
                        {subscriptionTypes && subscriptionTypes.length > 0 ? (
                          <div className="space-y-3">
                            {subscriptionTypes.map((subType: any) => {
                              const soldCount = subType.soldCount || 0;
                              const maxQuantity = subType.maxQuantity || 0;
                              const isSoldOut = maxQuantity > 0 && soldCount >= maxQuantity;
                              
                              return (
                                <motion.div 
                                  key={subType.id} 
                                  className="p-4 rounded-xl bg-background/50 border cursor-pointer"
                                  data-testid={`subscription-type-card-mobile-${subType.id}`}
                                  whileTap={{ scale: 0.98 }}
                                  transition={springConfig}
                                  onClick={() => handleEditSubscriptionType(subType.id)}
                                >
                                  <div className="flex items-center justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium text-base">{subType.name}</h4>
                                      <Badge variant={isSoldOut ? 'destructive' : subType.active !== false ? 'default' : 'secondary'} className="text-xs">
                                        {isSoldOut ? 'Esaurito' : subType.active !== false ? 'Attivo' : 'Disattivato'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {subType.turnType === 'fixed' ? 'Fisso' : 'Libero'}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditSubscriptionType(subType.id);
                                        }}
                                        data-testid={`button-edit-subscription-type-mobile-${subType.id}`}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                    <span>€{Number(subType.price || 0).toFixed(2)}</span>
                                    <span>•</span>
                                    <span>{subType.eventsCount || 0} eventi</span>
                                  </div>
                                  {maxQuantity > 0 && (
                                    <>
                                      <Progress value={maxQuantity > 0 ? (soldCount / maxQuantity) * 100 : 0} className="h-2 mb-2" />
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          <span className="font-semibold text-blue-400">{soldCount}</span>/{maxQuantity} venduti
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  {!maxQuantity && (
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        <span className="font-semibold text-blue-400">{soldCount}</span> venduti
                                      </span>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nessun abbonamento configurato</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    {/* Ticket List for Selected Sector - Mobile */}
                    <Card className="glass-card">
                      <CardHeader className="px-4">
                        <div className="flex items-center gap-3">
                          <HapticButton
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              triggerHaptic('light');
                              setSelectedSectorId(null);
                            }}
                            data-testid="button-back-to-sectors-mobile"
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </HapticButton>
                          <div>
                            <CardTitle className="text-lg">{getSectorName(selectedSectorId)}</CardTitle>
                            <CardDescription>Biglietti emessi</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                            <SelectTrigger className="flex-1" data-testid="select-status-filter-mobile">
                              <SelectValue placeholder="Filtra stato" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tutti gli stati</SelectItem>
                              <SelectItem value="valid">Validi</SelectItem>
                              <SelectItem value="used">Usati</SelectItem>
                              <SelectItem value="cancelled">Annullati</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(() => {
                          const sectorTickets = siaeTickets.filter(t => t.sectorId === selectedSectorId);
                          const filteredSectorTickets = ticketStatusFilter === 'all' 
                            ? sectorTickets 
                            : sectorTickets.filter(t => t.status === ticketStatusFilter);
                          const displayedSectorTickets = filteredSectorTickets.slice(0, ticketsDisplayLimit);
                          
                          if (sectorTickets.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Nessun biglietto emesso</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-2">
                              {displayedSectorTickets.map(ticket => (
                                <motion.div
                                  key={ticket.id}
                                  className="p-3 rounded-lg bg-background/50 border cursor-pointer"
                                  whileTap={{ scale: 0.98 }}
                                  transition={springConfig}
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setSelectedTicketForDetail(ticket);
                                    setShowTicketDetailSheet(true);
                                  }}
                                  data-testid={`ticket-row-mobile-${ticket.id}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-medium">#{ticket.progressiveNumber}</span>
                                        {getTicketStatusBadge(ticket.status)}
                                      </div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {ticket.participantFirstName || ticket.participantLastName 
                                          ? `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim()
                                          : 'Partecipante non specificato'
                                        }
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-emerald-400">€{Number(ticket.grossAmount).toFixed(2)}</span>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                              {filteredSectorTickets.length > ticketsDisplayLimit && (
                                <HapticButton
                                  variant="outline"
                                  className="w-full mt-4"
                                  onClick={() => setTicketsDisplayLimit(prev => prev + 20)}
                                >
                                  Carica altri ({filteredSectorTickets.length - ticketsDisplayLimit} rimanenti)
                                </HapticButton>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Quick Navigation Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto py-6 flex items-center justify-between gap-4 hover-elevate"
                    onClick={() => navigate(`/siae/transactions/${ticketedEvent?.id}`)}
                    data-testid="btn-view-all-transactions"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-6 w-6 text-amber-400" />
                      <div className="text-left">
                        <div className="font-medium">Transazioni</div>
                        <div className="text-xs text-muted-foreground">{siaeTransactions.length} registrate</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-6 flex items-center justify-between gap-4 hover-elevate"
                    onClick={() => navigate(`/siae/tickets/${ticketedEvent?.id}`)}
                    data-testid="btn-view-all-tickets"
                  >
                    <div className="flex items-center gap-3">
                      <Ticket className="h-6 w-6 text-emerald-400" />
                      <div className="text-left">
                        <div className="font-medium">Biglietti Emessi</div>
                        <div className="text-xs text-muted-foreground">{siaeTickets.length} totali</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Dialog Modifica Quantità */}
                <Dialog open={!!editingSector} onOpenChange={(open) => !open && setEditingSector(null)}>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6">
                    <DialogHeader className="pb-3 sm:pb-4">
                      <DialogTitle className="text-base sm:text-lg">Modifica Quantità</DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm">
                        Modifica la quantità disponibile per "{editingSector?.name}"
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                      <div className="space-y-2">
                        <Label htmlFor="capacity" className="text-xs sm:text-sm">Quantità Totale</Label>
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
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                      <Button variant="outline" onClick={() => setEditingSector(null)} data-testid="btn-cancel-edit" className="w-full sm:w-auto">
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
                        className="w-full sm:w-auto"
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
              <>
                <Card className="glass-card">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Biglietteria Non Attiva</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Attiva la biglietteria SIAE per vendere biglietti
                      </p>
                      <Button onClick={() => setIsActivateTicketingOpen(true)} data-testid="btn-activate-ticketing">
                        Attiva Biglietteria
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Activate Ticketing Dialog */}
                <Dialog open={isActivateTicketingOpen} onOpenChange={setIsActivateTicketingOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-activate-ticketing">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-[#FFD700]" />
                        Attiva Biglietteria SIAE
                      </DialogTitle>
                      <DialogDescription>
                        Configura la biglietteria SIAE per questo evento
                      </DialogDescription>
                    </DialogHeader>

                    <Form {...activateTicketingForm}>
                      <form onSubmit={activateTicketingForm.handleSubmit(onSubmitActivateTicketing)} className="space-y-6" data-testid="form-activate-ticketing">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={activateTicketingForm.control}
                            name="genreCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Genere Evento (TAB.1)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-genre">
                                      <SelectValue placeholder="Seleziona genere" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {genres?.map((genre: any) => (
                                      <SelectItem key={genre.code} value={genre.code}>
                                        {genre.code} - {genre.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={activateTicketingForm.control}
                            name="taxType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo Fiscale</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-tax-type">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="S">Spettacolo</SelectItem>
                                    <SelectItem value="I">Intrattenimento</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={activateTicketingForm.control}
                            name="totalCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Capienza Totale</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="input-capacity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={activateTicketingForm.control}
                            name="maxTicketsPerUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Biglietti per Utente</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="input-max-tickets"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={activateTicketingForm.control}
                          name="ivaPreassolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IVA Preassolta</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-iva">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="N">No</SelectItem>
                                  <SelectItem value="B">Base</SelectItem>
                                  <SelectItem value="F">Forfait</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                          <h4 className="font-medium">Opzioni Nominatività</h4>
                          
                          <FormField
                            control={activateTicketingForm.control}
                            name="requiresNominative"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-sm">Biglietti Nominativi</FormLabel>
                                  <FormDescription className="text-xs">
                                    I biglietti saranno associati al nome dell'acquirente
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-nominative"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={activateTicketingForm.control}
                            name="allowsChangeName"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-sm">Consenti Cambio Nome</FormLabel>
                                  <FormDescription className="text-xs">
                                    Solo per eventi con capienza {">"} 5000
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-change-name"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={activateTicketingForm.control}
                            name="allowsResale"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-sm">Consenti Rivendita</FormLabel>
                                  <FormDescription className="text-xs">
                                    Solo per eventi con capienza {">"} 5000
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-resale"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#FFD700]" />
                            <h4 className="font-medium">Tipi Abbonamento (Opzionale)</h4>
                          </div>
                          
                          {pendingSubscriptionTypes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {pendingSubscriptionTypes.map((subType, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border text-sm"
                                  data-testid={`pending-sub-type-${index}`}
                                >
                                  <span className="font-medium">{subType.name}</span>
                                  <span className="text-muted-foreground">-</span>
                                  <span>{subType.eventsCount} eventi</span>
                                  <span className="text-muted-foreground">-</span>
                                  <span className="text-[#FFD700]">{"\u20AC"}{subType.price}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 ml-1"
                                    onClick={() => {
                                      setPendingSubscriptionTypes(prev => prev.filter((_, i) => i !== index));
                                    }}
                                    data-testid={`remove-sub-type-${index}`}
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {showSubTypeForm ? (
                            <div className="space-y-3 p-3 rounded-md bg-background/50 border">
                              <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-2">
                                  <Label className="text-xs">Nome</Label>
                                  <Input
                                    value={newSubTypeName}
                                    onChange={(e) => setNewSubTypeName(e.target.value)}
                                    placeholder="es. Pass 3 Giorni"
                                    data-testid="input-new-sub-type-name"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Turno</Label>
                                  <Select value={newSubTypeTurnType} onValueChange={setNewSubTypeTurnType}>
                                    <SelectTrigger data-testid="select-new-sub-type-turn">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="F">Fisso</SelectItem>
                                      <SelectItem value="L">Libero</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">N. Eventi</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={newSubTypeEventsCount}
                                    onChange={(e) => setNewSubTypeEventsCount(parseInt(e.target.value) || 1)}
                                    data-testid="input-new-sub-type-events"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-2">
                                  <Label className="text-xs">Prezzo ({"\u20AC"})</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={newSubTypePrice}
                                    onChange={(e) => setNewSubTypePrice(e.target.value)}
                                    placeholder="0.00"
                                    data-testid="input-new-sub-type-price"
                                  />
                                </div>
                                <div className="col-span-2 flex items-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      if (newSubTypeName && newSubTypePrice) {
                                        setPendingSubscriptionTypes(prev => [...prev, {
                                          name: newSubTypeName,
                                          turnType: newSubTypeTurnType,
                                          eventsCount: newSubTypeEventsCount,
                                          price: newSubTypePrice,
                                        }]);
                                        setNewSubTypeName("");
                                        setNewSubTypeTurnType("F");
                                        setNewSubTypeEventsCount(1);
                                        setNewSubTypePrice("");
                                        setShowSubTypeForm(false);
                                      }
                                    }}
                                    disabled={!newSubTypeName || !newSubTypePrice}
                                    data-testid="button-add-sub-type"
                                  >
                                    Aggiungi
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setShowSubTypeForm(false);
                                      setNewSubTypeName("");
                                      setNewSubTypeTurnType("F");
                                      setNewSubTypeEventsCount(1);
                                      setNewSubTypePrice("");
                                    }}
                                  >
                                    Annulla
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowSubTypeForm(true)}
                              data-testid="button-show-sub-type-form"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Aggiungi Tipo
                            </Button>
                          )}
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsActivateTicketingOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" disabled={activateTicketingMutation.isPending} data-testid="button-submit-activate-ticketing">
                            {activateTicketingMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Attivazione...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Attiva Biglietteria
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </>
            )}

                {/* Cancel Ticket Dialog */}
                <AlertDialog open={cancelTicketDialogOpen} onOpenChange={setCancelTicketDialogOpen}>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
                    <AlertDialogHeader className="pb-3 sm:pb-4">
                      <AlertDialogTitle className="text-base sm:text-lg">Annulla Biglietto</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        Stai per annullare il biglietto{' '}
                        <span className="font-mono font-semibold">
                          {ticketToCancel?.fiscalSealCode || ticketToCancel?.progressiveNumber || ticketToCancel?.id.slice(0, 8)}
                        </span>.
                        Questa azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                      <div className="space-y-2">
                        <Label htmlFor="cancel-reason" className="text-xs sm:text-sm">Causale Annullamento</Label>
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
                        <Label htmlFor="cancel-note" className="text-xs sm:text-sm">Note aggiuntive (opzionale)</Label>
                        <Textarea
                          id="cancel-note"
                          value={cancelNote}
                          onChange={(e) => setCancelNote(e.target.value)}
                          placeholder="Descrivi il motivo dell'annullamento..."
                          className="resize-none min-h-[80px]"
                          data-testid="input-cancel-note"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                      <AlertDialogCancel data-testid="button-cancel-dialog-close" className="w-full sm:w-auto">Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={confirmCancelTicket}
                        className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
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

              <TabsContent value="transazioni" data-testid="subtab-transazioni-content-mobile">
                <Card className="glass-card">
                  <CardHeader className="px-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5 text-amber-400" />
                      Transazioni
                    </CardTitle>
                    <CardDescription>Elenco di tutte le transazioni dell'evento</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 space-y-4">
                    <div className="flex gap-2">
                      <Select value={transactionPaymentMethodFilter} onValueChange={setTransactionPaymentMethodFilter}>
                        <SelectTrigger className="flex-1 min-h-[44px]" data-testid="subtab-transazioni-filter-payment-mobile">
                          <SelectValue placeholder="Metodo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti</SelectItem>
                          <SelectItem value="card">Carta</SelectItem>
                          <SelectItem value="cash">Contanti</SelectItem>
                          <SelectItem value="bank_transfer">Bonifico</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={transactionStatusFilter} onValueChange={setTransactionStatusFilter}>
                        <SelectTrigger className="flex-1 min-h-[44px]" data-testid="subtab-transazioni-filter-status-mobile">
                          <SelectValue placeholder="Stato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti</SelectItem>
                          <SelectItem value="pending">In attesa</SelectItem>
                          <SelectItem value="completed">Completata</SelectItem>
                          <SelectItem value="failed">Fallita</SelectItem>
                          <SelectItem value="refunded">Rimborsata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {transactionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nessuna transazione registrata</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayedTransactions.map(transaction => (
                          <motion.div
                            key={transaction.id}
                            className="p-4 rounded-xl bg-background/50 border"
                            data-testid={`row-transaction-${transaction.id}`}
                            whileTap={{ scale: 0.98 }}
                            transition={springConfig}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-sm font-medium truncate">{transaction.transactionCode}</div>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.paymentCompletedAt ? format(new Date(transaction.paymentCompletedAt), 'dd/MM/yyyy HH:mm', { locale: it }) : '-'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-amber-400">€{Number(transaction.totalAmount).toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {getTransactionStatusBadge(transaction.status)}
                                <Badge variant="outline" className="text-xs">
                                  {getPaymentMethodLabel(transaction.paymentMethod)}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {transaction.ticketsCount} {transaction.ticketsCount === 1 ? 'biglietto' : 'biglietti'}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {filteredTransactions.length > transactionsDisplayLimit && (
                      <div className="text-center pt-2">
                        <HapticButton 
                          variant="outline" 
                          onClick={() => setTransactionsDisplayLimit(prev => prev + 20)} 
                          data-testid="subtab-transazioni-load-more-mobile"
                          className="min-h-[44px]"
                        >
                          Carica altri
                        </HapticButton>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="report">
                <div className="space-y-4">
                  <Card className="glass-card" data-testid="report-c1-card">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-blue-400" />
                        Registro C1 - Riepilogo
                      </CardTitle>
                      <CardDescription>Riepilogo corrispettivi giornalieri per tipo biglietto e canale</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 space-y-3">
                      <HapticButton 
                        className="w-full min-h-[44px]" 
                        onClick={() => handleReportC1('giornaliero')}
                        disabled={!ticketedEvent?.id}
                        data-testid="button-view-c1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizza Report C1
                      </HapticButton>
                      <div className="flex gap-2">
                        <HapticButton variant="outline" size="sm" className="flex-1 min-h-[40px]" data-testid="button-download-pdf-c1">
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </HapticButton>
                        <HapticButton variant="outline" size="sm" className="flex-1 min-h-[40px]" data-testid="button-download-csv-c1">
                          <Download className="h-4 w-4 mr-1" />
                          CSV
                        </HapticButton>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card" data-testid="report-c2-card">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-purple-400" />
                        Registro C2 - Dettaglio Biglietti
                      </CardTitle>
                      <CardDescription>Dettaglio di tutti i biglietti emessi con numerazione progressiva</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 space-y-3">
                      <HapticButton 
                        className="w-full min-h-[44px]" 
                        onClick={handleReportC2}
                        disabled={!ticketedEvent?.id}
                        data-testid="button-view-c2"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizza Report C2
                      </HapticButton>
                      <div className="flex gap-2">
                        <HapticButton variant="outline" size="sm" className="flex-1 min-h-[40px]" data-testid="button-download-pdf-c2">
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </HapticButton>
                        <HapticButton variant="outline" size="sm" className="flex-1 min-h-[40px]" data-testid="button-download-csv-c2">
                          <Download className="h-4 w-4 mr-1" />
                          CSV
                        </HapticButton>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card" data-testid="report-trasmissioni-card">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Send className="h-5 w-5 text-amber-400" />
                        Trasmissioni AE
                      </CardTitle>
                      <CardDescription>Stato delle trasmissioni all'Agenzia delle Entrate</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 space-y-3">
                      {ticketedEvent?.transmissionStatus && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                          <Badge variant={ticketedEvent.transmissionStatus === 'completed' ? 'default' : 'secondary'}>
                            {ticketedEvent.transmissionStatus === 'completed' ? 'Trasmesso' : 
                             ticketedEvent.transmissionStatus === 'pending' ? 'In Attesa' : 
                             ticketedEvent.transmissionStatus === 'failed' ? 'Errore' : 'Non Trasmesso'}
                          </Badge>
                        </div>
                      )}
                      <HapticButton 
                        className="w-full min-h-[44px]" 
                        variant="outline"
                        onClick={() => navigate(`/siae/transmissions?eventId=${id}`)}
                        data-testid="button-manage-transmissions"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Gestisci Trasmissioni
                      </HapticButton>
                    </CardContent>
                  </Card>

                  <Card className="glass-card" data-testid="report-annullamenti-card">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <RefreshCw className="h-5 w-5 text-rose-400" />
                        Registro Annullamenti e Rimborsi
                      </CardTitle>
                      <CardDescription>Biglietti annullati e rimborsi effettuati</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <div className="text-2xl font-bold text-rose-400">{ticketedEvent?.ticketsCancelled || 0}</div>
                          <div className="text-xs text-muted-foreground">Annullati</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <div className="text-2xl font-bold text-amber-400">{ticketedEvent?.ticketsRefunded || 0}</div>
                          <div className="text-xs text-muted-foreground">Rimborsati</div>
                        </div>
                      </div>
                      <HapticButton 
                        variant="outline" 
                        className="w-full min-h-[44px]"
                        onClick={() => navigate(`/siae/tickets?eventId=${id}&status=cancelled`)}
                        data-testid="button-view-cancellations"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizza Registro
                      </HapticButton>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="online">
                <div className="space-y-4" data-testid="online-visibility-card">
                  <Card className="glass-card">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Eye className="h-5 w-5 text-cyan-400" />
                        Visibilità Evento
                      </CardTitle>
                      <CardDescription>Gestisci la pubblicazione online dell'evento</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 space-y-4">
                      <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-background/50 border">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">Evento Pubblico</div>
                          <div className="text-xs text-muted-foreground">
                            {event?.isPublic 
                              ? "L'evento è visibile al pubblico" 
                              : "L'evento è visibile solo agli organizzatori"}
                          </div>
                        </div>
                        <Switch
                          checked={event?.isPublic ?? false}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            togglePublicMutation.mutate(checked);
                          }}
                          disabled={!event || event.status === 'closed' || togglePublicMutation.isPending}
                          data-testid="switch-public"
                        />
                      </div>

                      {ticketedEvent && (
                        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-background/50 border">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">Vendita Online Attiva</div>
                            <div className="text-xs text-muted-foreground">
                              {ticketedEvent.ticketingStatus === 'active'
                                ? "I biglietti sono acquistabili online"
                                : "La vendita online è disattivata"}
                            </div>
                          </div>
                          <Switch
                            checked={ticketedEvent.ticketingStatus === 'active'}
                            onCheckedChange={(checked) => {
                              triggerHaptic('light');
                              toggleTicketingStatusMutation.mutate(checked);
                            }}
                            disabled={!ticketedEvent || event?.status === 'closed' || toggleTicketingStatusMutation.isPending}
                            data-testid="switch-ticketing-active"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Link2 className="h-5 w-5 text-blue-400" />
                        Stato Pubblicazione
                      </CardTitle>
                      <CardDescription>URL e anteprima della pagina pubblica</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${event?.isPublic ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {event?.isPublic ? 'Online' : 'Offline'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {event?.isPublic ? getPublicEventUrl() : 'Pagina non pubblicata'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <HapticButton
                          variant="outline"
                          className="flex-1 min-h-[44px]"
                          onClick={copyUrlToClipboard}
                          disabled={!event?.isPublic}
                          data-testid="button-copy-url"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copia Link
                        </HapticButton>
                        <HapticButton
                          variant="outline"
                          className="flex-1 min-h-[44px]"
                          onClick={openPreview}
                          disabled={!event?.isPublic}
                          data-testid="button-preview"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Anteprima
                        </HapticButton>
                      </div>

                      {!event?.isPublic && (
                        <HapticButton
                          className="w-full min-h-[48px]"
                          onClick={() => togglePublicMutation.mutate(true)}
                          disabled={togglePublicMutation.isPending}
                          data-testid="button-publish"
                        >
                          {togglePublicMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Pubblicazione...
                            </>
                          ) : (
                            <>
                              <Megaphone className="h-4 w-4 mr-2" />
                              Pubblica Ora
                            </>
                          )}
                        </HapticButton>
                      )}

                      {ticketedEvent && ticketedEvent.ticketingStatus === 'active' && (
                        <AlertDialog open={pauseTicketingDialogOpen} onOpenChange={setPauseTicketingDialogOpen}>
                          <HapticButton
                            variant="outline"
                            className="w-full min-h-[44px] text-amber-400 border-amber-500/50"
                            onClick={() => setPauseTicketingDialogOpen(true)}
                            disabled={toggleTicketingStatusMutation.isPending || event?.status === 'closed'}
                            data-testid="button-suspend-ticketing"
                          >
                            {toggleTicketingStatusMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sospensione...
                              </>
                            ) : (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Sospendi Vendita
                              </>
                            )}
                          </HapticButton>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sospendere la vendita online?</AlertDialogTitle>
                              <AlertDialogDescription>
                                I biglietti non saranno più acquistabili online. Potrai riattivare la vendita in qualsiasi momento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  triggerHaptic('medium');
                                  toggleTicketingStatusMutation.mutate(false);
                                  setPauseTicketingDialogOpen(false);
                                }}
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                Sospendi Vendita
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cashiers">
            <div className="space-y-4 sm:space-y-6">
              {ticketedEvent ? (
                <EventCashierAllocations 
                  eventId={id || ''} 
                  siaeEventId={ticketedEvent?.id}
                />
              ) : (
                <Card className="glass-card">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Banknote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Biglietteria Non Attiva</h3>
                      <p className="text-sm text-muted-foreground">
                        Attiva la biglietteria per assegnare i cassieri
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="guests">
            <div className="space-y-4 sm:space-y-6">
              {e4uStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <div className="text-xl sm:text-2xl font-bold text-cyan-400">{e4uStats.lists?.total || guestLists.length}</div>
                    <div className="text-sm text-muted-foreground">Liste Attive</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-background/50 border">
                    <div className="text-xl sm:text-2xl font-bold">{(e4uStats.lists?.entries || 0) + (e4uStats.tables?.totalGuests || 0) || totalGuests}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Iscritti Totali</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-background/50 border">
                    <div className="text-xl sm:text-2xl font-bold text-emerald-400">{e4uStats.totalCheckIns || checkedInGuests}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Check-in</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-background/50 border">
                    <div className="text-xl sm:text-2xl font-bold">{(() => {
                      const total = (e4uStats.lists?.entries || 0) + (e4uStats.tables?.totalGuests || 0);
                      const checked = e4uStats.totalCheckIns || 0;
                      return total > 0 ? `${Math.round((checked / total) * 100)}%` : '--';
                    })()}</div>
                    <div className="text-sm text-muted-foreground">Tasso Check-in</div>
                  </div>
                </div>
              )}

              <Card className="glass-card">
                <CardHeader className="px-3 sm:px-4 md:px-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                      Liste Ospiti
                    </CardTitle>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Button 
                        onClick={() => setShowCreateListDialog(true)} 
                        size="sm"
                        data-testid="btn-create-list"
                      >
                        <Plus className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Nuova Lista</span>
                      </Button>
                      <Button onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)} variant="outline" size="sm" data-testid="btn-manage-lists">
                        <span className="hidden sm:inline">Gestisci</span> <ChevronRight className="h-4 w-4 sm:ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6">
                  {(e4uLists.length > 0 || guestLists.length > 0) ? (
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {(e4uLists.length > 0 ? e4uLists : guestLists).map((list: any) => {
                        const entryCount = list.entryCount || list.currentCount || 0;
                        const checkedIn = list.checkedInCount || 0;
                        const maxCapacity = list.maxCapacity || list.maxGuests || 0;
                        const capacityPercent = maxCapacity > 0 ? (entryCount / maxCapacity) * 100 : 0;

                        return (
                          <div 
                            key={list.id} 
                            className="flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border hover:border-cyan-500/50 transition-colors"
                            data-testid={`list-item-${list.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h4 className="font-medium text-sm sm:text-base truncate">{list.name}</h4>
                                {list.price && (
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">€{list.price}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 sm:gap-4 mt-1 text-[10px] sm:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {entryCount}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {checkedIn}
                                </span>
                              </div>
                              {maxCapacity > 0 && (
                                <div className="mt-1.5 sm:mt-2">
                                  <Progress value={capacityPercent} className="h-1 sm:h-1.5" />
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{entryCount}/{maxCapacity}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => navigate(`/pr/guest-lists?eventId=${id}&listId=${list.id}`)}
                                data-testid={`btn-view-list-${list.id}`}
                              >
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => navigate(`/pr/guest-lists?eventId=${id}&listId=${list.id}&add=true`)}
                                data-testid={`btn-add-to-list-${list.id}`}
                              >
                                <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            <div className="space-y-4 sm:space-y-6">
              {(() => {
                const pendingReservations = e4uReservations.filter((r: any) => r.status === 'pending');
                const approvedReservations = e4uReservations.filter((r: any) => r.status === 'approved' || r.status === 'confirmed');
                
                return (
                  <>
                    {(e4uTableTypes.length > 0 || pendingReservations.length > 0) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        <div className="p-3 sm:p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <div className="text-xl sm:text-2xl font-bold text-purple-400">{e4uTableTypes.length || tables.length}</div>
                          <div className="text-sm text-muted-foreground">Tipologie Tavoli</div>
                        </div>
                        <div className="p-3 sm:p-4 rounded-lg bg-background/50 border">
                          <div className="text-xl sm:text-2xl font-bold">{bookedTables}/{tables.length}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Prenotati</div>
                        </div>
                        {pendingReservations.length > 0 && (
                          <div className="p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="text-xl sm:text-2xl font-bold text-amber-400">{pendingReservations.length}</div>
                            <div className="text-sm text-muted-foreground">In Attesa</div>
                          </div>
                        )}
                        <div className="p-3 sm:p-4 rounded-lg bg-background/50 border">
                          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{approvedReservations.length}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Confermate</div>
                        </div>
                      </div>
                    )}

                    <Card className="glass-card">
                      <CardHeader className="px-3 sm:px-4 md:px-6">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Armchair className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                            <span className="hidden sm:inline">Tipologie Tavoli</span>
                            <span className="sm:hidden">Tavoli</span>
                          </CardTitle>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Button 
                              onClick={() => setShowCreateTableTypeDialog(true)} 
                              size="sm"
                              data-testid="btn-create-table-type"
                            >
                              <Plus className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Nuova Tipologia</span>
                            </Button>
                            <Button onClick={() => navigate(`/pr/tables?eventId=${id}`)} variant="outline" size="sm" data-testid="btn-manage-tables">
                              <span className="hidden sm:inline">Gestisci</span> <ChevronRight className="h-4 w-4 sm:ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-4 md:px-6">
                        {(e4uTableTypes.length > 0 || tables.length > 0) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
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
                                  className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border hover:border-purple-500/50 transition-colors"
                                  data-testid={`table-type-${tableType.id}`}
                                >
                                  <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                                    <h4 className="font-medium capitalize text-sm sm:text-base truncate">{tableType.name}</h4>
                                    {tableType.price && (
                                      <Badge className="bg-purple-500/20 text-purple-400 text-[10px] sm:text-xs px-1.5 sm:px-2">€{tableType.price}</Badge>
                                    )}
                                  </div>
                                  <div className="text-[10px] sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">
                                    {tableType.maxGuests && <span className="hidden sm:inline">{tableType.maxGuests} max • </span>}
                                    <span className={available > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {available}
                                    </span>/{tableType.totalQuantity}
                                  </div>
                                  <Progress value={100 - availablePercent} className="h-1 sm:h-1.5" />
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
                        <CardHeader className="px-3 sm:px-4 md:px-6">
                          <CardTitle className="flex items-center gap-2 text-amber-400 text-base sm:text-lg">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="hidden sm:inline">Prenotazioni in Attesa</span>
                            <span className="sm:hidden">In Attesa</span> ({pendingReservations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-4 md:px-6">
                          <div className="space-y-2 sm:space-y-3">
                            {pendingReservations.map((reservation: any) => (
                              <div 
                                key={reservation.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
                                data-testid={`pending-reservation-${reservation.id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <span className="font-medium text-sm sm:text-base truncate">{reservation.customerName}</span>
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">{reservation.tableTypeName || reservation.tableType}</Badge>
                                  </div>
                                  <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                                    {reservation.guestsCount} ospiti <span className="hidden sm:inline">• {reservation.phone || reservation.email || 'N/D'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => approveReservationMutation.mutate(reservation.id)}
                                    disabled={approveReservationMutation.isPending}
                                    data-testid={`btn-approve-${reservation.id}`}
                                  >
                                    {approveReservationMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 sm:mr-1" />
                                    )}
                                    <span className="hidden sm:inline">Approva</span>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => rejectReservationMutation.mutate({ reservationId: reservation.id })}
                                    disabled={rejectReservationMutation.isPending}
                                    data-testid={`btn-reject-${reservation.id}`}
                                  >
                                    <X className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Rifiuta</span>
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
                        <CardHeader className="px-3 sm:px-4 md:px-6">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                            <span className="hidden sm:inline">Prenotazioni Confermate</span>
                            <span className="sm:hidden">Confermate</span> ({approvedReservations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-4 md:px-6">
                          <div className="space-y-2 sm:space-y-3">
                            {approvedReservations.slice(0, 5).map((reservation: any) => (
                              <div 
                                key={reservation.id}
                                className="flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-background/50 border"
                                data-testid={`approved-reservation-${reservation.id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-sm sm:text-base truncate block">{reservation.customerName}</span>
                                  <span className="text-[10px] sm:text-sm text-muted-foreground">
                                    {reservation.guestsCount} <span className="hidden sm:inline">ospiti •</span> {reservation.tableTypeName || reservation.tableType}
                                  </span>
                                </div>
                                <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs px-1.5 sm:px-2">Confermata</Badge>
                              </div>
                            ))}
                            {approvedReservations.length > 5 && (
                              <Button variant="ghost" className="w-full text-sm" onClick={() => navigate(`/pr/tables?eventId=${id}`)}>
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
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-teal-500/10 border border-teal-500/30" data-testid="stat-staff-count">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-teal-400">{e4uStaff.length}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Staff Attivi</div>
                </div>
              </div>

              {/* Staff Section */}
              <Card className="glass-card">
                <CardHeader className="px-3 sm:px-4 md:px-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-teal-400" />
                      Staff
                    </CardTitle>
                    <Button 
                      onClick={() => setShowAssignStaffDialog(true)} 
                      size="sm"
                      data-testid="btn-assign-staff"
                    >
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Assegna Staff</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6">
                  {e4uStaff.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {e4uStaff.map((staff: any) => {
                        const staffUser = users.find(u => u.id === staff.userId);
                        const staffPrs = e4uPr.filter((pr: any) => pr.staffUserId === staff.userId);
                        
                        return (
                          <div 
                            key={staff.id} 
                            className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border hover:border-teal-500/50 transition-colors"
                            data-testid={`staff-item-${staff.id}`}
                          >
                            <div className="flex items-start justify-between gap-2 sm:gap-4">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-medium text-xs sm:text-sm">
                                  {staffUser?.firstName?.[0]}{staffUser?.lastName?.[0]}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm sm:text-base truncate">
                                    {staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : 'Utente sconosciuto'}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1 flex-wrap">
                                    {staff.canManageLists && (
                                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2">Liste</Badge>
                                    )}
                                    {staff.canManageTables && (
                                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2">Tavoli</Badge>
                                    )}
                                    {staff.canCreatePr && (
                                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2 bg-orange-500/20 text-orange-400">PR</Badge>
                                    )}
                                    {staff.canApproveTables && (
                                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2 bg-purple-500/20 text-purple-400 hidden sm:inline-flex">Approva</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => removeStaffMutation.mutate(staff.id)}
                                disabled={removeStaffMutation.isPending}
                                data-testid={`btn-remove-staff-${staff.id}`}
                              >
                                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                            
                            {/* PR under this staff */}
                            {staffPrs.length > 0 && (
                              <div className="mt-2 sm:mt-3 ml-10 sm:ml-12 space-y-1.5 sm:space-y-2">
                                <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                  <Megaphone className="h-3 w-3" />
                                  PR ({staffPrs.length})
                                </div>
                                {staffPrs.map((pr: any) => {
                                  const prUser = users.find(u => u.id === pr.userId);
                                  return (
                                    <div 
                                      key={pr.id}
                                      className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-md bg-orange-500/5 border border-orange-500/20"
                                      data-testid={`staff-pr-${pr.id}`}
                                    >
                                      <span className="text-xs sm:text-sm truncate">
                                        {prUser ? `${prUser.firstName} ${prUser.lastName}` : 'PR sconosciuto'}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {pr.canAddToLists && <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">Liste</Badge>}
                                        {pr.canProposeTables && <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2 hidden sm:inline-flex">Tavoli</Badge>}
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
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-orange-500/10 border border-orange-500/30" data-testid="stat-pr-count">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-400">{e4uPr.length}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">PR Attivi</div>
                </div>
              </div>

              {/* PR Section */}
              <Card className="glass-card">
                <CardHeader className="px-3 sm:px-4 md:px-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                      PR
                    </CardTitle>
                    <Button 
                      onClick={() => setShowAssignPrDialog(true)} 
                      size="sm"
                      data-testid="btn-assign-pr"
                    >
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Assegna PR</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6">
                  {e4uPr.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
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
                            className="flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border hover:border-orange-500/50 transition-colors"
                            data-testid={`pr-item-${pr.id}`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0">
                                {initials}{initials2}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm sm:text-base truncate">
                                  {displayName}
                                </div>
                                {supervisorUser && (
                                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                    <span className="hidden sm:inline">Supervisore: </span>{supervisorUser.firstName} {supervisorUser.lastName}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-0.5 sm:mt-1 flex-wrap">
                                  {pr.canAddToLists && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2">Liste</Badge>
                                  )}
                                  {pr.canProposeTables && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2">Tavoli</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                              onClick={() => removePrMutation.mutate(pr.id)}
                              disabled={removePrMutation.isPending}
                              data-testid={`btn-remove-pr-${pr.id}`}
                            >
                              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

          <TabsContent value="access">
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30" data-testid="stat-access-scanner-count">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-400">{e4uScanners.length}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Scanner Attivi</div>
                </div>
              </div>

              {/* Scanner Section */}
              <Card className="glass-card">
                <CardHeader className="px-3 sm:px-4 md:px-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                      Scanner
                    </CardTitle>
                    <Button 
                      onClick={() => setShowAssignScannerDialog(true)} 
                      size="sm"
                      data-testid="btn-assign-scanner"
                    >
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Assegna Scanner</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6">
                  {e4uScanners.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {e4uScanners.map((scanner: any) => {
                        const scannerUser = scanner.user || users.find(u => u.id === (scanner.scanner?.userId || scanner.userId));
                        const scannerData = scanner.scanner || scanner;
                        const sectorDisplay = getScannerSectorDisplay(scanner);
                        
                        return (
                          <div 
                            key={scannerData.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border hover:border-emerald-500/50 transition-colors"
                            data-testid={`scanner-item-${scannerData.id}`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0">
                                {scannerUser?.firstName?.[0]}{scannerUser?.lastName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm sm:text-base truncate">
                                  {scannerUser ? `${scannerUser.firstName} ${scannerUser.lastName}` : 'Utente sconosciuto'}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 sm:mt-1 flex-wrap">
                                  {scannerData.canScanLists && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2 bg-cyan-500/20 text-cyan-400">Liste</Badge>
                                  )}
                                  {scannerData.canScanTables && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2 bg-purple-500/20 text-purple-400">Tavoli</Badge>
                                  )}
                                  {scannerData.canScanTickets && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2 bg-amber-500/20 text-amber-400">Biglietti</Badge>
                                  )}
                                </div>
                                {scannerData.canScanTickets && ticketedEvent?.sectors && ticketedEvent.sectors.length > 0 && (
                                  <div className="mt-1 sm:mt-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[10px] sm:text-xs px-1 sm:px-2 cursor-pointer ${sectorDisplay.color}`}
                                      onClick={() => openScannerAccessDialog(scanner)}
                                      data-testid={`badge-scanner-sectors-${scannerData.id}`}
                                    >
                                      {sectorDisplay.label}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 ml-10 sm:ml-0">
                              {scannerData.canScanTickets && ticketedEvent?.sectors && ticketedEvent.sectors.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openScannerAccessDialog(scanner)}
                                  data-testid={`button-configure-scanner-access-${scannerData.id}`}
                                >
                                  <Settings className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Configura</span>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => removeScannerMutation.mutate(scannerData.id)}
                                disabled={removeScannerMutation.isPending}
                                data-testid={`btn-remove-scanner-${scannerData.id}`}
                              >
                                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

          {(userFeatures?.beverageEnabled !== false) && (
            <TabsContent value="inventory">
              <Card className="glass-card">
                <CardHeader className="px-3 sm:px-4 md:px-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
                      <span className="hidden sm:inline">Inventario Evento</span>
                      <span className="sm:hidden">Inventario</span>
                    </CardTitle>
                    <Button onClick={() => navigate(`/events/${id}/direct-stock`)} variant="outline" size="sm">
                      <span className="hidden sm:inline">Gestisci Stock</span> <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                    <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border text-center">
                      <div className="text-lg sm:text-2xl md:text-3xl font-bold text-indigo-400">{eventStocks.length}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Prodotti</div>
                    </div>
                    <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border text-center">
                      <div className="text-lg sm:text-2xl md:text-3xl font-bold text-emerald-400">{eventStations.length}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Postazioni</div>
                    </div>
                    <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border text-center">
                      <div className="text-lg sm:text-2xl md:text-3xl font-bold text-amber-400">
                        {eventStocks.reduce((acc, s) => acc + Number(s.quantity || 0), 0).toFixed(0)}
                      </div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Unità</div>
                    </div>
                    <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border text-center">
                      <div className="text-lg sm:text-2xl md:text-3xl font-bold text-cyan-400">
                        {new Set(eventStations.flatMap(s => s.bartenderIds || [])).size}
                      </div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Baristi</div>
                    </div>
                  </div>
                  {eventStocks.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-semibold mb-2">Nessun Prodotto</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Trasferisci prodotti dal magazzino all'evento
                      </p>
                      <Button onClick={() => navigate(`/events/${id}/direct-stock`)}>
                        Trasferisci Stock
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="finance">
            <Card className="glass-card">
              <CardHeader className="px-3 sm:px-4 md:px-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                    <span className="hidden sm:inline">Incassi e Finanze</span>
                    <span className="sm:hidden">Finanze</span>
                  </CardTitle>
                  <Button onClick={() => navigate(`/reports?eventId=${id}`)} variant="outline" size="sm">
                    <span className="hidden sm:inline">Report</span> <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 md:px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                  <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <div className="text-lg sm:text-2xl md:text-3xl font-bold text-amber-400">€{totalRevenue.toFixed(0)}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Incasso</div>
                  </div>
                  <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-400">
                      €{Number(ticketedEvent?.totalRevenue || 0).toFixed(0)}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Biglietti</div>
                  </div>
                  <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400">
                      €{bookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + Number(b.depositPaid || 0), 0).toFixed(0)}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Caparre</div>
                  </div>
                  <div className="p-2 sm:p-3 md:p-4 rounded-lg bg-background/50 border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-400">--</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Consumi</div>
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

          {/* Page Editor Tab - Mobile */}
          {ticketedEvent && (
            <TabsContent value="page-editor">
              <Card className="glass-card">
                <CardHeader className="px-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="h-5 w-5 text-primary" />
                    Editor Pagina Pubblica
                  </CardTitle>
                  <CardDescription>
                    Personalizza la pagina pubblica dell'evento
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 space-y-4">
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Anteprima Pubblica</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Visualizza come appare la pagina ai visitatori
                      </p>
                      <Link href={`/acquista/${id}`}>
                        <HapticButton variant="outline" className="w-full min-h-[44px]">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Apri Pagina Pubblica
                        </HapticButton>
                      </Link>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="h-4 w-4 text-primary" />
                        <span className="font-medium">Modifica Contenuti</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Configura hero, lineup, timeline e FAQ
                      </p>
                      <Link href={`/siae/ticketed-events/${ticketedEvent.id}/page-editor`}>
                        <HapticButton className="w-full min-h-[44px]">
                          <Palette className="h-4 w-4 mr-2" />
                          Apri Editor
                        </HapticButton>
                      </Link>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Sezioni configurabili:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Hero video/immagine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Info rapide</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Line-up artisti</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Timeline orari</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>FAQ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Countdown</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader className="pb-3 sm:pb-4">
            <AlertDialogTitle className="text-base sm:text-lg">Conferma Cambio Stato</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {currentTransition && (
                <>Vuoi {currentTransition.label.toLowerCase()} "{event.name}"?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentTransition && changeStatusMutation.mutate(currentTransition.next)}
              disabled={changeStatusMutation.isPending}
              className={`bg-gradient-to-r ${status.gradient} w-full sm:w-auto`}
            >
              {changeStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader className="pb-3 sm:pb-4">
            <AlertDialogTitle className="text-base sm:text-lg">Elimina Evento</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Questa azione eliminerà l'evento "{event?.name}" e tutti i dati correlati (postazioni, scorte, prenotazioni, liste ospiti, ecc.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventMutation.mutate()}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              {deleteEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pauseTicketingDialogOpen} onOpenChange={setPauseTicketingDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader className="pb-3 sm:pb-4">
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400 text-base sm:text-lg">
              <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
              Pausa Vendite Biglietti
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Vuoi sospendere temporaneamente la vendita dei biglietti? Gli utenti non potranno acquistare biglietti finché non riprenderai le vendite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast({
                  title: "Vendite Sospese",
                  description: "La vendita biglietti è stata temporaneamente sospesa",
                });
                setPauseTicketingDialogOpen(false);
              }}
              className="bg-amber-500 hover:bg-amber-600 w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="relative pr-8 pb-3 sm:pb-4">
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
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              {reportType === 'C1' ? 'Report C1 - Registro Giornaliero' : 'Report C2 - Riepilogo Evento'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
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

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} data-testid="btn-close-report" className="w-full sm:w-auto">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              Nuova Lista Ospiti
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Crea una nuova lista ospiti per questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name" className="text-xs sm:text-sm">Nome Lista *</Label>
              <Input
                id="list-name"
                placeholder="es. Lista VIP, Lista PR Marco..."
                value={newListData.name}
                onChange={(e) => setNewListData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-list-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="list-capacity" className="text-xs sm:text-sm">Capienza Max</Label>
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
                <Label htmlFor="list-price" className="text-xs sm:text-sm">Prezzo Ingresso</Label>
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
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateListDialog(false);
                setNewListData({ name: '', maxCapacity: '', price: '' });
              }}
              data-testid="btn-cancel-create-list"
              className="w-full sm:w-auto"
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
              className="w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Armchair className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              Nuova Tipologia Tavolo
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Crea una nuova tipologia di tavoli per questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="table-type-name" className="text-xs sm:text-sm">Nome Tipologia *</Label>
              <Input
                id="table-type-name"
                placeholder="es. VIP, Privé, Standard..."
                value={newTableTypeData.name}
                onChange={(e) => setNewTableTypeData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-table-type-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-type-price" className="text-xs sm:text-sm">Prezzo *</Label>
                <Input
                  id="table-type-price"
                  placeholder="es. 500.00"
                  value={newTableTypeData.price}
                  onChange={(e) => setNewTableTypeData(prev => ({ ...prev, price: e.target.value }))}
                  data-testid="input-table-type-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-type-guests" className="text-xs sm:text-sm">Ospiti Max *</Label>
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
              <Label htmlFor="table-type-quantity" className="text-xs sm:text-sm">Quantità Totale *</Label>
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
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateTableTypeDialog(false);
                setNewTableTypeData({ name: '', price: '', maxGuests: '', totalQuantity: '' });
              }}
              data-testid="btn-cancel-create-table-type"
              className="w-full sm:w-auto"
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
              className="w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-teal-400" />
              Assegna Staff
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Seleziona un membro dello staff da assegnare a questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-user" className="text-xs sm:text-sm">Seleziona Utente *</Label>
              <select
                id="staff-user"
                className="w-full min-h-10 px-3 rounded-md border bg-background text-sm"
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
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm">Permessi</Label>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Gestione Liste</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può gestire le liste ospiti</div>
                </div>
                <Switch
                  checked={newStaffData.canManageLists}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canManageLists: checked }))}
                  data-testid="switch-staff-lists"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Gestione Tavoli</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può gestire i tavoli</div>
                </div>
                <Switch
                  checked={newStaffData.canManageTables}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canManageTables: checked }))}
                  data-testid="switch-staff-tables"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Crea PR</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può creare e gestire PR</div>
                </div>
                <Switch
                  checked={newStaffData.canCreatePr}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canCreatePr: checked }))}
                  data-testid="switch-staff-create-pr"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Approva Tavoli</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può approvare prenotazioni tavoli</div>
                </div>
                <Switch
                  checked={newStaffData.canApproveTables}
                  onCheckedChange={(checked) => setNewStaffData(prev => ({ ...prev, canApproveTables: checked }))}
                  data-testid="switch-staff-approve-tables"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignStaffDialog(false);
                setNewStaffData({ userId: '', canManageLists: true, canManageTables: true, canCreatePr: false, canApproveTables: false });
              }}
              data-testid="btn-cancel-assign-staff"
              className="w-full sm:w-auto"
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
              className="w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
              Assegna PR
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Seleziona un PR da assegnare a questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="pr-user" className="text-xs sm:text-sm">Seleziona PR *</Label>
              <select
                id="pr-user"
                className="w-full min-h-10 px-3 rounded-md border bg-background text-sm"
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
              <Label htmlFor="pr-supervisor" className="text-xs sm:text-sm">Supervisore Staff (opzionale)</Label>
              <select
                id="pr-supervisor"
                className="w-full min-h-10 px-3 rounded-md border bg-background text-sm"
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
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm">Permessi</Label>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Aggiungere alle Liste</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può aggiungere ospiti alle liste</div>
                </div>
                <Switch
                  checked={newPrData.canAddToLists}
                  onCheckedChange={(checked) => setNewPrData(prev => ({ ...prev, canAddToLists: checked }))}
                  data-testid="switch-pr-lists"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Proporre Tavoli</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può proporre prenotazioni tavoli</div>
                </div>
                <Switch
                  checked={newPrData.canProposeTables}
                  onCheckedChange={(checked) => setNewPrData(prev => ({ ...prev, canProposeTables: checked }))}
                  data-testid="switch-pr-tables"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignPrDialog(false);
                setNewPrData({ userId: '', staffUserId: '', canAddToLists: true, canProposeTables: false });
              }}
              data-testid="btn-cancel-assign-pr"
              className="w-full sm:w-auto"
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
              className="w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              Assegna Scanner
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Seleziona un addetto scanner per questo evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="scanner-user" className="text-xs sm:text-sm">Seleziona Utente *</Label>
              <select
                id="scanner-user"
                className="w-full min-h-10 px-3 rounded-md border bg-background text-sm"
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
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm">Permessi di Scansione</Label>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Scansione Liste</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può scansionare ospiti delle liste</div>
                </div>
                <Switch
                  checked={newScannerData.canScanLists}
                  onCheckedChange={(checked) => setNewScannerData(prev => ({ ...prev, canScanLists: checked }))}
                  data-testid="switch-scanner-lists"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Scansione Tavoli</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può scansionare prenotazioni tavoli</div>
                </div>
                <Switch
                  checked={newScannerData.canScanTables}
                  onCheckedChange={(checked) => setNewScannerData(prev => ({ ...prev, canScanTables: checked }))}
                  data-testid="switch-scanner-tables"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm">Scansione Biglietti</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Può scansionare biglietti SIAE</div>
                </div>
                <Switch
                  checked={newScannerData.canScanTickets}
                  onCheckedChange={(checked) => setNewScannerData(prev => ({ ...prev, canScanTickets: checked }))}
                  data-testid="switch-scanner-tickets"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignScannerDialog(false);
                setNewScannerData({ userId: '', canScanLists: true, canScanTables: true, canScanTickets: true });
              }}
              data-testid="btn-cancel-assign-scanner"
              className="w-full sm:w-auto"
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
              className="w-full sm:w-auto"
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-4 sm:p-6" data-testid="dialog-scanner-access">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              Configura Accesso Scanner
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
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
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border">
              <div className="min-w-0">
                <div className="font-medium text-xs sm:text-sm">Accesso a tutti i settori</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
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
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-xs sm:text-sm font-medium">Seleziona i settori autorizzati</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllSectors(true)}
                      className="text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      Seleziona tutti
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllSectors(false)}
                      className="text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      Deseleziona
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                  {ticketedEvent.sectors.map((sector) => (
                    <div
                      key={sector.id}
                      className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-background/50 border cursor-pointer hover:bg-background/70 transition-colors"
                      onClick={() => toggleSectorSelection(sector.id)}
                    >
                      <input
                        type="checkbox"
                        checked={scannerAccessSelectedSectors.includes(sector.id)}
                        onChange={() => toggleSectorSelection(sector.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        data-testid={`checkbox-sector-${sector.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm">{sector.name}</div>
                        {sector.priceIntero && (
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            €{Number(sector.priceIntero).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {scannerAccessSelectedSectors.length > 0 && (
                  <div className="text-[10px] sm:text-xs text-muted-foreground pt-2">
                    {scannerAccessSelectedSectors.length} settori selezionati
                  </div>
                )}
              </div>
            )}
            
            {!scannerAccessAllSectors && (!ticketedEvent?.sectors || ticketedEvent.sectors.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-xs sm:text-sm">Nessun settore configurato per questo evento.</p>
                <p className="text-[10px] sm:text-xs mt-1">Configura i settori nella sezione Biglietti per abilitare le restrizioni.</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowScannerAccessDialog(false);
                setSelectedScannerForAccess(null);
              }}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveScannerAccess}
              disabled={updateScannerAccessMutation.isPending || (!scannerAccessAllSectors && scannerAccessSelectedSectors.length === 0)}
              data-testid="button-save-scanner-access"
              className="w-full sm:w-auto"
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

      {/* Sector Creation Dialog */}
      <Dialog open={isSectorDialogOpen} onOpenChange={setIsSectorDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuovo Biglietto</DialogTitle>
            <DialogDescription>
              Crea un nuovo tipo di biglietto per questo evento
            </DialogDescription>
          </DialogHeader>
          <Form {...sectorForm}>
            <form onSubmit={sectorForm.handleSubmit(onSubmitSector)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectorForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Biglietto</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Ingresso Standard" {...field} data-testid="input-sector-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="ticketType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipologia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-type">
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INT">Intero</SelectItem>
                          <SelectItem value="RID">Ridotto</SelectItem>
                          <SelectItem value="OMA">Omaggio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={sectorForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo €</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="10.00" 
                          {...field} 
                          disabled={sectorForm.watch("ticketType") === "OMA"}
                          data-testid="input-price" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="ddp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DDP €</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-ddp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantità</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-sector-capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectorForm.control}
                  name="ivaRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aliquota IVA</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-iva-rate">
                            <SelectValue placeholder="Seleziona IVA" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="22">22%</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="isNumbered"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 pt-8">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-numbered"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Posti numerati</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSectorDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSectorMutation.isPending}
                  data-testid="button-submit-sector"
                >
                  {createSectorMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
                  ) : (
                    'Crea Biglietto'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Sector Dialog */}
      <Dialog open={isEditSectorDialogOpen} onOpenChange={setIsEditSectorDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica Settore</DialogTitle>
            <DialogDescription>
              Modifica le impostazioni del settore
            </DialogDescription>
          </DialogHeader>
          <Form {...editSectorForm}>
            <form onSubmit={editSectorForm.handleSubmit((data) => {
              const priceValue = data.ticketType === 'OMA' ? '0' : (data.price || '0');
              updateSectorMutation.mutate({
                id: editingSectorData?.id,
                name: data.name,
                capacity: data.capacity,
                priceIntero: data.ticketType === 'INT' ? priceValue : '0',
                priceRidotto: data.ticketType === 'RID' ? priceValue : '0',
                prevendita: data.ddp,
                ivaRate: data.ivaRate,
                sortOrder: data.sortOrder,
                active: data.active,
              });
            })} className="space-y-4">
              <FormField
                control={editSectorForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Biglietto</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Ingresso Generale" {...field} data-testid="input-edit-sector-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSectorForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantità</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-edit-sector-capacity" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSectorForm.control}
                name="ticketType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Biglietto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-ticket-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INT">Intero</SelectItem>
                        <SelectItem value="RID">Ridotto</SelectItem>
                        <SelectItem value="OMA">Omaggio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editSectorForm.watch("ticketType") !== 'OMA' && (
                <FormField
                  control={editSectorForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          {...field} 
                          data-testid="input-edit-sector-price" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={editSectorForm.control}
                name="ivaRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aliquota IVA</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-iva-rate">
                          <SelectValue placeholder="Seleziona IVA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="22">22%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSectorForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Settore Attivo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditSectorDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSectorMutation.isPending}
                  data-testid="button-submit-edit-sector"
                >
                  {updateSectorMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                  ) : (
                    'Salva'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Subscription Type Creation Dialog */}
      <Dialog open={isSubscriptionTypeDialogOpen} onOpenChange={setIsSubscriptionTypeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuovo Abbonamento</DialogTitle>
            <DialogDescription>
              Crea un nuovo tipo di abbonamento per questo evento
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionTypeForm}>
            <form onSubmit={subscriptionTypeForm.handleSubmit(onSubmitSubscriptionType)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={subscriptionTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Abbonamento</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Pass Weekend" {...field} data-testid="input-subscription-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={subscriptionTypeForm.control}
                  name="turnType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Turno</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-subscription-turn-type">
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="F">Fisso</SelectItem>
                          <SelectItem value="L">Libero</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={subscriptionTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrizione abbonamento" {...field} data-testid="input-subscription-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={subscriptionTypeForm.control}
                  name="eventsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N. Eventi</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          placeholder="3"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-subscription-events-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={subscriptionTypeForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo €</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="50.00" {...field} data-testid="input-subscription-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={subscriptionTypeForm.control}
                  name="maxQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantità Max</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          placeholder="Illimitato"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-subscription-max-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={subscriptionTypeForm.control}
                name="ivaRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aliquota IVA</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subscription-iva-rate">
                          <SelectValue placeholder="Seleziona IVA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="22">22%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSubscriptionTypeDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSubscriptionTypeMutation.isPending}
                  data-testid="button-submit-subscription-type"
                >
                  {createSubscriptionTypeMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
                  ) : (
                    'Crea Abbonamento'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Type Dialog */}
      <Dialog open={isEditSubscriptionTypeDialogOpen} onOpenChange={setIsEditSubscriptionTypeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica Abbonamento</DialogTitle>
            <DialogDescription>
              Modifica le impostazioni del tipo abbonamento
            </DialogDescription>
          </DialogHeader>
          <Form {...editSubscriptionTypeForm}>
            <form onSubmit={editSubscriptionTypeForm.handleSubmit((data) => {
              updateSubscriptionTypeMutation.mutate({
                id: editingSubscriptionTypeData?.id,
                name: data.name,
                description: data.description,
                turnType: data.turnType,
                eventsCount: data.eventsCount,
                price: data.price,
                ivaRate: data.ivaRate,
                maxQuantity: data.maxQuantity,
              });
            })} className="space-y-4">
              <FormField
                control={editSubscriptionTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Abbonamento</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Pass Weekend" {...field} data-testid="input-edit-subscription-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSubscriptionTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrizione abbonamento" {...field} data-testid="input-edit-subscription-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSubscriptionTypeForm.control}
                name="turnType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Turno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-subscription-turn-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="F">Fisso</SelectItem>
                        <SelectItem value="L">Libero</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSubscriptionTypeForm.control}
                name="eventsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero Eventi</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-edit-subscription-events-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSubscriptionTypeForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-edit-subscription-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSubscriptionTypeForm.control}
                name="ivaRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aliquota IVA</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-subscription-iva-rate">
                          <SelectValue placeholder="Seleziona IVA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="22">22%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSubscriptionTypeForm.control}
                name="maxQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantità Max (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        placeholder="Illimitata"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-edit-subscription-max-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditSubscriptionTypeDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateSubscriptionTypeMutation.isPending} data-testid="button-submit-edit-subscription-type">
                  {updateSubscriptionTypeMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                  ) : (
                    'Salva'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* FAB Mobile Actions */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:hidden">
        {currentTransition && (
          <Button
            onClick={() => setStatusChangeDialogOpen(true)}
            size="icon"
            className={`h-12 w-12 rounded-full shadow-lg bg-gradient-to-r ${status.gradient} text-white`}
            data-testid="fab-status-change"
          >
            <currentTransition.icon className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuickActionsOpen(true)}
          className="h-12 w-12 rounded-full shadow-lg bg-background"
          data-testid="fab-quick-actions"
        >
          <Zap className="h-5 w-5" />
        </Button>
      </div>
    </MobileAppLayout>
  );
}
