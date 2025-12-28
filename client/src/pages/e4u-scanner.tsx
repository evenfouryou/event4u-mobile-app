import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
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
  Trash2,
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

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { ...springTransition, delay: i * 0.05 }
  }),
};

// Singleton AudioContext for reliable audio playback
let audioContext: AudioContext | null = null;

// Initialize audio context on first user interaction
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (required by browser autoplay policies)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Play sound feedback for scans
function playSound(type: 'success' | 'error') {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    // Ensure context is running (needed for some mobile browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const startTime = ctx.currentTime + 0.01;

    if (type === 'success') {
      // Success: Two ascending beeps
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(800, startTime);
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
      osc1.start(startTime);
      osc1.stop(startTime + 0.1);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1200, startTime + 0.12);
      gain2.gain.setValueAtTime(0, startTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.4, startTime + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
      osc2.start(startTime + 0.12);
      osc2.stop(startTime + 0.25);
    } else {
      // Error: Low descending buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, startTime);
      osc.frequency.exponentialRampToValueAtTime(150, startTime + 0.3);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }
  } catch (error) {
    console.error('Audio error:', error);
  }
}

export default function E4uScannerPage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || "");
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<RecentScan | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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
        triggerHaptic('success');
        playSound('success');
        toast({ 
          title: "Check-in effettuato!", 
          description: `${data.person.firstName} ${data.person.lastName}` 
        });
      } else if (data.alreadyCheckedIn) {
        triggerHaptic('error');
        playSound('error');
        toast({ 
          title: "Già registrato", 
          description: data.message || "Questo QR è già stato utilizzato",
          variant: "destructive"
        });
      } else {
        triggerHaptic('error');
        playSound('error');
      }
    },
    onError: (error: any) => {
      triggerHaptic('error');
      playSound('error');
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
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Inserisci o scansiona un codice QR",
        variant: "destructive",
      });
      return;
    }
    if (!activeEventId) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Seleziona un evento prima di scansionare",
        variant: "destructive",
      });
      return;
    }
    // Initialize audio on first scan (user gesture)
    initAudioContext();
    scanMutation.mutate(qrInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = () => {
    triggerHaptic('light');
    setQrInput("");
    setScanResult(null);
  };

  const clearHistory = () => {
    triggerHaptic('medium');
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

  const headerContent = (
    <MobileHeader
      title="Scanner QR"
      subtitle={selectedEvent?.name}
      leftAction={
        !isStandaloneScanner ? (
          <Link href="/events">
            <HapticButton variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </HapticButton>
          </Link>
        ) : undefined
      }
      rightAction={
        isStandaloneScanner ? (
          <HapticButton 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
          </HapticButton>
        ) : undefined
      }
    />
  );

  const getStatusBadge = (scan: RecentScan) => {
    if (scan.success) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Check-in</Badge>;
    } else if (scan.alreadyCheckedIn) {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Già registrato</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Errore</Badge>;
    }
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-e4u-scanner">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {!isStandaloneScanner && (
              <Link href="/events">
                <Button variant="ghost" size="icon" data-testid="button-back-desktop">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold">Scanner QR</h1>
              <p className="text-muted-foreground">
                {selectedEvent?.name || "Seleziona un evento per iniziare"}
              </p>
            </div>
          </div>
          {isStandaloneScanner && (
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout-desktop">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {!eventId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Seleziona Evento
                  </CardTitle>
                  <CardDescription>Scegli l'evento per il check-in</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={selectedEventId} 
                    onValueChange={setSelectedEventId}
                  >
                    <SelectTrigger data-testid="select-event-desktop">
                      <SelectValue placeholder="Scegli un evento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eventsLoading ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Caricamento...
                        </div>
                      ) : events && events.length > 0 ? (
                        events.map((event: any) => (
                          <SelectItem 
                            key={event.id} 
                            value={event.id.toString()}
                            data-testid={`select-event-option-desktop-${event.id}`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{event.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                              </span>
                            </div>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Scansione QR Code
                </CardTitle>
                <CardDescription>Usa il lettore o inserisci manualmente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Inserisci o scansiona QR code..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="font-mono"
                  disabled={!activeEventId}
                  data-testid="input-qr-code-desktop"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleScan}
                    disabled={scanMutation.isPending || !qrInput.trim() || !activeEventId}
                    className="flex-1"
                    data-testid="button-scan-desktop"
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resetScanner}
                    data-testid="button-reset-desktop"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {scanResult && scanResult.success && scanResult.person && (
              <Card className="border-2 border-emerald-500/50 bg-emerald-500/5" data-testid="card-success-desktop">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-emerald-400">Check-in Effettuato</h3>
                      <p className="text-sm text-muted-foreground">{scanResult.message || "Ingresso registrato"}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold" data-testid="text-person-name-desktop">
                          {scanResult.person.firstName} {scanResult.person.lastName}
                        </span>
                      </div>
                      <Badge variant="outline" className="capitalize" data-testid="badge-type-desktop">
                        {scanResult.person.type === 'lista' ? 'Lista' : scanResult.person.type === 'biglietto' ? 'Biglietto' : 'Tavolo'}
                      </Badge>
                    </div>
                    {scanResult.person.listName && (
                      <p className="text-sm text-muted-foreground">Lista: {scanResult.person.listName}</p>
                    )}
                    {scanResult.person.tableName && (
                      <p className="text-sm text-muted-foreground">Tavolo: {scanResult.person.tableName}</p>
                    )}
                    {scanResult.person.ticketCode && (
                      <p className="text-sm font-mono text-muted-foreground">Codice: {scanResult.person.ticketCode}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {scanResult && scanResult.alreadyCheckedIn && (
              <Card className="border-2 border-amber-500/50 bg-amber-500/5" data-testid="card-already-desktop">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-400">Già Registrato</h3>
                      <p className="text-sm text-muted-foreground">
                        {scanResult.checkedInAt 
                          ? `Check-in alle ${format(new Date(scanResult.checkedInAt), "HH:mm", { locale: it })}`
                          : "QR già utilizzato"
                        }
                      </p>
                      {scanResult.person && (
                        <p className="font-medium mt-2">{scanResult.person.firstName} {scanResult.person.lastName}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {scanResult && !scanResult.success && scanResult.error && (
              <Card className="border-2 border-rose-500/50 bg-rose-500/5" data-testid="card-error-desktop">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-rose-400">Errore Scansione</h3>
                      <p className="text-sm text-muted-foreground">{scanResult.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Scansioni Recenti
                  </CardTitle>
                  <CardDescription>
                    {recentScans.length > 0 ? `${recentScans.length} scansioni` : "Nessuna scansione recente"}
                  </CardDescription>
                </div>
                {recentScans.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearHistory}
                    data-testid="button-clear-history-desktop"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancella
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {recentScans.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stato</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Dettaglio</TableHead>
                        <TableHead>Ora</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentScans.map((scan, index) => (
                        <TableRow key={index} data-testid={`row-scan-${index}`}>
                          <TableCell>{getStatusBadge(scan)}</TableCell>
                          <TableCell className="font-medium">
                            {scan.person 
                              ? `${scan.person.firstName} ${scan.person.lastName}`
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {scan.person ? (
                              <Badge variant="outline" className="capitalize">
                                {scan.person.type === 'lista' ? 'Lista' : scan.person.type === 'biglietto' ? 'Biglietto' : 'Tavolo'}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {scan.person?.listName || scan.person?.tableName || scan.person?.ticketCode || scan.error || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(scan.scannedAt, "HH:mm:ss", { locale: it })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedScan(scan);
                                setIsDetailDialogOpen(true);
                              }}
                              data-testid={`button-view-scan-${index}`}
                            >
                              Dettagli
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <QrCode className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Nessuna scansione recente</p>
                    <p className="text-sm text-muted-foreground">Scansiona un QR code per iniziare</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dettagli Scansione</DialogTitle>
              <DialogDescription>
                Informazioni complete sulla scansione
              </DialogDescription>
            </DialogHeader>
            {selectedScan && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedScan.success ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : selectedScan.alreadyCheckedIn ? (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-rose-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold">
                      {selectedScan.success ? "Check-in Effettuato" : selectedScan.alreadyCheckedIn ? "Già Registrato" : "Errore"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedScan.scannedAt, "d MMM yyyy HH:mm:ss", { locale: it })}
                    </p>
                  </div>
                </div>
                {selectedScan.person && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedScan.person.firstName} {selectedScan.person.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-medium capitalize">
                        {selectedScan.person.type === 'lista' ? 'Lista' : selectedScan.person.type === 'biglietto' ? 'Biglietto' : 'Tavolo'}
                      </p>
                    </div>
                    {selectedScan.person.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Telefono</p>
                        <p className="font-medium">{selectedScan.person.phone}</p>
                      </div>
                    )}
                    {selectedScan.person.listName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Lista</p>
                        <p className="font-medium">{selectedScan.person.listName}</p>
                      </div>
                    )}
                    {selectedScan.person.tableName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tavolo</p>
                        <p className="font-medium">{selectedScan.person.tableName}</p>
                      </div>
                    )}
                    {selectedScan.person.ticketCode && (
                      <div>
                        <p className="text-sm text-muted-foreground">Codice Biglietto</p>
                        <p className="font-medium font-mono">{selectedScan.person.ticketCode}</p>
                      </div>
                    )}
                    {selectedScan.person.ticketType && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo Biglietto</p>
                        <p className="font-medium">{selectedScan.person.ticketType}</p>
                      </div>
                    )}
                    {selectedScan.person.sector && (
                      <div>
                        <p className="text-sm text-muted-foreground">Settore</p>
                        <p className="font-medium">{selectedScan.person.sector}</p>
                      </div>
                    )}
                    {selectedScan.person.price && (
                      <div>
                        <p className="text-sm text-muted-foreground">Prezzo</p>
                        <p className="font-medium">€{parseFloat(selectedScan.person.price).toFixed(2)}</p>
                      </div>
                    )}
                    {selectedScan.person.plusOnes !== undefined && selectedScan.person.plusOnes > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Accompagnatori</p>
                        <p className="font-medium">+{selectedScan.person.plusOnes}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedScan.error && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Errore</p>
                    <p className="font-medium text-rose-400">{selectedScan.error}</p>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Codice QR</p>
                  <p className="font-mono text-sm break-all">{selectedScan.qrCode}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={headerContent}
      contentClassName="pb-24"
    >
      <div className="space-y-4 py-4">
        {!eventId && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Seleziona Evento</h2>
                    <p className="text-muted-foreground text-sm">Scegli l'evento per il check-in</p>
                  </div>
                </div>
                <Select 
                  value={selectedEventId} 
                  onValueChange={(v) => {
                    triggerHaptic('light');
                    setSelectedEventId(v);
                  }}
                >
                  <SelectTrigger className="h-14 text-base" data-testid="select-event">
                    <SelectValue placeholder="Scegli un evento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eventsLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Caricamento...
                      </div>
                    ) : events && events.length > 0 ? (
                      events.map((event: any) => (
                        <SelectItem 
                          key={event.id} 
                          value={event.id.toString()}
                          className="py-3"
                          data-testid={`select-event-option-${event.id}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{event.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                            </span>
                          </div>
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
          </motion.div>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Scansione QR Code</h2>
                  <p className="text-muted-foreground text-sm">Usa il lettore o inserisci manualmente</p>
                </div>
              </div>

              <Input
                placeholder="Inserisci o scansiona QR code..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
                className="h-14 text-lg font-mono"
                disabled={!activeEventId}
                data-testid="input-qr-code"
              />

              <div className="flex gap-3">
                <HapticButton
                  onClick={handleScan}
                  disabled={scanMutation.isPending || !qrInput.trim() || !activeEventId}
                  className="flex-1 h-14 text-base font-semibold"
                  hapticType="medium"
                  data-testid="button-scan"
                >
                  {scanMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ScanLine className="w-5 h-5 mr-2" />
                      Scansiona
                    </>
                  )}
                </HapticButton>

                <HapticButton
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  onClick={resetScanner}
                  data-testid="button-reset"
                >
                  <RefreshCw className="w-5 h-5" />
                </HapticButton>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence mode="wait">
          {scanResult && scanResult.success && scanResult.person && (
            <motion.div
              key="success"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
            >
              <Card className="border-2 border-emerald-500/50 bg-emerald-500/5 overflow-hidden" data-testid="card-success">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...springTransition, delay: 0.1 }}
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-emerald-400">Check-in Effettuato</h3>
                      <p className="text-muted-foreground text-sm">{scanResult.message || "Ingresso registrato con successo"}</p>
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xl font-bold" data-testid="text-person-name">
                          {scanResult.person.firstName} {scanResult.person.lastName}
                        </span>
                      </div>
                      <Badge variant="outline" className="capitalize h-8 px-3" data-testid="badge-type">
                        {scanResult.person.type === 'lista' ? (
                          <><Users className="w-4 h-4 mr-1" /> Lista</>
                        ) : scanResult.person.type === 'biglietto' ? (
                          <><Ticket className="w-4 h-4 mr-1" /> Biglietto</>
                        ) : (
                          <><Armchair className="w-4 h-4 mr-1" /> Tavolo</>
                        )}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {scanResult.person.phone && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Telefono</span>
                          <span className="font-medium" data-testid="text-phone">
                            {scanResult.person.phone}
                          </span>
                        </div>
                      )}
                      {scanResult.person.listName && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Lista</span>
                          <span className="font-medium" data-testid="text-list-name">
                            {scanResult.person.listName}
                          </span>
                        </div>
                      )}
                      {scanResult.person.tableName && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Tavolo</span>
                          <span className="font-medium" data-testid="text-table-name">
                            {scanResult.person.tableName}
                          </span>
                        </div>
                      )}
                      {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Accompagnatori</span>
                          <span className="font-medium" data-testid="text-plus-ones">
                            +{scanResult.person.plusOnes}
                          </span>
                        </div>
                      )}
                      {scanResult.person.ticketCode && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Codice</span>
                          <span className="font-medium font-mono" data-testid="text-ticket-code">
                            {scanResult.person.ticketCode}
                          </span>
                        </div>
                      )}
                      {scanResult.person.ticketType && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Tipo</span>
                          <span className="font-medium" data-testid="text-ticket-type">
                            {scanResult.person.ticketType}
                          </span>
                        </div>
                      )}
                      {scanResult.person.sector && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Settore</span>
                          <span className="font-medium" data-testid="text-ticket-sector">
                            {scanResult.person.sector}
                          </span>
                        </div>
                      )}
                      {scanResult.person.price && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <span className="text-muted-foreground text-xs block mb-1">Prezzo</span>
                          <span className="font-medium" data-testid="text-ticket-price">
                            €{parseFloat(scanResult.person.price).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {scanResult.person.status && (
                      <Badge 
                        variant={scanResult.person.status === 'confirmed' ? 'default' : 'secondary'}
                        className="h-8 px-3"
                        data-testid="badge-status"
                      >
                        {scanResult.person.status === 'confirmed' ? 'Confermato' : scanResult.person.status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {scanResult && scanResult.alreadyCheckedIn && (
            <motion.div
              key="already"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
            >
              <Card className="border-2 border-amber-500/50 bg-amber-500/5 overflow-hidden" data-testid="card-already-checked">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={springTransition}
                    >
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-amber-400">Già Registrato</h3>
                      <p className="text-muted-foreground text-sm">
                        {scanResult.checkedInAt 
                          ? `Check-in alle ${format(new Date(scanResult.checkedInAt), "HH:mm", { locale: it })}`
                          : "QR già utilizzato"
                        }
                      </p>
                    </div>
                  </div>
                  {scanResult.person && (
                    <div className="bg-background/50 rounded-2xl p-4 mt-4">
                      <p className="font-bold text-lg" data-testid="text-already-person-name">
                        {scanResult.person.firstName} {scanResult.person.lastName}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {scanResult && !scanResult.success && scanResult.error && (
            <motion.div
              key="error"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
            >
              <Card className="border-2 border-rose-500/50 bg-rose-500/5 overflow-hidden" data-testid="card-error">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.4 }}
                    >
                      <XCircle className="w-8 h-8 text-rose-400" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-rose-400">Errore Scansione</h3>
                      <p className="text-muted-foreground text-sm" data-testid="text-error-message">
                        {scanResult.error}
                      </p>
                    </div>
                  </div>
                  <div className="bg-background/50 rounded-2xl p-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Verifica che il codice QR sia valido e appartenga a questo evento.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!scanResult && activeEventId && (
            <motion.div
              key="placeholder"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
            >
              <Card className="overflow-hidden">
                <CardContent className="py-16">
                  <motion.div 
                    className="text-center"
                    animate={{ 
                      scale: [1, 1.02, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <QrCode className="w-24 h-24 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground text-lg">
                      Inserisci o scansiona un codice QR
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {recentScans.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="overflow-hidden" data-testid="card-recent-scans">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Scansioni Recenti</h3>
                      <p className="text-muted-foreground text-xs">
                        Ultime {recentScans.length} scansioni
                      </p>
                    </div>
                  </div>
                  <HapticButton 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10"
                    onClick={clearHistory}
                    hapticType="light"
                    data-testid="button-clear-history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </HapticButton>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto overscroll-contain">
                  {recentScans.map((scan, index) => (
                    <motion.div 
                      key={index}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={listItemVariants}
                      className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 min-h-[60px]"
                      data-testid={`recent-scan-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          scan.success 
                            ? 'bg-emerald-500/20' 
                            : scan.alreadyCheckedIn 
                              ? 'bg-amber-500/20' 
                              : 'bg-rose-500/20'
                        }`}>
                          {scan.success ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : scan.alreadyCheckedIn ? (
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {scan.person 
                              ? `${scan.person.firstName} ${scan.person.lastName}`
                              : scan.error || "Errore"
                            }
                          </p>
                          {scan.person && (
                            <p className="text-xs text-muted-foreground">
                              {scan.person.type === 'lista' ? 'Lista' : scan.person.type === 'biglietto' ? 'Biglietto' : 'Tavolo'}
                              {scan.person.listName && ` - ${scan.person.listName}`}
                              {scan.person.tableName && ` - ${scan.person.tableName}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">
                        {format(scan.scannedAt, "HH:mm", { locale: it })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MobileAppLayout>
  );
}
