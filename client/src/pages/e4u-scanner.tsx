import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        triggerHaptic('success');
        toast({ 
          title: "Check-in effettuato!", 
          description: `${data.person.firstName} ${data.person.lastName}` 
        });
      } else if (data.alreadyCheckedIn) {
        triggerHaptic('error');
        toast({ 
          title: "Già registrato", 
          description: data.message || "Questo QR è già stato utilizzato",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      triggerHaptic('error');
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
