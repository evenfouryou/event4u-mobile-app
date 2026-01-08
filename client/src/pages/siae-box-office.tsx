import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type SiaeBoxOfficeSession, type SiaeEmissionChannel, type Location } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MobileAppLayout,
  MobileHeader,
  BottomSheet,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Store,
  Play,
  Square,
  Euro,
  Ticket,
  Clock,
  Eye,
  Loader2,
  CreditCard,
  Banknote,
  Building2,
  User,
  ChevronRight,
  Plus,
  ArrowLeft,
  Calendar,
} from "lucide-react";

interface AdminSession extends SiaeBoxOfficeSession {
  companyName: string | null;
  companyId: string | null;
  userName: string | null;
}

interface CashierSessionDetail {
  id: string;
  companyId: string;
  eventId: string | null;
  userId: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  ticketsIssued: number | null;
  totalAmount: string | null;
  notes: string | null;
  userName: string | null;
  eventName: string | null;
  eventDate: string | null;
  companyName: string | null;
}

const springConfig = { stiffness: 400, damping: 30 };

export default function SiaeBoxOfficePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedSession, setSelectedSession] = useState<SiaeBoxOfficeSession | AdminSession | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isOpenSheetOpen, setIsOpenSheetOpen] = useState(false);
  const [isCloseSheetOpen, setIsCloseSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [activeTab, setActiveTab] = useState("siae");

  const companyId = user?.companyId;
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: sessions, isLoading } = useQuery<SiaeBoxOfficeSession[]>({
    queryKey: ['/api/siae/box-office/sessions'],
    enabled: !!companyId && !isSuperAdmin,
  });

  const { data: adminSessions, isLoading: isLoadingAdmin } = useQuery<AdminSession[]>({
    queryKey: ['/api/siae/admin/box-office/sessions'],
    enabled: isSuperAdmin,
  });

  const { data: activeSession } = useQuery<SiaeBoxOfficeSession | null>({
    queryKey: ['/api/siae/box-office/active-session'],
    enabled: !!user?.id && !isSuperAdmin,
  });

  const { data: emissionChannels } = useQuery<SiaeEmissionChannel[]>({
    queryKey: ['/api/siae/emission-channels'],
    enabled: !isSuperAdmin,
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    enabled: !!companyId && !isSuperAdmin,
  });

  const { data: cashierSessions, isLoading: isLoadingCashier } = useQuery<CashierSessionDetail[]>({
    queryKey: ['/api/printers/admin/cashier/sessions'],
    enabled: !!companyId || isSuperAdmin,
  });

  const openSessionMutation = useMutation({
    mutationFn: async (data: { emissionChannelId: string; locationId?: string }) => {
      const response = await apiRequest("POST", `/api/siae/box-office/sessions`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('box-office') || false });
      setIsOpenSheetOpen(false);
      setSelectedChannelId("");
      setSelectedLocationId("");
      toast({
        title: "Sessione Aperta",
        description: "La sessione di cassa è stata aperta con successo.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async ({ id, actualCash, notes }: { id: string; actualCash: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/siae/box-office/sessions/${id}/close`, {
        actualCash,
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('box-office') || false });
      setIsCloseSheetOpen(false);
      setSelectedSession(null);
      setActualCash("");
      setCloseNotes("");
      toast({
        title: "Sessione Chiusa",
        description: "La sessione di cassa è stata chiusa e quadrata.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Aperta</Badge>;
      case "closed":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Chiusa</Badge>;
      case "reconciled":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Quadrata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const currentSessions = isSuperAdmin ? adminSessions : sessions;
  const currentLoading = isSuperAdmin ? isLoadingAdmin : isLoading;

  const stats = {
    total: currentSessions?.length || 0,
    open: currentSessions?.filter(s => s.status === "open").length || 0,
    closed: currentSessions?.filter(s => s.status === "closed").length || 0,
    totalTickets: currentSessions?.reduce((sum, s) => sum + (s.ticketsSold || 0), 0) || 0,
    totalCash: currentSessions?.reduce((sum, s) => sum + Number(s.cashTotal || 0), 0) || 0,
  };

  const handleOpenSession = () => {
    triggerHaptic('medium');
    setIsOpenSheetOpen(true);
  };

  const handleViewSession = (session: SiaeBoxOfficeSession | AdminSession) => {
    triggerHaptic('light');
    setSelectedSession(session);
    setIsDetailSheetOpen(true);
  };

  const handleCloseSession = (session: SiaeBoxOfficeSession | AdminSession) => {
    triggerHaptic('medium');
    setSelectedSession(session);
    setIsCloseSheetOpen(true);
  };

  const SessionCard = ({ session, showCompany = false }: { session: SiaeBoxOfficeSession | AdminSession; showCompany?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", ...springConfig }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="glass-card overflow-hidden"
        data-testid={`card-session-${session.id}`}
      >
        <CardContent className="p-0">
          <button
            onClick={() => handleViewSession(session)}
            className="w-full text-left p-4 min-h-[100px] active:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(session.status)}
                  {session.status === "open" && (
                    <motion.div 
                      className="w-2 h-2 rounded-full bg-emerald-500"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>
                
                {showCompany && 'companyName' in session && session.companyName && (
                  <div className="flex items-center gap-2 text-primary font-medium mb-1">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{session.companyName}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-foreground font-medium">
                    {showCompany && 'userName' in session && session.userName 
                      ? session.userName 
                      : `Operatore ${session.userId?.slice(0, 6)}...`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    {session.openedAt && format(new Date(session.openedAt), "dd MMM HH:mm", { locale: it })}
                    {session.closedAt && ` - ${format(new Date(session.closedAt), "HH:mm", { locale: it })}`}
                  </span>
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <Ticket className="w-3 h-3" />
                  Biglietti
                </div>
                <div className="font-bold text-lg">{session.ticketsSold}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <Banknote className="w-3 h-3" />
                  Contanti
                </div>
                <div className="font-bold text-lg text-[#FFD700]">€{Number(session.cashTotal || 0).toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <CreditCard className="w-3 h-3" />
                  Carte
                </div>
                <div className="font-bold text-lg">€{Number(session.cardTotal || 0).toFixed(0)}</div>
              </div>
            </div>
          </button>
          
          {!isSuperAdmin && session.status === "open" && (
            <div className="px-4 pb-4">
              <HapticButton
                onClick={() => handleCloseSession(session)}
                variant="outline"
                className="w-full min-h-[48px]"
                hapticType="medium"
                data-testid={`button-close-${session.id}`}
              >
                <Square className="w-4 h-4 mr-2" />
                Chiudi Sessione
              </HapticButton>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const headerContent = (
    <MobileHeader
      title="Box Office"
      subtitle={isSuperAdmin ? "Admin View" : "Gestione Cassa"}
      showBackButton
      showUserMenu
    />
  );

  const handleViewSessionDesktop = (session: SiaeBoxOfficeSession | AdminSession) => {
    setSelectedSession(session);
    setIsDetailDialogOpen(true);
  };

  const handleCloseSessionDesktop = (session: SiaeBoxOfficeSession | AdminSession) => {
    setSelectedSession(session);
    setIsCloseDialogOpen(true);
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-box-office">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Box Office SIAE</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? "Amministrazione sessioni di cassa" : "Gestione sessioni di cassa"}
            </p>
          </div>
          {!isSuperAdmin && !activeSession && (
            <Button onClick={() => setIsOpenDialogOpen(true)} data-testid="button-open-session">
              <Plus className="w-4 h-4 mr-2" />
              Apri Nuova Sessione
            </Button>
          )}
        </div>

        {isSuperAdmin && (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Building2 className="w-3 h-3 mr-1" />
            Modalità Amministratore
          </Badge>
        )}

        {!isSuperAdmin && activeSession && (
          <Card className="border-emerald-500/30 bg-emerald-500/5" data-testid="card-active-session">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <Store className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Sessione Attiva</div>
                    <div className="text-muted-foreground">
                      Aperta alle {activeSession.openedAt && format(new Date(activeSession.openedAt), "HH:mm", { locale: it })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-muted-foreground text-sm">Biglietti</div>
                    <div className="text-2xl font-bold">{activeSession.ticketsSold}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground text-sm">Incasso</div>
                    <div className="text-2xl font-bold text-[#FFD700]">€{Number(activeSession.cashTotal || 0).toFixed(2)}</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleCloseSessionDesktop(activeSession)}
                    data-testid="button-close-active-session"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Chiudi Sessione
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="siae" data-testid="tab-siae">
              <Store className="w-4 h-4 mr-2" />
              SIAE Box Office
            </TabsTrigger>
            <TabsTrigger value="cashier" data-testid="tab-cashier">
              <Calendar className="w-4 h-4 mr-2" />
              Cassieri Eventi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="siae" className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Aperte
                  </div>
                  <div className="text-3xl font-bold text-emerald-400" data-testid="stat-open">{stats.open}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Square className="w-4 h-4 text-blue-400" />
                    Chiuse
                  </div>
                  <div className="text-3xl font-bold text-blue-400" data-testid="stat-closed">{stats.closed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Ticket className="w-4 h-4" />
                    Biglietti
                  </div>
                  <div className="text-3xl font-bold" data-testid="stat-tickets">{stats.totalTickets}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Banknote className="w-4 h-4 text-[#FFD700]" />
                    Incasso Totale
                  </div>
                  <div className="text-3xl font-bold text-[#FFD700]" data-testid="stat-cash">€{stats.totalCash.toFixed(0)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stato</TableHead>
                      {isSuperAdmin && <TableHead>Azienda</TableHead>}
                      <TableHead>Operatore</TableHead>
                      <TableHead>Apertura</TableHead>
                      <TableHead>Chiusura</TableHead>
                      <TableHead className="text-right">Biglietti</TableHead>
                      <TableHead className="text-right">Contanti</TableHead>
                      <TableHead className="text-right">Carte</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={isSuperAdmin ? 9 : 8}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : currentSessions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSuperAdmin ? 9 : 8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-4">
                            <Store className="w-12 h-12 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold text-lg">Nessuna Sessione</h3>
                              <p className="text-muted-foreground">
                                {isSuperAdmin 
                                  ? "Non ci sono sessioni di cassa registrate"
                                  : "Apri la tua prima sessione di cassa"}
                              </p>
                            </div>
                            {!isSuperAdmin && (
                              <Button onClick={() => setIsOpenDialogOpen(true)}>
                                <Play className="w-4 h-4 mr-2" />
                                Apri Prima Sessione
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentSessions?.map((session) => (
                        <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(session.status)}
                              {session.status === "open" && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </div>
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell>
                              {'companyName' in session && session.companyName ? (
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-primary" />
                                  <span className="font-medium">{String(session.companyName)}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {isSuperAdmin && 'userName' in session && session.userName 
                                  ? String(session.userName) 
                                  : `Operatore ${session.userId?.slice(0, 6)}...`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.openedAt && format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                          </TableCell>
                          <TableCell>
                            {session.closedAt 
                              ? format(new Date(session.closedAt), "dd/MM/yyyy HH:mm", { locale: it })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{session.ticketsSold}</TableCell>
                          <TableCell className="text-right font-bold text-[#FFD700]">
                            €{Number(session.cashTotal || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            €{Number(session.cardTotal || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewSessionDesktop(session)}
                                data-testid={`button-view-${session.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {!isSuperAdmin && session.status === "open" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCloseSessionDesktop(session)}
                                  data-testid={`button-close-${session.id}`}
                                >
                                  <Square className="w-4 h-4 mr-1" />
                                  Chiudi
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashier" className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Attive
                  </div>
                  <div className="text-3xl font-bold text-emerald-400" data-testid="stat-cashier-active">
                    {cashierSessions?.filter(s => s.status === "active").length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Square className="w-4 h-4 text-blue-400" />
                    Chiuse
                  </div>
                  <div className="text-3xl font-bold text-blue-400" data-testid="stat-cashier-closed">
                    {cashierSessions?.filter(s => s.status === "closed").length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Ticket className="w-4 h-4" />
                    Biglietti Emessi
                  </div>
                  <div className="text-3xl font-bold" data-testid="stat-cashier-tickets">
                    {cashierSessions?.reduce((sum, s) => sum + (s.ticketsIssued || 0), 0) || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Euro className="w-4 h-4 text-[#FFD700]" />
                    Importo Totale
                  </div>
                  <div className="text-3xl font-bold text-[#FFD700]" data-testid="stat-cashier-amount">
                    €{cashierSessions?.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0).toFixed(0) || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stato</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Cassiere</TableHead>
                      <TableHead>Apertura</TableHead>
                      <TableHead>Chiusura</TableHead>
                      <TableHead className="text-right">Biglietti</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCashier ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : cashierSessions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-4">
                            <Calendar className="w-12 h-12 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold text-lg">Nessuna Sessione Cassiere</h3>
                              <p className="text-muted-foreground">
                                Non ci sono sessioni cassiere eventi registrate
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashierSessions?.map((session) => (
                        <TableRow key={session.id} data-testid={`row-cashier-${session.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {session.status === "active" ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Attiva</Badge>
                              ) : (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Chiusa</Badge>
                              )}
                              {session.status === "active" && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{session.eventName || '-'}</span>
                              {session.eventDate && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(session.eventDate), "dd/MM/yyyy", { locale: it })}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{session.userName || `Utente ${session.userId?.slice(0, 6)}...`}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.openedAt && format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                          </TableCell>
                          <TableCell>
                            {session.closedAt 
                              ? format(new Date(session.closedAt), "dd/MM/yyyy HH:mm", { locale: it })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{session.ticketsIssued || 0}</TableCell>
                          <TableCell className="text-right font-bold text-[#FFD700]">
                            €{Number(session.totalAmount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apri Nuova Sessione</DialogTitle>
              <DialogDescription>
                Seleziona il canale di emissione per aprire una nuova sessione di cassa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Canale Emissione *</Label>
                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                  <SelectTrigger data-testid="select-channel">
                    <SelectValue placeholder="Seleziona canale" />
                  </SelectTrigger>
                  <SelectContent>
                    {emissionChannels?.filter(c => c.channelType === "physical").map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.channelCode} - {channel.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location (opzionale)</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger data-testid="select-location">
                    <SelectValue placeholder="Seleziona location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => {
                  openSessionMutation.mutate({
                    emissionChannelId: selectedChannelId,
                    locationId: selectedLocationId || undefined,
                  });
                  setIsOpenDialogOpen(false);
                }}
                disabled={!selectedChannelId || openSessionMutation.isPending}
                data-testid="button-confirm-open"
              >
                {openSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apri Sessione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chiudi Sessione</DialogTitle>
              <DialogDescription>
                Inserisci l'importo effettivo in cassa per quadrare la sessione.
              </DialogDescription>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-muted-foreground text-sm mb-1">Contante Atteso</div>
                    <div className="text-2xl font-bold text-[#FFD700]">€{Number(selectedSession.cashTotal || 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-muted-foreground text-sm mb-1">Biglietti Venduti</div>
                    <div className="text-2xl font-bold">{selectedSession.ticketsSold}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contante Effettivo *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    className="text-lg font-bold"
                    data-testid="input-actual-cash"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note (opzionale)</Label>
                  <Textarea
                    placeholder="Note sulla chiusura..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    data-testid="input-close-notes"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => {
                  if (selectedSession) {
                    closeSessionMutation.mutate({
                      id: selectedSession.id,
                      actualCash,
                      notes: closeNotes,
                    });
                    setIsCloseDialogOpen(false);
                  }
                }}
                disabled={!actualCash || closeSessionMutation.isPending}
                data-testid="button-confirm-close"
              >
                {closeSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Chiudi e Quadra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dettaglio Sessione</DialogTitle>
              <DialogDescription>
                Informazioni complete sulla sessione di cassa.
              </DialogDescription>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4 py-4">
                {'companyName' in selectedSession && selectedSession.companyName && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 font-semibold">
                      <Building2 className="w-5 h-5 text-primary" />
                      {selectedSession.companyName}
                    </div>
                    {'userName' in selectedSession && selectedSession.userName && (
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        {selectedSession.userName}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-muted-foreground text-sm mb-2">Stato</div>
                    {getStatusBadge(selectedSession.status)}
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-muted-foreground text-sm mb-2">Biglietti</div>
                    <div className="text-2xl font-bold">{selectedSession.ticketsSold}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Apertura</span>
                    <span className="font-medium">
                      {selectedSession.openedAt && format(new Date(selectedSession.openedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                  {selectedSession.closedAt && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Chiusura</span>
                      <span className="font-medium">
                        {format(new Date(selectedSession.closedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Contanti</span>
                    <span className="font-bold text-[#FFD700]">€{Number(selectedSession.cashTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Carte</span>
                    <span className="font-medium">€{Number(selectedSession.cardTotal || 0).toFixed(2)}</span>
                  </div>
                  {selectedSession.actualCash && (
                    <>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Contante Effettivo</span>
                        <span className="font-medium">€{Number(selectedSession.actualCash).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Differenza</span>
                        <span className={Number(selectedSession.difference || 0) !== 0 ? "text-destructive font-bold" : "font-medium"}>
                          €{Number(selectedSession.difference || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedSession.notes && (
                    <div className="py-2">
                      <span className="text-muted-foreground block mb-2">Note</span>
                      <p className="bg-muted/30 p-3 rounded-lg">{selectedSession.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              {!isSuperAdmin && selectedSession?.status === "open" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setTimeout(() => handleCloseSessionDesktop(selectedSession!), 100);
                  }}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Chiudi Sessione
                </Button>
              )}
              <Button onClick={() => setIsDetailDialogOpen(false)}>
                Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={headerContent}
      className="bg-background"
      data-testid="page-siae-box-office"
    >
      <div className="space-y-4 pb-24">
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", ...springConfig }}
          >
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Building2 className="w-3 h-3 mr-1" />
              Modalità Amministratore
            </Badge>
          </motion.div>
        )}

        {!isSuperAdmin && activeSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", ...springConfig }}
          >
            <Card className="glass-card border-emerald-500/30 bg-emerald-500/5" data-testid="card-active-session">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Store className="w-7 h-7 text-emerald-400" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">Sessione Attiva</div>
                    <div className="text-muted-foreground">
                      Aperta alle {activeSession.openedAt && format(new Date(activeSession.openedAt), "HH:mm", { locale: it })}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-background/50 rounded-xl p-3 text-center">
                    <div className="text-muted-foreground text-xs mb-1">Biglietti</div>
                    <div className="text-2xl font-bold">{activeSession.ticketsSold}</div>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3 text-center">
                    <div className="text-muted-foreground text-xs mb-1">Incasso</div>
                    <div className="text-2xl font-bold text-[#FFD700]">€{Number(activeSession.cashTotal || 0).toFixed(2)}</div>
                  </div>
                </div>
                
                <HapticButton
                  onClick={() => handleCloseSession(activeSession)}
                  variant="outline"
                  className="w-full min-h-[48px] border-emerald-500/30"
                  hapticType="medium"
                  data-testid="button-close-active-session"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Chiudi Sessione
                </HapticButton>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isSuperAdmin && !activeSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", ...springConfig }}
          >
            <HapticButton
              onClick={handleOpenSession}
              className="w-full min-h-[56px] bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-semibold"
              hapticType="medium"
              data-testid="button-open-session"
            >
              <Plus className="w-5 h-5 mr-2" />
              Apri Nuova Sessione
            </HapticButton>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", ...springConfig, delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Play className="w-3 h-3 text-emerald-400" />
                  Aperte
                </div>
                <div className="text-3xl font-bold text-emerald-400" data-testid="stat-open">{stats.open}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", ...springConfig, delay: 0.15 }}
          >
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Square className="w-3 h-3 text-blue-400" />
                  Chiuse
                </div>
                <div className="text-3xl font-bold text-blue-400" data-testid="stat-closed">{stats.closed}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", ...springConfig, delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Ticket className="w-3 h-3" />
                  Biglietti
                </div>
                <div className="text-3xl font-bold" data-testid="stat-tickets">{stats.totalTickets}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", ...springConfig, delay: 0.25 }}
          >
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Banknote className="w-3 h-3 text-[#FFD700]" />
                  Incasso
                </div>
                <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-cash">€{stats.totalCash.toFixed(0)}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-3">Storico Sessioni</h2>
          
          {currentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                </motion.div>
              ))}
            </div>
          ) : currentSessions?.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", ...springConfig }}
            >
              <Card className="glass-card" data-testid="card-empty-state">
                <CardContent className="py-12 text-center">
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", ...springConfig, delay: 0.2 }}
                  >
                    <Store className="w-10 h-10 text-muted-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">Nessuna Sessione</h3>
                  <p className="text-muted-foreground mb-6">
                    {isSuperAdmin 
                      ? "Non ci sono sessioni di cassa registrate"
                      : "Apri la tua prima sessione di cassa"}
                  </p>
                  {!isSuperAdmin && (
                    <HapticButton
                      onClick={handleOpenSession}
                      className="min-h-[48px]"
                      hapticType="medium"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Apri Prima Sessione
                    </HapticButton>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {currentSessions?.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", ...springConfig, delay: index * 0.05 }}
                  >
                    <SessionCard session={session} showCompany={isSuperAdmin} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <BottomSheet
        open={isOpenSheetOpen}
        onClose={() => setIsOpenSheetOpen(false)}
        title="Apri Sessione"
      >
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold">Nuova Sessione Box Office</div>
              <div className="text-muted-foreground text-sm">Seleziona il canale di emissione</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-base mb-2 block">Canale Emissione *</Label>
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger className="min-h-[52px]" data-testid="select-channel">
                  <SelectValue placeholder="Seleziona canale" />
                </SelectTrigger>
                <SelectContent>
                  {emissionChannels?.filter(c => c.channelType === "physical").map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} className="py-3">
                      {channel.channelCode} - {channel.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-base mb-2 block">Location (opzionale)</Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="min-h-[52px]" data-testid="select-location">
                  <SelectValue placeholder="Seleziona location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id} className="py-3">
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              onClick={() => setIsOpenSheetOpen(false)}
              className="flex-1 min-h-[52px]"
              hapticType="light"
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={() => {
                openSessionMutation.mutate({
                  emissionChannelId: selectedChannelId,
                  locationId: selectedLocationId || undefined,
                });
              }}
              disabled={!selectedChannelId || openSessionMutation.isPending}
              className="flex-1 min-h-[52px] bg-gradient-to-r from-emerald-500 to-emerald-600"
              hapticType="success"
              data-testid="button-confirm-open"
            >
              {openSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apri Sessione
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isCloseSheetOpen}
        onClose={() => setIsCloseSheetOpen(false)}
        title="Chiudi Sessione"
      >
        {selectedSession && (
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Square className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="font-semibold">Chiusura Cassa</div>
                <div className="text-muted-foreground text-sm">Inserisci l'importo effettivo</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <div className="text-muted-foreground text-xs mb-1">Contante Atteso</div>
                <div className="text-2xl font-bold text-[#FFD700]">€{Number(selectedSession.cashTotal || 0).toFixed(2)}</div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <div className="text-muted-foreground text-xs mb-1">Biglietti</div>
                <div className="text-2xl font-bold">{selectedSession.ticketsSold}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-base mb-2 block">Contante Effettivo *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="min-h-[52px] text-xl font-bold text-center"
                  data-testid="input-actual-cash"
                />
              </div>
              
              <div>
                <Label className="text-base mb-2 block">Note (opzionale)</Label>
                <Textarea
                  placeholder="Note sulla chiusura..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="input-close-notes"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <HapticButton
                variant="outline"
                onClick={() => setIsCloseSheetOpen(false)}
                className="flex-1 min-h-[52px]"
                hapticType="light"
              >
                Annulla
              </HapticButton>
              <HapticButton
                onClick={() => {
                  if (selectedSession) {
                    closeSessionMutation.mutate({
                      id: selectedSession.id,
                      actualCash,
                      notes: closeNotes,
                    });
                  }
                }}
                disabled={!actualCash || closeSessionMutation.isPending}
                className="flex-1 min-h-[52px] bg-gradient-to-r from-blue-500 to-blue-600"
                hapticType="success"
                data-testid="button-confirm-close"
              >
                {closeSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Chiudi e Quadra
              </HapticButton>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isDetailSheetOpen}
        onClose={() => setIsDetailSheetOpen(false)}
        title="Dettaglio Sessione"
      >
        {selectedSession && (
          <div className="p-4 space-y-4">
            {'companyName' in selectedSession && selectedSession.companyName && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 font-semibold">
                  <Building2 className="w-5 h-5 text-primary" />
                  {selectedSession.companyName}
                </div>
                {'userName' in selectedSession && selectedSession.userName && (
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    {selectedSession.userName}
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <div className="text-muted-foreground text-xs mb-2">Stato</div>
                {getStatusBadge(selectedSession.status)}
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <div className="text-muted-foreground text-xs mb-2">Biglietti</div>
                <div className="text-2xl font-bold">{selectedSession.ticketsSold}</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-muted-foreground">Apertura</span>
                <span className="font-medium">
                  {selectedSession.openedAt && format(new Date(selectedSession.openedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                </span>
              </div>
              
              {selectedSession.closedAt && (
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Chiusura</span>
                  <span className="font-medium">
                    {format(new Date(selectedSession.closedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-muted-foreground">Contanti</span>
                <span className="font-bold text-[#FFD700]">€{Number(selectedSession.cashTotal || 0).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-muted-foreground">Carte</span>
                <span className="font-medium">€{Number(selectedSession.cardTotal || 0).toFixed(2)}</span>
              </div>
              
              {selectedSession.actualCash && (
                <>
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Contante Effettivo</span>
                    <span className="font-medium">€{Number(selectedSession.actualCash).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Differenza</span>
                    <span className={Number(selectedSession.difference || 0) !== 0 ? "text-destructive font-bold" : "font-medium"}>
                      €{Number(selectedSession.difference || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              
              {selectedSession.notes && (
                <div className="py-3">
                  <span className="text-muted-foreground block mb-2">Note</span>
                  <p className="bg-muted/30 p-3 rounded-xl">{selectedSession.notes}</p>
                </div>
              )}
            </div>
            
            {!isSuperAdmin && selectedSession.status === "open" && (
              <HapticButton
                onClick={() => {
                  setIsDetailSheetOpen(false);
                  setTimeout(() => handleCloseSession(selectedSession), 300);
                }}
                variant="outline"
                className="w-full min-h-[52px] mt-4"
                hapticType="medium"
              >
                <Square className="w-4 h-4 mr-2" />
                Chiudi Questa Sessione
              </HapticButton>
            )}
          </div>
        )}
      </BottomSheet>
    </MobileAppLayout>
  );
}
