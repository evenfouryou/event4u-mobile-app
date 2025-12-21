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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Users,
  Armchair,
  Ticket,
  AlertTriangle,
  Loader2,
  Camera,
  CameraOff,
  Search,
  History,
  X,
  ChevronUp,
  Flashlight,
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
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const { data: event } = useQuery<Event>({
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
      setShowSearch(false);
      setIsProcessing(false);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(data.success ? [50] : [100, 50, 100]);
      }
      
      if (data.success && data.person) {
        toast({ 
          title: "Check-in OK", 
          description: `${data.person.firstName} ${data.person.lastName}` 
        });
      } else if (data.alreadyCheckedIn) {
        toast({ 
          title: "Già entrato", 
          description: data.message || "QR già utilizzato",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      const errorResult: ScanResult = { 
        success: false, 
        error: error.message || "Errore scansione" 
      };
      setScanResult(errorResult);
      setIsProcessing(false);
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      toast({ 
        title: "Errore", 
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

  const handleSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    if (query.startsWith('E4U-')) {
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
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!isProcessing) {
            handleScan(decodedText);
          }
        },
        () => {}
      );
      
      setCameraActive(true);
    } catch (error: any) {
      setCameraError("Fotocamera non disponibile");
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {}
    }
    setCameraActive(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        setScanResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  const successCount = recentScans.filter(s => s.success).length;
  const errorCount = recentScans.filter(s => !s.success).length;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header compatto con safe area */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <Link href="/scanner">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-sm"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
          </Link>
          
          <div className="text-center flex-1 px-3">
            <h1 className="text-white font-semibold text-base truncate" data-testid="text-event-name">
              {event?.name || "..."}
            </h1>
            {event && (
              <p className="text-white/60 text-xs">
                {format(new Date(event.startDatetime), "d MMM HH:mm", { locale: it })}
              </p>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-sm"
            onClick={() => setShowHistory(!showHistory)}
            data-testid="button-history"
          >
            <History className="h-5 w-5 text-white" />
            {recentScans.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {recentScans.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Area camera full-screen */}
      <div className="flex-1 relative">
        <div 
          id={scannerContainerId} 
          className={`absolute inset-0 ${cameraActive ? '' : 'hidden'}`}
          style={{ 
            width: '100%', 
            height: '100%',
          }}
        />
        
        {/* Overlay con mirino */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 relative">
                {/* Angoli del mirino */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                
                {/* Linea di scansione animata */}
                <motion.div
                  className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
            
            {/* Oscuramento bordi */}
            <div className="absolute inset-0 bg-black/40" style={{
              maskImage: 'radial-gradient(circle at center, transparent 140px, black 180px)',
              WebkitMaskImage: 'radial-gradient(circle at center, transparent 140px, black 180px)',
            }} />
          </div>
        )}

        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <QrCode className="w-12 h-12 text-emerald-400" />
            </div>
            <p className="text-white/60 mb-4">Fotocamera in avvio...</p>
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-8">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
              <CameraOff className="w-10 h-10 text-rose-400" />
            </div>
            <p className="text-white/80 text-center mb-2">{cameraError}</p>
            <p className="text-white/40 text-sm text-center mb-6">
              Usa la ricerca manuale qui sotto
            </p>
            <Button onClick={startCamera} className="bg-emerald-500 hover:bg-emerald-600">
              <Camera className="w-4 h-4 mr-2" />
              Riprova
            </Button>
          </div>
        )}
      </div>

      {/* Feedback scansione - overlay centrale */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className={`p-8 rounded-3xl backdrop-blur-xl ${
              scanResult.success 
                ? 'bg-emerald-500/90' 
                : scanResult.alreadyCheckedIn 
                  ? 'bg-amber-500/90' 
                  : 'bg-rose-500/90'
            }`}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="text-center"
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-20 h-20 text-white mx-auto mb-3" />
                ) : scanResult.alreadyCheckedIn ? (
                  <AlertTriangle className="w-20 h-20 text-white mx-auto mb-3" />
                ) : (
                  <XCircle className="w-20 h-20 text-white mx-auto mb-3" />
                )}
                
                {scanResult.person && (
                  <div>
                    <p className="text-white text-2xl font-bold">
                      {scanResult.person.firstName}
                    </p>
                    <p className="text-white text-xl">
                      {scanResult.person.lastName}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {scanResult.person.type === 'lista' && (
                        <Badge className="bg-white/20 text-white border-0">
                          <Users className="w-3 h-3 mr-1" /> {scanResult.person.listName}
                        </Badge>
                      )}
                      {scanResult.person.type === 'tavolo' && (
                        <Badge className="bg-white/20 text-white border-0">
                          <Armchair className="w-3 h-3 mr-1" /> {scanResult.person.tableName}
                        </Badge>
                      )}
                      {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                        <Badge className="bg-white/20 text-white border-0">
                          +{scanResult.person.plusOnes}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {scanResult.alreadyCheckedIn && (
                  <p className="text-white text-xl font-semibold">Già entrato</p>
                )}
                
                {scanResult.error && (
                  <p className="text-white text-lg">{scanResult.error}</p>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar con ricerca e stats */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 px-4 pb-4">
          {/* Stats compatti */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">{successCount}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-500/20 px-3 py-1.5 rounded-full">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="text-rose-400 font-semibold">{errorCount}</span>
            </div>
          </div>

          {/* Barra di ricerca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              ref={inputRef}
              placeholder="Cerca nome, telefono o codice QR..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
                if (e.target.value) setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  if (searchQuery.startsWith('E4U-')) {
                    handleScan(searchQuery.trim());
                  }
                }
              }}
              className="h-14 text-base pl-12 pr-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-emerald-500/50"
              data-testid="input-search"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-white/60"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowSearch(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-white/40" />
            )}
          </div>

          {/* Pulsante verifica QR */}
          {searchQuery.startsWith('E4U-') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <Button
                onClick={() => handleScan(searchQuery.trim())}
                disabled={scanMutation.isPending || isProcessing}
                className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-2xl"
                data-testid="button-scan"
              >
                {scanMutation.isPending || isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <QrCode className="w-6 h-6 mr-2" />
                    Verifica QR
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Sheet risultati ricerca */}
      <AnimatePresence>
        {showSearch && searchResults.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-slate-900 rounded-t-3xl max-h-[60vh] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-center py-3">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">
                  {searchResults.length} risultati
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(false)}
                  className="text-white/60"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[45vh] px-4 pb-4">
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <motion.div
                    key={`${result.type}-${result.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-2xl active:scale-[0.98] transition-transform ${
                      result.status === 'checked_in' 
                        ? 'bg-amber-500/20 border border-amber-500/30' 
                        : 'bg-white/5 border border-white/10'
                    }`}
                    onClick={() => handleSearchResultClick(result)}
                    data-testid={`search-result-${result.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          result.type === 'lista' 
                            ? 'bg-blue-500/20' 
                            : 'bg-purple-500/20'
                        }`}>
                          {result.type === 'lista' ? (
                            <Users className="w-6 h-6 text-blue-400" />
                          ) : (
                            <Armchair className="w-6 h-6 text-purple-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            {result.firstName} {result.lastName}
                          </p>
                          <p className="text-sm text-white/60 truncate">
                            {result.type === 'lista' ? result.listName : result.tableName}
                            {result.phone && ` • ${result.phone}`}
                          </p>
                        </div>
                      </div>
                      {result.status === 'checked_in' ? (
                        <Badge className="bg-amber-500 text-white border-0 shrink-0">
                          Entrato
                        </Badge>
                      ) : (
                        <ChevronUp className="w-5 h-5 text-emerald-400 rotate-90 shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet cronologia */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-3xl max-h-[70vh] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-center py-3">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-lg">
                  Cronologia ({recentScans.length})
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                  className="text-white/60 h-10 w-10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{successCount}</p>
                  <p className="text-xs text-emerald-400/70">Check-in</p>
                </div>
                <div className="flex-1 bg-rose-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-rose-400">{errorCount}</p>
                  <p className="text-xs text-rose-400/70">Errori</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[45vh] px-4 pb-4">
              {recentScans.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Nessuna scansione</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentScans.map((scan, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl ${
                        scan.success 
                          ? 'bg-emerald-500/10 border border-emerald-500/20' 
                          : scan.alreadyCheckedIn
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-rose-500/10 border border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
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
                        <div className="min-w-0 flex-1">
                          {scan.person ? (
                            <>
                              <p className="font-medium text-white truncate">
                                {scan.person.firstName} {scan.person.lastName}
                              </p>
                              <p className="text-xs text-white/50">
                                {format(scan.scannedAt, "HH:mm:ss")}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-white/70 text-sm truncate">
                                {scan.error || scan.message || "Errore"}
                              </p>
                              <p className="text-xs text-white/50">
                                {format(scan.scannedAt, "HH:mm:ss")}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messaggio nessun risultato */}
      <AnimatePresence>
        {showSearch && searchQuery.length >= 2 && !searchQuery.startsWith('E4U-') && !isSearching && searchResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-4 right-4 z-40"
          >
            <div className="bg-slate-800 rounded-2xl p-4 text-center border border-white/10">
              <Search className="w-8 h-8 text-white/30 mx-auto mb-2" />
              <p className="text-white/60">Nessun risultato per "{searchQuery}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
