import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { type SiaeBoxOfficeSession, type SiaeEmissionChannel, type Location } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Store,
  Play,
  Square,
  Euro,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  CreditCard,
  Banknote,
  Building2,
  User,
} from "lucide-react";

interface AdminSession extends SiaeBoxOfficeSession {
  companyName: string | null;
  companyId: string | null;
  userName: string | null;
}

export default function SiaeBoxOfficePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<SiaeBoxOfficeSession | AdminSession | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

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

  const openSessionMutation = useMutation({
    mutationFn: async (data: { emissionChannelId: string; locationId?: string }) => {
      const response = await apiRequest("POST", `/api/siae/box-office/sessions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('box-office') || false });
      setIsOpenDialogOpen(false);
      setSelectedChannelId("");
      setSelectedLocationId("");
      toast({
        title: "Sessione Aperta",
        description: "La sessione di cassa è stata aperta con successo.",
      });
    },
    onError: (error: Error) => {
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
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('box-office') || false });
      setIsCloseDialogOpen(false);
      setSelectedSession(null);
      setActualCash("");
      setCloseNotes("");
      toast({
        title: "Sessione Chiusa",
        description: "La sessione di cassa è stata chiusa e quadrata.",
      });
    },
    onError: (error: Error) => {
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

  const groupedByCompany = isSuperAdmin && adminSessions
    ? adminSessions.reduce((acc, session) => {
        const companyName = session.companyName || 'Sconosciuto';
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(session);
        return acc;
      }, {} as Record<string, AdminSession[]>)
    : null;

  const getCompanyStats = (companySessions: AdminSession[]) => ({
    total: companySessions.length,
    open: companySessions.filter(s => s.status === "open").length,
    closed: companySessions.filter(s => s.status === "closed").length,
    totalTickets: companySessions.reduce((sum, s) => sum + (s.ticketsSold || 0), 0),
    totalCash: companySessions.reduce((sum, s) => sum + Number(s.cashTotal || 0), 0),
  });

  const renderSessionsTable = (sessionsToRender: (SiaeBoxOfficeSession | AdminSession)[], showUserName = false) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Operatore</TableHead>
            <TableHead>Canale</TableHead>
            <TableHead>Apertura</TableHead>
            <TableHead>Chiusura</TableHead>
            <TableHead>Biglietti</TableHead>
            <TableHead>Contanti</TableHead>
            <TableHead>Carte</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessionsToRender.map((session) => (
            <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
              <TableCell className="font-medium" data-testid={`cell-user-${session.id}`}>
                {showUserName && 'userName' in session && session.userName 
                  ? session.userName 
                  : session.userId?.slice(0, 8) + '...'}
              </TableCell>
              <TableCell className="font-mono text-xs" data-testid={`cell-channel-${session.id}`}>
                {session.emissionChannelId?.slice(0, 8)}...
              </TableCell>
              <TableCell data-testid={`cell-open-${session.id}`}>
                {session.openedAt && format(new Date(session.openedAt), "dd/MM HH:mm", { locale: it })}
              </TableCell>
              <TableCell data-testid={`cell-close-${session.id}`}>
                {session.closedAt ? format(new Date(session.closedAt), "dd/MM HH:mm", { locale: it }) : "-"}
              </TableCell>
              <TableCell data-testid={`cell-tickets-${session.id}`}>
                <span className="flex items-center gap-1">
                  <Ticket className="w-3 h-3" />
                  {session.ticketsSold}
                </span>
              </TableCell>
              <TableCell data-testid={`cell-cash-${session.id}`}>
                <span className="flex items-center gap-1">
                  <Banknote className="w-3 h-3" />
                  €{Number(session.cashTotal || 0).toFixed(2)}
                </span>
              </TableCell>
              <TableCell data-testid={`cell-card-${session.id}`}>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  €{Number(session.cardTotal || 0).toFixed(2)}
                </span>
              </TableCell>
              <TableCell data-testid={`cell-status-${session.id}`}>
                {getStatusBadge(session.status)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedSession(session);
                      setIsDetailDialogOpen(true);
                    }}
                    data-testid={`button-view-${session.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {!isSuperAdmin && session.status === "open" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedSession(session);
                        setIsCloseDialogOpen(true);
                      }}
                      data-testid={`button-close-${session.id}`}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-siae-box-office">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <Store className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] flex-shrink-0" />
            Sessioni Box Office
            {isSuperAdmin && (
              <Badge className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30">
                Admin View
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin 
              ? "Visualizza le sessioni di cassa di tutti gli organizzatori"
              : "Gestisci l'apertura e chiusura delle casse biglietteria"}
          </p>
        </div>
        {!isSuperAdmin && (
          <Button
            onClick={() => setIsOpenDialogOpen(true)}
            disabled={!!activeSession}
            data-testid="button-open-session"
          >
            <Play className="w-4 h-4 mr-2" />
            Apri Sessione
          </Button>
        )}
      </div>

      {!isSuperAdmin && activeSession && (
        <Card className="glass-card border-emerald-500/30 bg-emerald-500/5" data-testid="card-active-session">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Store className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold">Sessione Attiva</div>
                  <div className="text-sm text-muted-foreground">
                    Aperta alle {activeSession.openedAt && format(new Date(activeSession.openedAt), "HH:mm", { locale: it })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Biglietti venduti</div>
                  <div className="text-xl font-bold">{activeSession.ticketsSold}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Incasso</div>
                  <div className="text-xl font-bold text-[#FFD700]">€{Number(activeSession.cashTotal || 0).toFixed(2)}</div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSession(activeSession);
                    setIsCloseDialogOpen(true);
                  }}
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground mb-1">Totale Sessioni</div>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Play className="w-3 h-3" /> Aperte
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="stat-open">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Square className="w-3 h-3" /> Chiuse
            </div>
            <div className="text-2xl font-bold text-blue-400" data-testid="stat-closed">{stats.closed}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Ticket className="w-3 h-3" /> Biglietti
            </div>
            <div className="text-2xl font-bold" data-testid="stat-tickets">{stats.totalTickets}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Banknote className="w-3 h-3" /> Contanti
            </div>
            <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-cash">€{stats.totalCash.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {currentLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : currentSessions?.length === 0 ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna Sessione</h3>
            <p className="text-muted-foreground mb-4">
              {isSuperAdmin 
                ? "Non ci sono sessioni di cassa registrate nel sistema"
                : "Non ci sono sessioni di cassa registrate"}
            </p>
            {!isSuperAdmin && (
              <Button onClick={() => setIsOpenDialogOpen(true)}>
                <Play className="w-4 h-4 mr-2" />
                Apri Prima Sessione
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isSuperAdmin && groupedByCompany ? (
        <Accordion type="multiple" className="space-y-4" defaultValue={Object.keys(groupedByCompany)}>
          {Object.entries(groupedByCompany).map(([companyName, companySessions]) => {
            const companyStats = getCompanyStats(companySessions);
            return (
              <AccordionItem 
                key={companyName} 
                value={companyName}
                className="glass-card border rounded-lg overflow-hidden"
                data-testid={`accordion-company-${companyName}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex flex-wrap items-center justify-between w-full gap-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-lg">{companyName}</div>
                        <div className="text-sm text-muted-foreground">
                          {companyStats.total} sessioni
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          {companyStats.open} aperte
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {companyStats.closed} chiuse
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Ticket className="w-4 h-4" />
                        <span>{companyStats.totalTickets}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#FFD700] font-semibold">
                        <Euro className="w-4 h-4" />
                        <span>€{companyStats.totalCash.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  {renderSessionsTable(companySessions, true)}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card className="glass-card" data-testid="card-sessions-table">
          <CardContent className="p-0">
            {renderSessionsTable(sessions || [])}
          </CardContent>
        </Card>
      )}

      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent data-testid="dialog-open-session">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-500" />
              Apri Sessione Box Office
            </DialogTitle>
            <DialogDescription>
              Seleziona il canale di emissione per aprire la sessione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
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
            <div>
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
        <DialogContent data-testid="dialog-close-session">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="w-5 h-5 text-blue-500" />
              Chiudi Sessione
            </DialogTitle>
            <DialogDescription>
              Inserisci l'importo contante effettivo per la quadratura
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Contante Atteso</div>
                  <div className="text-xl font-bold">€{Number(selectedSession.cashTotal || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Biglietti Venduti</div>
                  <div className="text-xl font-bold">{selectedSession.ticketsSold}</div>
                </div>
              </div>
              <div>
                <Label>Contante Effettivo *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  data-testid="input-actual-cash"
                />
              </div>
              <div>
                <Label>Note</Label>
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
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#FFD700]" />
              Dettaglio Sessione
            </DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              {'companyName' in selectedSession && selectedSession.companyName && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{selectedSession.companyName}</span>
                  </div>
                  {'userName' in selectedSession && selectedSession.userName && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{selectedSession.userName}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Stato</div>
                  {getStatusBadge(selectedSession.status)}
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Biglietti</div>
                  <div className="text-xl font-bold">{selectedSession.ticketsSold}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Apertura</span>
                  <span>
                    {selectedSession.openedAt && format(new Date(selectedSession.openedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
                {selectedSession.closedAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Chiusura</span>
                    <span>
                      {format(new Date(selectedSession.closedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Contanti</span>
                  <span className="font-bold">€{Number(selectedSession.cashTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Carte</span>
                  <span>€{Number(selectedSession.cardTotal || 0).toFixed(2)}</span>
                </div>
                {selectedSession.actualCash && (
                  <>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Contante Effettivo</span>
                      <span>€{Number(selectedSession.actualCash).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Differenza</span>
                      <span className={Number(selectedSession.difference || 0) !== 0 ? "text-destructive font-bold" : ""}>
                        €{Number(selectedSession.difference || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {selectedSession.notes && (
                  <div className="py-2">
                    <span className="text-muted-foreground block mb-1">Note</span>
                    <p className="text-sm">{selectedSession.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
