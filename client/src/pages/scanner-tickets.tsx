import { useState, useMemo, useDeferredValue } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { SafeArea, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Ticket,
  Armchair,
  Clock,
  User,
  Filter,
  Eye,
  QrCode,
  Loader2,
} from "lucide-react";

interface EntryItem {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  type: 'list' | 'table' | 'ticket';
  status: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  listName?: string;
  tableName?: string;
  tableTypeName?: string;
  ticketType?: string;
  ticketCode?: string;
  sector?: string;
  price?: string;
  qrCode?: string;
  plusOnes?: number;
}

interface Event {
  id: string;
  name: string;
  startDatetime: string;
}

export default function ScannerTicketsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'checked_in'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'list' | 'table' | 'ticket'>('all');
  const [selectedEntry, setSelectedEntry] = useState<EntryItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const { data: event } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: entries, isLoading } = useQuery<EntryItem[]>({
    queryKey: ['/api/e4u/events', eventId, 'all-entries'],
    enabled: !!eventId,
    refetchInterval: 10000,
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ id, type, qrCode }: { id: string; type: string; qrCode?: string }) => {
      if (qrCode) {
        const response = await apiRequest("POST", "/api/e4u/scan", { 
          qrCode, 
          eventId 
        });
        return response.json();
      }
      throw new Error("QR code non disponibile");
    },
    onSuccess: () => {
      toast({ title: "Check-in effettuato", description: "Ingresso validato con successo" });
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', eventId, 'all-entries'] });
      setIsDetailDialogOpen(false);
      triggerHaptic("success");
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      triggerHaptic("error");
    },
  });

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    const searchLower = deferredSearchQuery.trim().toLowerCase();
    
    return entries.filter(entry => {
      const matchesSearch = searchLower === '' || 
        `${entry.firstName} ${entry.lastName}`.toLowerCase().includes(searchLower) ||
        entry.phone?.includes(deferredSearchQuery) ||
        entry.ticketCode?.toLowerCase().includes(searchLower);
      
      const matchesStatus = activeFilter === 'all' || 
        (activeFilter === 'pending' && !entry.isCheckedIn) ||
        (activeFilter === 'checked_in' && entry.isCheckedIn);
      
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [entries, deferredSearchQuery, activeFilter, typeFilter]);

  const { pendingCount, checkedInCount, listCount, tableCount, ticketCount } = useMemo(() => ({
    pendingCount: entries?.filter(e => !e.isCheckedIn).length || 0,
    checkedInCount: entries?.filter(e => e.isCheckedIn).length || 0,
    listCount: entries?.filter(e => e.type === 'list').length || 0,
    tableCount: entries?.filter(e => e.type === 'table').length || 0,
    ticketCount: entries?.filter(e => e.type === 'ticket').length || 0,
  }), [entries]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'list':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30"><Users className="h-3 w-3 mr-1" /> Lista</Badge>;
      case 'table':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Armchair className="h-3 w-3 mr-1" /> Tavolo</Badge>;
      case 'ticket':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Ticket className="h-3 w-3 mr-1" /> Biglietto</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (isCheckedIn: boolean) => {
    if (isCheckedIn) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Entrato</Badge>;
    }
    return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><XCircle className="h-3 w-3 mr-1" /> Da validare</Badge>;
  };

  const handleEntryClick = (entry: EntryItem) => {
    setSelectedEntry(entry);
    setIsDetailDialogOpen(true);
  };

  const handleCheckIn = () => {
    if (selectedEntry?.qrCode) {
      checkInMutation.mutate({ 
        id: selectedEntry.id, 
        type: selectedEntry.type, 
        qrCode: selectedEntry.qrCode 
      });
    }
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-scanner-tickets">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/scanner/scan/${eventId}`}>
              <Button variant="outline" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <QrCode className="h-7 w-7 text-primary" />
                Elenco Titoli
              </h1>
              {event && (
                <p className="text-muted-foreground">{event.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-lg px-4 py-2">
              {pendingCount} da validare
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-lg px-4 py-2">
              {checkedInCount} entrati
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{entries?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-400">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">Da validare</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-400">{listCount}</div>
              <p className="text-sm text-muted-foreground">Liste</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-400">{tableCount}</div>
              <p className="text-sm text-muted-foreground">Tavoli</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-400">{ticketCount}</div>
              <p className="text-sm text-muted-foreground">Biglietti</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Elenco Completo</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome, telefono o codice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
                <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="pending">Da validare</SelectItem>
                    <SelectItem value="checked_in">Entrati</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                  <SelectTrigger className="w-40" data-testid="select-type-filter">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                    <SelectItem value="table">Tavoli</SelectItem>
                    <SelectItem value="ticket">Biglietti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dettagli</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Data/Ora Scansione</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow 
                        key={`${entry.type}-${entry.id}`} 
                        className={entry.isCheckedIn ? "opacity-60" : ""}
                        data-testid={`row-entry-${entry.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{entry.firstName} {entry.lastName}</span>
                          </div>
                          {entry.phone && (
                            <span className="text-xs text-muted-foreground">{entry.phone}</span>
                          )}
                        </TableCell>
                        <TableCell>{getTypeBadge(entry.type)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {entry.type === 'list' && entry.listName && (
                              <span>Lista: {entry.listName}</span>
                            )}
                            {entry.type === 'table' && (
                              <span>{entry.tableTypeName}: {entry.tableName}</span>
                            )}
                            {entry.type === 'ticket' && (
                              <div>
                                <span>{entry.ticketType}</span>
                                {entry.sector && <span className="text-muted-foreground"> • {entry.sector}</span>}
                                {entry.ticketCode && <div className="text-xs text-muted-foreground">{entry.ticketCode}</div>}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.isCheckedIn)}</TableCell>
                        <TableCell>
                          {entry.isCheckedIn && entry.checkedInAt ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(parseISO(entry.checkedInAt), "dd/MM HH:mm", { locale: it })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEntryClick(entry)}
                            data-testid={`button-view-${entry.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessun titolo trovato
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dettagli Titolo</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedEntry.firstName} {selectedEntry.lastName}</h3>
                    {selectedEntry.phone && <p className="text-muted-foreground">{selectedEntry.phone}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    {getTypeBadge(selectedEntry.type)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato</p>
                    {getStatusBadge(selectedEntry.isCheckedIn)}
                  </div>
                </div>
                
                {selectedEntry.type === 'list' && selectedEntry.listName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lista</p>
                    <p className="font-medium">{selectedEntry.listName}</p>
                  </div>
                )}
                
                {selectedEntry.type === 'table' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tavolo</p>
                    <p className="font-medium">{selectedEntry.tableTypeName}: {selectedEntry.tableName}</p>
                  </div>
                )}
                
                {selectedEntry.type === 'ticket' && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Biglietto</p>
                      <p className="font-medium">{selectedEntry.ticketType}</p>
                      {selectedEntry.ticketCode && <p className="text-sm text-muted-foreground">{selectedEntry.ticketCode}</p>}
                    </div>
                    {selectedEntry.sector && (
                      <div>
                        <p className="text-sm text-muted-foreground">Settore</p>
                        <p className="font-medium">{selectedEntry.sector}</p>
                      </div>
                    )}
                  </>
                )}
                
                {selectedEntry.isCheckedIn && selectedEntry.checkedInAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Ora Scansione</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {format(parseISO(selectedEntry.checkedInAt), "dd MMMM yyyy • HH:mm:ss", { locale: it })}
                    </p>
                  </div>
                )}
                
                {!selectedEntry.isCheckedIn && selectedEntry.qrCode && (
                  <Button 
                    className="w-full" 
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isPending}
                    data-testid="button-checkin"
                  >
                    {checkInMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validazione...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Valida Ingresso</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <SafeArea 
      className="min-h-screen bg-background flex flex-col"
      top={true}
      bottom={true}
    >
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/scanner/scan/${eventId}`}>
            <HapticButton variant="ghost" size="icon" hapticType="light" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </HapticButton>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Elenco Titoli</h1>
            {event && <p className="text-xs text-muted-foreground">{event.name}</p>}
          </div>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            {pendingCount} da validare
          </Badge>
        </div>
      </header>

      <div className="p-4 space-y-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, telefono o codice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-mobile"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <HapticButton
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            hapticType="light"
          >
            Tutti ({entries?.length || 0})
          </HapticButton>
          <HapticButton
            variant={activeFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('pending')}
            hapticType="light"
          >
            Da validare ({pendingCount})
          </HapticButton>
          <HapticButton
            variant={activeFilter === 'checked_in' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('checked_in')}
            hapticType="light"
          >
            Entrati ({checkedInCount})
          </HapticButton>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <HapticButton
            variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            hapticType="light"
          >
            Tutti
          </HapticButton>
          <HapticButton
            variant={typeFilter === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('list')}
            hapticType="light"
          >
            <Users className="h-3 w-3 mr-1" /> Liste
          </HapticButton>
          <HapticButton
            variant={typeFilter === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('table')}
            hapticType="light"
          >
            <Armchair className="h-3 w-3 mr-1" /> Tavoli
          </HapticButton>
          <HapticButton
            variant={typeFilter === 'ticket' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('ticket')}
            hapticType="light"
          >
            <Ticket className="h-3 w-3 mr-1" /> Biglietti
          </HapticButton>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <Card 
                  key={`${entry.type}-${entry.id}`}
                  className={`hover-elevate cursor-pointer ${entry.isCheckedIn ? 'opacity-60' : ''}`}
                  onClick={() => handleEntryClick(entry)}
                  data-testid={`card-entry-${entry.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{entry.firstName} {entry.lastName}</span>
                          {getStatusBadge(entry.isCheckedIn)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getTypeBadge(entry.type)}
                          {entry.type === 'list' && entry.listName && (
                            <span className="text-xs text-muted-foreground">{entry.listName}</span>
                          )}
                          {entry.type === 'table' && (
                            <span className="text-xs text-muted-foreground">{entry.tableName}</span>
                          )}
                          {entry.type === 'ticket' && (
                            <span className="text-xs text-muted-foreground">{entry.ticketCode}</span>
                          )}
                        </div>
                        {entry.isCheckedIn && entry.checkedInAt && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Scansionato: {format(parseISO(entry.checkedInAt), "dd/MM HH:mm", { locale: it })}
                          </div>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun titolo trovato
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>Dettagli Titolo</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedEntry.firstName} {selectedEntry.lastName}</h3>
                  {selectedEntry.phone && <p className="text-sm text-muted-foreground">{selectedEntry.phone}</p>}
                </div>
              </div>
              
              <div className="flex gap-2">
                {getTypeBadge(selectedEntry.type)}
                {getStatusBadge(selectedEntry.isCheckedIn)}
              </div>
              
              {selectedEntry.isCheckedIn && selectedEntry.checkedInAt && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-sm text-muted-foreground">Scansionato il</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(parseISO(selectedEntry.checkedInAt), "dd MMMM yyyy • HH:mm:ss", { locale: it })}
                  </p>
                </div>
              )}
              
              {!selectedEntry.isCheckedIn && selectedEntry.qrCode && (
                <HapticButton 
                  className="w-full h-12" 
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                  hapticType="medium"
                  data-testid="button-checkin-mobile"
                >
                  {checkInMutation.isPending ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Validazione...</>
                  ) : (
                    <><CheckCircle2 className="h-5 w-5 mr-2" /> Valida Ingresso</>
                  )}
                </HapticButton>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SafeArea>
  );
}
