import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
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
  Camera,
  CameraOff,
  Search,
  BarChart3,
  History,
  Zap,
  Shield,
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

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  status: string;
}

export default function ScannerScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [activeTab, setActiveTab] = useState("scan");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const scanMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/e4u/scan", { 
        qrCode, 
        eventId 
      });
      return response.json();
    },
    onSuccess: (data: ScanResult, qrCode: string) => {
      setScanResult(data);
      const newScan: RecentScan = { 
        ...data, 
        scannedAt: new Date(),
        qrCode: qrCode
      };
      setRecentScans(prev => [newScan, ...prev.slice(0, 99)]);
      setSearchQuery("");
      setSearchResults([]);
      setIsProcessing(false);
      
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
      
      inputRef.current?.focus();
    },
    onError: (error: any) => {
      const errorResult: ScanResult = { 
        success: false, 
        error: error.message || "Errore durante la scansione" 
      };
      setScanResult(errorResult);
      setIsProcessing(false);
      toast({ 
        title: "Errore scansione", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleScan = useCallback((code: string) => {
    if (!code.trim() || isProcessing) return;
    setIsProcessing(true);
    scanMutation.mutate(code.trim());
  }, [isProcessing, scanMutation]);

  const resetScanner = () => {
    setSearchQuery("");
    setSearchResults([]);
    setScanResult(null);
    setIsProcessing(false);
    inputRef.current?.focus();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/e4u/scanner/search/${eventId}?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result: any) => {
    if (result.qrCode) {
      handleScan(result.qrCode);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // First show the container so it has dimensions
      setCameraActive(true);
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          // Ignore stop errors
        }
        scannerRef.current = null;
      }
      
      // Wait for DOM to update with visible container
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Impossibile accedere alla fotocamera");
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setCameraActive(false);
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraActive) {
      inputRef.current?.focus();
    }
  }, [cameraActive]);

  const successCount = recentScans.filter(s => s.success).length;
  const alreadyCount = recentScans.filter(s => s.alreadyCheckedIn).length;
  const errorCount = recentScans.filter(s => !s.success && !s.alreadyCheckedIn).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/scanner">
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold truncate max-w-[180px] flex items-center gap-2" data-testid="text-event-name">
                <Zap className="h-4 w-4 text-emerald-400" />
                {event?.name || "Caricamento..."}
              </h1>
              {event && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.startDatetime), "EEEE d MMM, HH:mm", { locale: it })}
                </p>
              )}
            </div>
          </div>
          <Link href={`/scanner/stats/${eventId}`}>
            <Button variant="outline" size="sm" className="rounded-full" data-testid="button-stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </Button>
          </Link>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 justify-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2"
            >
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {successCount} OK
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-3 py-1">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                {alreadyCount} Duplicati
              </Badge>
              <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 px-3 py-1">
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                {errorCount} Errori
              </Badge>
            </motion.div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-[140px] z-10 bg-background/80 backdrop-blur-xl px-4 pb-3 pt-2">
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-full bg-muted/50">
            <TabsTrigger value="scan" className="rounded-full data-[state=active]:bg-emerald-500 data-[state=active]:text-white" data-testid="tab-scan">
              <Camera className="h-4 w-4 mr-2" />
              Scansione
            </TabsTrigger>
            <TabsTrigger value="scanned" className="rounded-full data-[state=active]:bg-primary" data-testid="tab-scanned">
              <History className="h-4 w-4 mr-2" />
              Cronologia ({recentScans.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scan" className="p-4 space-y-4 mt-0">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-card to-card/80 shadow-xl">
            <CardContent className="p-0">
              <div className="relative">
                <div 
                  id={scannerContainerId} 
                  className={`w-full aspect-square bg-black/90 ${cameraActive ? '' : 'hidden'}`}
                />
                
                {!cameraActive && (
                  <div className="w-full aspect-square bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center p-6"
                    >
                      <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-emerald-500/30">
                        <QrCode className="w-12 h-12 text-emerald-400" />
                      </div>
                      <p className="text-muted-foreground mb-4">
                        Tocca per attivare la fotocamera
                      </p>
                      <Button
                        onClick={startCamera}
                        size="lg"
                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-full px-8"
                        data-testid="button-start-camera"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Attiva Fotocamera
                      </Button>
                    </motion.div>
                  </div>
                )}

                {cameraActive && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <Button
                      onClick={stopCamera}
                      variant="secondary"
                      size="sm"
                      className="rounded-full bg-black/50 backdrop-blur-sm border border-white/10"
                      data-testid="button-stop-camera"
                    >
                      <CameraOff className="w-4 h-4 mr-2" />
                      Chiudi
                    </Button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-4 bg-rose-500/10 border-t border-rose-500/20">
                  <p className="text-sm text-rose-400 text-center flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    {cameraError}
                  </p>
                </div>
              )}

              <div className="p-3 space-y-3 border-t border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder="QR code, nome o telefono..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        if (searchQuery.startsWith('E4U-')) {
                          handleScan(searchQuery.trim());
                        }
                      }
                    }}
                    className="h-12 text-base pl-10 pr-12 rounded-xl bg-muted/30 border-white/10"
                    data-testid="input-search"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  {searchQuery && !isSearching && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setScanResult(null);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {searchQuery.startsWith('E4U-') && (
                  <Button
                    onClick={() => handleScan(searchQuery.trim())}
                    disabled={scanMutation.isPending || !searchQuery.trim() || isProcessing}
                    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl"
                    data-testid="button-scan"
                  >
                    {scanMutation.isPending || isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ScanLine className="w-5 h-5 mr-2" />
                        Verifica QR
                      </>
                    )}
                  </Button>
                )}
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map((result) => (
                      <motion.div
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-2.5 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${
                          result.status === 'checked_in' 
                            ? 'bg-amber-500/10 border border-amber-500/20' 
                            : 'bg-muted/30 border border-white/5'
                        }`}
                        onClick={() => handleSearchResultClick(result)}
                        data-testid={`search-result-${result.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              result.type === 'lista' 
                                ? 'bg-blue-500/20' 
                                : 'bg-purple-500/20'
                            }`}>
                              {result.type === 'lista' ? (
                                <Users className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Armchair className="w-4 h-4 text-purple-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {result.firstName} {result.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {result.type === 'lista' ? result.listName : result.tableName}
                              </p>
                            </div>
                          </div>
                          {result.status === 'checked_in' ? (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0 text-xs px-2">
                              Entrato
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0 text-xs px-2">
                              Check-in
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && !searchQuery.startsWith('E4U-') && !isSearching && searchResults.length === 0 && (
                  <div className="p-3 rounded-lg bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nessun risultato
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {scanResult && scanResult.success && scanResult.person && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 bg-gradient-to-br from-emerald-500/20 to-green-500/10 shadow-xl shadow-emerald-500/10" data-testid="card-success">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-emerald-500/30 flex items-center justify-center shrink-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-emerald-400 font-medium text-sm mb-1">CHECK-IN COMPLETATO</p>
                        <h3 className="text-xl font-bold mb-2 truncate" data-testid="text-person-name">
                          {scanResult.person.firstName} {scanResult.person.lastName}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="capitalize bg-white/5" data-testid="badge-type">
                            {scanResult.person.type === 'lista' && <><Users className="w-3 h-3 mr-1" /> Lista</>}
                            {scanResult.person.type === 'biglietto' && <><Ticket className="w-3 h-3 mr-1" /> Biglietto</>}
                            {scanResult.person.type === 'tavolo' && <><Armchair className="w-3 h-3 mr-1" /> Tavolo</>}
                          </Badge>
                          {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                            <Badge variant="outline" className="bg-white/5">
                              +{scanResult.person.plusOnes} ospiti
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {(scanResult.person.listName || scanResult.person.tableName || scanResult.person.ticketType) && (
                      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                        {scanResult.person.listName && (
                          <div>
                            <span className="text-muted-foreground">Lista:</span>
                            <span className="ml-2 font-medium">{scanResult.person.listName}</span>
                          </div>
                        )}
                        {scanResult.person.tableName && (
                          <div>
                            <span className="text-muted-foreground">Tavolo:</span>
                            <span className="ml-2 font-medium">{scanResult.person.tableName}</span>
                          </div>
                        )}
                        {scanResult.person.ticketType && (
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <span className="ml-2 font-medium">{scanResult.person.ticketType}</span>
                          </div>
                        )}
                        {scanResult.person.sector && (
                          <div>
                            <span className="text-muted-foreground">Settore:</span>
                            <span className="ml-2 font-medium">{scanResult.person.sector}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {scanResult && scanResult.alreadyCheckedIn && (
              <motion.div
                key="already"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 bg-gradient-to-br from-amber-500/20 to-orange-500/10 shadow-xl shadow-amber-500/10" data-testid="card-already-checked">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-amber-500/30 flex items-center justify-center shrink-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-amber-400 font-medium text-sm mb-1">GIÀ ENTRATO</p>
                        <h3 className="text-lg font-bold">
                          {scanResult.person ? `${scanResult.person.firstName} ${scanResult.person.lastName}` : "Ospite"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {scanResult.checkedInAt 
                            ? `Ingresso alle ${format(new Date(scanResult.checkedInAt), "HH:mm", { locale: it })}`
                            : "QR già utilizzato"
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {scanResult && !scanResult.success && scanResult.error && !scanResult.alreadyCheckedIn && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 bg-gradient-to-br from-rose-500/20 to-red-500/10 shadow-xl shadow-rose-500/10" data-testid="card-error">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-rose-500/30 flex items-center justify-center shrink-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <XCircle className="w-8 h-8 text-rose-400" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-rose-400 font-medium text-sm mb-1">ERRORE</p>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.error}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!scanResult && (
            <Card className="border-0 bg-muted/30">
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Pronto per la scansione
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scanned" className="p-4 mt-0">
          {recentScans.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="space-y-2 pr-2">
                {recentScans.map((scan, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card 
                      className={`border-0 ${
                        scan.success 
                          ? 'bg-emerald-500/10' 
                          : scan.alreadyCheckedIn 
                            ? 'bg-amber-500/10'
                            : 'bg-rose-500/10'
                      }`}
                      data-testid={`recent-scan-${index}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
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
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {scan.person 
                                ? `${scan.person.firstName} ${scan.person.lastName}`
                                : scan.error || "Errore"
                              }
                            </p>
                            {scan.person && (
                              <p className="text-xs text-muted-foreground">
                                {scan.person.type === 'lista' && 'Lista'}
                                {scan.person.type === 'tavolo' && 'Tavolo'}
                                {scan.person.type === 'biglietto' && 'Biglietto'}
                                {scan.person.listName && ` • ${scan.person.listName}`}
                                {scan.person.tableName && ` • ${scan.person.tableName}`}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(scan.scannedAt, "HH:mm:ss", { locale: it })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className="border-0 bg-muted/30">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">
                  Nessuna scansione effettuata
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
