import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  Armchair,
  Ticket,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ScanLine,
  LogOut,
} from "lucide-react";

interface ScanResult {
  success: boolean;
  message?: string;
  error?: string;
  type?: 'list' | 'table' | 'ticket';
  person?: {
    firstName: string;
    lastName: string;
    phone?: string;
    type: 'lista' | 'tavolo' | 'biglietto';
    listName?: string;
    tableName?: string;
    status?: string;
    plusOnes?: number;
    ticketType?: string;
    ticketCode?: string;
    sector?: string;
    price?: string;
  };
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
  isCancelled?: boolean;
}

interface RecentScan extends ScanResult {
  scannedAt: Date;
  qrCode: string;
}

export default function E4uScannerPage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || "");
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const activeEventId = eventId || selectedEventId;

  const { data: events, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });

  const { data: selectedEvent } = useQuery<any>({
    queryKey: ['/api/events', activeEventId],
    enabled: !!activeEventId,
  });

  const scanMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/e4u/scan", { 
        qrCode, 
        eventId: activeEventId 
      });
      return response.json();
    },
    onSuccess: (data: ScanResult) => {
      setScanResult(data);
      const newScan: RecentScan = { 
        ...data, 
        scannedAt: new Date(),
        qrCode: qrInput
      };
      setRecentScans(prev => [newScan, ...prev.slice(0, 9)]);
      setQrInput("");
      
      if (data.success && data.person) {
        toast({ 
          title: "Check-in effettuato!", 
          description: `${data.person.firstName} ${data.person.lastName}` 
        });
      } else if (data.alreadyCheckedIn) {
        toast({ 
          title: "Già registrato", 
          description: data.message || "Questo QR è già stato utilizzato",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      const errorResult: ScanResult = { 
        success: false, 
        error: error.message || "Errore durante la scansione" 
      };
      setScanResult(errorResult);
      toast({ 
        title: "Errore scansione", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleScan = () => {
    if (!qrInput.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci o scansiona un codice QR",
        variant: "destructive",
      });
      return;
    }
    if (!activeEventId) {
      toast({
        title: "Errore",
        description: "Seleziona un evento prima di scansionare",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(qrInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = () => {
    setQrInput("");
    setScanResult(null);
  };

  const clearHistory = () => {
    setRecentScans([]);
  };

  const isStandaloneScanner = (user as any)?.role === 'scanner';

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-2xl pb-24 md:pb-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {!isStandaloneScanner && (
            <Link href="/events">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Scanner QR
            </h1>
            {selectedEvent && (
              <p className="text-muted-foreground text-xs sm:text-sm" data-testid="text-event-name">
                {selectedEvent.name}
              </p>
            )}
            {isStandaloneScanner && user && (
              <p className="text-muted-foreground text-xs" data-testid="text-scanner-user">
                {(user as any).firstName} {(user as any).lastName}
              </p>
            )}
          </div>
        </div>
        {isStandaloneScanner && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        )}
      </div>

      {!eventId && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Ticket className="h-4 w-4 sm:h-5 sm:w-5" />
              Seleziona Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <Select 
              value={selectedEventId} 
              onValueChange={setSelectedEventId}
            >
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Scegli un evento..." />
              </SelectTrigger>
              <SelectContent>
                {eventsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Caricamento...
                  </div>
                ) : events && events.length > 0 ? (
                  events.map((event: any) => (
                    <SelectItem 
                      key={event.id} 
                      value={event.id.toString()}
                      data-testid={`select-event-option-${event.id}`}
                    >
                      {event.name} - {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Nessun evento disponibile
                  </div>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            Scansione QR Code
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Usa il lettore QR o inserisci manualmente il codice
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Inserisci o scansiona QR code..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
              className="h-12 sm:h-14 text-base sm:text-lg font-mono"
              disabled={!activeEventId}
              data-testid="input-qr-code"
            />
            <Button
              onClick={handleScan}
              disabled={scanMutation.isPending || !qrInput.trim() || !activeEventId}
              className="h-12 sm:h-14 w-full sm:w-auto sm:min-w-[120px]"
              data-testid="button-scan"
            >
              {scanMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scansiona
                </>
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full h-12 sm:h-10"
            onClick={resetScanner}
            data-testid="button-reset"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </CardContent>
      </Card>

      {scanResult && scanResult.success && scanResult.person && (
        <Card className="border-emerald-500/50 bg-emerald-500/5 mb-6" data-testid="card-success">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-emerald-400">Check-in Effettuato</CardTitle>
                <CardDescription>{scanResult.message || "Ingresso registrato con successo"}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="text-lg font-semibold" data-testid="text-person-name">
                    {scanResult.person.firstName} {scanResult.person.lastName}
                  </span>
                </div>
                <Badge variant="outline" className="capitalize" data-testid="badge-type">
                  {scanResult.person.type === 'lista' ? (
                    <><Users className="w-3 h-3 mr-1" /> Lista</>
                  ) : scanResult.person.type === 'biglietto' ? (
                    <><Ticket className="w-3 h-3 mr-1" /> Biglietto</>
                  ) : (
                    <><Armchair className="w-3 h-3 mr-1" /> Tavolo</>
                  )}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                {scanResult.person.phone && (
                  <div>
                    <span className="text-muted-foreground">Telefono:</span>
                    <span className="ml-2 font-medium" data-testid="text-phone">
                      {scanResult.person.phone}
                    </span>
                  </div>
                )}
                {scanResult.person.listName && (
                  <div>
                    <span className="text-muted-foreground">Lista:</span>
                    <span className="ml-2 font-medium" data-testid="text-list-name">
                      {scanResult.person.listName}
                    </span>
                  </div>
                )}
                {scanResult.person.tableName && (
                  <div>
                    <span className="text-muted-foreground">Tavolo:</span>
                    <span className="ml-2 font-medium" data-testid="text-table-name">
                      {scanResult.person.tableName}
                    </span>
                  </div>
                )}
                {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                  <div>
                    <span className="text-muted-foreground">Accompagnatori:</span>
                    <span className="ml-2 font-medium" data-testid="text-plus-ones">
                      +{scanResult.person.plusOnes}
                    </span>
                  </div>
                )}
                {scanResult.person.ticketCode && (
                  <div>
                    <span className="text-muted-foreground">Codice:</span>
                    <span className="ml-2 font-medium font-mono" data-testid="text-ticket-code">
                      {scanResult.person.ticketCode}
                    </span>
                  </div>
                )}
                {scanResult.person.ticketType && (
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium" data-testid="text-ticket-type">
                      {scanResult.person.ticketType}
                    </span>
                  </div>
                )}
                {scanResult.person.sector && (
                  <div>
                    <span className="text-muted-foreground">Settore:</span>
                    <span className="ml-2 font-medium" data-testid="text-ticket-sector">
                      {scanResult.person.sector}
                    </span>
                  </div>
                )}
                {scanResult.person.price && (
                  <div>
                    <span className="text-muted-foreground">Prezzo:</span>
                    <span className="ml-2 font-medium" data-testid="text-ticket-price">
                      €{parseFloat(scanResult.person.price).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              
              {scanResult.person.status && (
                <Badge 
                  variant={scanResult.person.status === 'confirmed' ? 'default' : 'secondary'}
                  data-testid="badge-status"
                >
                  {scanResult.person.status === 'confirmed' ? 'Confermato' : scanResult.person.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {scanResult && scanResult.alreadyCheckedIn && (
        <Card className="border-amber-500/50 bg-amber-500/5 mb-6" data-testid="card-already-checked">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-amber-400">Già Registrato</CardTitle>
                <CardDescription>
                  {scanResult.checkedInAt 
                    ? `Check-in effettuato alle ${format(new Date(scanResult.checkedInAt), "HH:mm", { locale: it })}`
                    : "Questo QR è già stato utilizzato"
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {scanResult.person && (
            <CardContent>
              <div className="bg-background rounded-lg p-4">
                <p className="font-semibold" data-testid="text-already-person-name">
                  {scanResult.person.firstName} {scanResult.person.lastName}
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {scanResult && !scanResult.success && scanResult.error && (
        <Card className="border-rose-500/50 bg-rose-500/5 mb-6" data-testid="card-error">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <CardTitle className="text-rose-400">Errore Scansione</CardTitle>
                <CardDescription data-testid="text-error-message">
                  {scanResult.error}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Verifica che il codice QR sia valido e appartenga a questo evento.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!scanResult && activeEventId && (
        <Card className="mb-6">
          <CardContent className="py-12">
            <div className="text-center">
              <QrCode className="w-24 h-24 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Inserisci o scansiona un codice QR per effettuare il check-in
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {recentScans.length > 0 && (
        <Card data-testid="card-recent-scans">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scansioni Recenti
              </CardTitle>
              <CardDescription>
                Ultime {recentScans.length} scansioni
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearHistory}
              data-testid="button-clear-history"
            >
              Cancella
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recentScans.map((scan, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`recent-scan-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      {scan.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : scan.alreadyCheckedIn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {scan.person 
                            ? `${scan.person.firstName} ${scan.person.lastName}`
                            : scan.error || "Errore"
                          }
                        </p>
                        {scan.person && (
                          <p className="text-xs text-muted-foreground">
                            {scan.person.type === 'lista' ? 'Lista' : 'Tavolo'}
                            {scan.person.listName && ` - ${scan.person.listName}`}
                            {scan.person.tableName && ` - ${scan.person.tableName}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(scan.scannedAt, "HH:mm", { locale: it })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
