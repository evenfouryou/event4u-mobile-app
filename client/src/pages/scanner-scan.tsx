import { useState, useRef, useEffect, useCallback } from "react";
import { useScannerSearchWorker } from "@/hooks/use-scanner-search-worker";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Html5Qrcode } from "html5-qrcode";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { HapticButton, BottomSheet, triggerHaptic } from "@/components/mobile-primitives";
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Users,
  Armchair,
  AlertTriangle,
  Loader2,
  Camera,
  CameraOff,
  Search,
  History,
  X,
  ChevronRight,
  Zap,
  ZapOff,
  List,
  User,
  Ticket,
  MapPin,
  CreditCard,
} from "lucide-react";

interface ScanResult {
  success: boolean;
  message?: string;
  error?: string;
  type?: 'list' | 'table' | 'ticket' | 'reservation';
  person?: {
    firstName: string;
    lastName: string;
    phone?: string;
    type: 'lista' | 'tavolo' | 'biglietto' | 'prenotazione_lista' | 'prenotazione_tavolo';
    listName?: string;
    tableName?: string;
    tableTypeName?: string;
    status?: string;
    plusOnes?: number;
    guestCount?: number;
    ticketType?: string;
    ticketCode?: string;
    sector?: string;
    price?: string;
    amount?: string;
    reservationType?: 'list' | 'table';
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

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const viewfinderVariants = {
  idle: {
    scale: 1,
    borderColor: "rgba(16, 185, 129, 0.8)",
  },
  scanning: {
    scale: [1, 1.02, 1],
    borderColor: ["rgba(16, 185, 129, 0.8)", "rgba(16, 185, 129, 1)", "rgba(16, 185, 129, 0.8)"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  success: {
    scale: [1, 1.1, 1],
    borderColor: "rgba(16, 185, 129, 1)",
    transition: springTransition,
  },
  error: {
    scale: [1, 0.95, 1],
    borderColor: "rgba(239, 68, 68, 1)",
    transition: springTransition,
  },
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

export default function ScannerScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handleScanRef = useRef<(code: string) => void>(() => {});
  const scannerContainerId = "qr-reader-container";
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  
  // Web Worker for search - runs in separate thread, never blocks camera
  const { 
    search: workerSearch, 
    results: searchResults, 
    isSearching, 
    clearResults: clearSearchResults 
  } = useScannerSearchWorker({ eventId, enabled: true });
  const [showSearch, setShowSearch] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [viewfinderState, setViewfinderState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [scanPaused, setScanPaused] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(2);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      clearSearchResults();
      setShowSearch(false);
      setIsProcessing(false);
      
      // Pause scanner and show confirmation modal
      setScanPaused(true);
      setShowConfirmModal(true);
      
      // On mobile, pause() can cause issues - just use the scanPaused flag instead
      // The flag prevents handleScan from processing new scans
      // Only attempt pause on desktop where it's more reliable
      if (scannerRef.current && !isMobile) {
        try {
          scannerRef.current.pause(true);
        } catch (e) {
          console.log('[Scanner] Could not pause scanner (expected on some devices)');
        }
      }
      
      if (data.success) {
        setViewfinderState("success");
        triggerHaptic("success");
        playSound("success");
      } else {
        setViewfinderState("error");
        triggerHaptic("error");
        playSound("error");
      }
    },
    onError: (error: any) => {
      const errorResult: ScanResult = { 
        success: false, 
        error: error.message || "Errore scansione" 
      };
      setScanResult(errorResult);
      setIsProcessing(false);
      setViewfinderState("error");
      triggerHaptic("error");
      playSound("error");
      
      // Pause scanner and show confirmation modal for errors too
      setScanPaused(true);
      setShowConfirmModal(true);
      
      // On mobile, skip pause to avoid camera freezing issues
      if (scannerRef.current && !isMobile) {
        try {
          scannerRef.current.pause(true);
        } catch (e) {
          console.log('[Scanner] Could not pause scanner (expected on some devices)');
        }
      }
    },
  });

  // Handle confirmation - resume scanning
  const handleConfirmScan = useCallback(() => {
    // Clear any existing timer
    if (autoCloseTimerRef.current) {
      clearInterval(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    
    setShowConfirmModal(false);
    setScanResult(null);
    setScanPaused(false);
    setViewfinderState("scanning");
    setAutoCloseCountdown(2);
    
    // Resume the camera with retry logic for mobile
    const resumeCamera = async () => {
      // On mobile, we don't pause the camera, so nothing to resume
      // Just ensure scanner is still active
      if (!scannerRef.current) {
        console.log('[Scanner] No scanner reference, restarting camera...');
        // Camera was lost, need to restart it
        setTimeout(async () => {
          try {
            const scanner = new Html5Qrcode(scannerContainerId, {
              verbose: false,
              formatsToSupport: [0],
            });
            scannerRef.current = scanner;
            
            await scanner.start(
              { facingMode: "environment" },
              {
                fps: 15,
                qrbox: { width: 300, height: 300 },
                aspectRatio: 1,
                disableFlip: false,
              },
              (decodedText) => {
                console.log('[Scanner] QR code decoded:', decodedText);
                handleScanRef.current(decodedText);
              },
              () => {}
            );
            
            setCameraActive(true);
            setViewfinderState("scanning");
            console.log('[Scanner] Camera restarted successfully');
          } catch (restartErr) {
            console.error('[Scanner] Failed to restart camera:', restartErr);
            setCameraError("Errore camera - riprova");
            setCameraActive(false);
          }
        }, 300);
        return;
      }
      
      try {
        // Check if scanner is paused (only happens on desktop)
        // @ts-ignore - getState exists but not in types
        const state = scannerRef.current.getState?.();
        if (state === 3) { // PAUSED state
          scannerRef.current.resume();
          console.log('[Scanner] Camera resumed from paused state');
        } else {
          console.log('[Scanner] Camera already running, state:', state);
        }
      } catch (e) {
        console.log('[Scanner] Resume check failed, camera likely still running');
        // On mobile, camera keeps running - this is expected
      }
    };
    
    resumeCamera();
  }, []);

  // Auto-close modal after 2 seconds
  useEffect(() => {
    if (showConfirmModal) {
      setAutoCloseCountdown(2);
      
      autoCloseTimerRef.current = setInterval(() => {
        setAutoCloseCountdown(prev => {
          if (prev <= 1) {
            // Time's up, close the modal
            if (autoCloseTimerRef.current) {
              clearInterval(autoCloseTimerRef.current);
              autoCloseTimerRef.current = null;
            }
            handleConfirmScan();
            return 2;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (autoCloseTimerRef.current) {
          clearInterval(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }
      };
    }
  }, [showConfirmModal, handleConfirmScan]);

  const handleScan = useCallback((code: string) => {
    if (!code.trim() || isProcessing || scanPaused) return;
    setIsProcessing(true);
    // Initialize audio on first scan (user gesture)
    initAudioContext();
    scanMutation.mutate(code.trim());
  }, [isProcessing, scanPaused, scanMutation]);

  // Keep the ref updated with the latest handleScan
  handleScanRef.current = handleScan;

  // Trigger worker search when query changes - completely off main thread
  useEffect(() => {
    workerSearch(searchQuery);
  }, [searchQuery, workerSearch]);

  const handleSearchResultClick = (result: any) => {
    if (result.qrCode) {
      handleScan(result.qrCode);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const scanner = new Html5Qrcode(scannerContainerId, {
        verbose: false,
        formatsToSupport: [0], // 0 = QR_CODE only for better performance
      });
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15, // Increased from 10 for faster scanning
          qrbox: { width: 300, height: 300 }, // Larger scan area for printed QR codes
          aspectRatio: 1,
          disableFlip: false, // Allow image flipping for better detection
        },
        (decodedText) => {
          console.log('[Scanner] QR code decoded:', decodedText);
          // Use ref to always get the latest handleScan function
          handleScanRef.current(decodedText);
        },
        () => {} // Ignore error callback (continuous scanning)
      );
      
      setCameraActive(true);
      setViewfinderState("scanning");
    } catch (error: any) {
      console.error('[Scanner] Camera error:', error);
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
    setViewfinderState("idle");
  };

  const toggleFlash = async () => {
    if (scannerRef.current) {
      try {
        const newFlashState = !flashEnabled;
        await scannerRef.current.applyVideoConstraints({
          // @ts-ignore - torch is a valid constraint
          advanced: [{ torch: newFlashState }]
        });
        setFlashEnabled(newFlashState);
        triggerHaptic("light");
      } catch (error) {
        console.log("Flash not supported");
      }
    }
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

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-scanner-scan">
        <div className="flex items-center gap-4">
          <Link href="/scanner">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-event-name">{event?.name || "Scanner"}</h1>
            {event && (
              <p className="text-muted-foreground">
                {format(new Date(event.startDatetime), "d MMMM yyyy • HH:mm", { locale: it })}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Scanner QR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden bg-muted">
                  <div 
                    id={scannerContainerId} 
                    className="absolute inset-0 w-full h-full"
                  />
                  
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
                      <QrCode className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">Avvio fotocamera...</p>
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
                      <CameraOff className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">{cameraError}</p>
                      <Button onClick={startCamera} className="mt-4" data-testid="button-retry-camera">
                        <Camera className="w-4 h-4 mr-2" />
                        Riprova
                      </Button>
                    </div>
                  )}
                </div>

                <div className="relative max-w-md mx-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder="Cerca nome, telefono o codice QR..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        if (searchQuery.startsWith('E4U-')) {
                          handleScan(searchQuery.trim());
                        }
                      }
                    }}
                    className="pl-9 pr-9"
                    data-testid="input-search"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => {
                        setSearchQuery("");
                        clearSearchResults();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {searchQuery.startsWith('E4U-') && (
                  <div className="max-w-md mx-auto">
                    <Button
                      onClick={() => handleScan(searchQuery.trim())}
                      disabled={scanMutation.isPending || isProcessing}
                      className="w-full"
                      data-testid="button-scan"
                    >
                      {scanMutation.isPending || isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      Verifica QR
                    </Button>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="text-sm text-muted-foreground">{searchResults.length} risultati</p>
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        className={`w-full p-3 rounded-lg text-left transition-all hover-elevate ${
                          result.status === 'checked_in' 
                            ? 'bg-amber-500/10 border border-amber-500/20' 
                            : 'bg-muted/50 border border-border'
                        }`}
                        onClick={() => handleSearchResultClick(result)}
                        data-testid={`search-result-${result.id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              result.type === 'lista' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                            }`}>
                              {result.type === 'lista' ? (
                                <Users className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Armchair className="w-5 h-5 text-purple-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {result.firstName} {result.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {result.type === 'lista' ? result.listName : result.tableName}
                              </p>
                            </div>
                          </div>
                          {result.status === 'checked_in' ? (
                            <Badge className="bg-amber-500 text-white border-0 shrink-0">Entrato</Badge>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className={`border-2 ${
                    scanResult.success 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : scanResult.alreadyCheckedIn 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-rose-500 bg-rose-500/10'
                  }`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                          scanResult.success 
                            ? 'bg-emerald-500/20' 
                            : scanResult.alreadyCheckedIn 
                              ? 'bg-amber-500/20' 
                              : 'bg-rose-500/20'
                        }`}>
                          {scanResult.success ? (
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          ) : scanResult.alreadyCheckedIn ? (
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                          ) : (
                            <XCircle className="w-8 h-8 text-rose-500" />
                          )}
                        </div>
                        <div>
                          {scanResult.person && (
                            <>
                              <p className="text-xl font-bold">
                                {scanResult.person.firstName} {scanResult.person.lastName}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {scanResult.person.type === 'lista' && (
                                  <Badge variant="secondary">
                                    <Users className="w-3 h-3 mr-1" /> {scanResult.person.listName}
                                  </Badge>
                                )}
                                {scanResult.person.type === 'tavolo' && (
                                  <Badge variant="secondary">
                                    <Armchair className="w-3 h-3 mr-1" /> {scanResult.person.tableName}
                                  </Badge>
                                )}
                                {scanResult.person.type === 'prenotazione_lista' && (
                                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                    <Users className="w-3 h-3 mr-1" /> Prenotazione: {scanResult.person.listName}
                                  </Badge>
                                )}
                                {scanResult.person.type === 'prenotazione_tavolo' && (
                                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                    <Armchair className="w-3 h-3 mr-1" /> Prenotazione: {scanResult.person.tableTypeName}
                                  </Badge>
                                )}
                                {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                                  <Badge variant="secondary">+{scanResult.person.plusOnes}</Badge>
                                )}
                                {scanResult.person.guestCount !== undefined && scanResult.person.guestCount > 0 && (
                                  <Badge variant="secondary">Ospiti: {scanResult.person.guestCount}</Badge>
                                )}
                                {scanResult.person.amount && (
                                  <Badge variant="outline">€{scanResult.person.amount}</Badge>
                                )}
                              </div>
                            </>
                          )}
                          {scanResult.alreadyCheckedIn && !scanResult.person && (
                            <p className="text-lg font-semibold text-amber-500">Già entrato</p>
                          )}
                          {scanResult.error && (
                            <p className="text-lg text-rose-500">{scanResult.error}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-emerald-500">{successCount}</div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-rose-500">{errorCount}</div>
                  <p className="text-sm text-muted-foreground">Errori</p>
                </CardContent>
              </Card>
            </div>

            <Link href={`/scanner/tickets/${eventId}`}>
              <Button variant="outline" className="w-full mb-4" data-testid="button-view-tickets">
                <List className="h-4 w-4 mr-2" />
                Visualizza tutti i titoli
              </Button>
            </Link>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Cronologia
                </CardTitle>
                {recentScans.length > 0 && (
                  <Badge variant="secondary">{recentScans.length}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {recentScans.length === 0 ? (
                  <div className="text-center py-8">
                    <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessuna scansione</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {recentScans.slice(0, 20).map((scan, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          scan.success 
                            ? 'bg-emerald-500/10 border border-emerald-500/20' 
                            : scan.alreadyCheckedIn
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : 'bg-rose-500/10 border border-rose-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            scan.success 
                              ? 'bg-emerald-500/20' 
                              : scan.alreadyCheckedIn 
                                ? 'bg-amber-500/20' 
                                : 'bg-rose-500/20'
                          }`}>
                            {scan.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : scan.alreadyCheckedIn ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {scan.person ? (
                              <>
                                <p className="font-medium text-sm truncate">
                                  {scan.person.firstName} {scan.person.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(scan.scannedAt, "HH:mm:ss")}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground truncate">
                                  {scan.error || scan.message || "Errore"}
                                </p>
                                <p className="text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Full-screen Camera Background */}
      <div 
        id={scannerContainerId} 
        className={`absolute inset-0 ${cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Camera Loading State */}
      {!cameraActive && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e17]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
            className="w-28 h-28 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
          >
            <QrCode className="w-14 h-14 text-emerald-400" />
          </motion.div>
          <p className="text-white/60 mb-4 text-lg">Avvio fotocamera...</p>
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      )}

      {/* Camera Error State */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e17] px-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
            className="w-24 h-24 rounded-full bg-rose-500/20 flex items-center justify-center mb-6"
          >
            <CameraOff className="w-12 h-12 text-rose-400" />
          </motion.div>
          <p className="text-white/80 text-center mb-2 text-lg">{cameraError}</p>
          <p className="text-white/40 text-center mb-8">
            Usa la ricerca manuale qui sotto
          </p>
          <HapticButton 
            onClick={startCamera} 
            className="bg-emerald-500 hover:bg-emerald-600 h-14 px-8 rounded-2xl text-lg"
            hapticType="medium"
          >
            <Camera className="w-5 h-5 mr-2" />
            Riprova
          </HapticButton>
        </div>
      )}

      {/* Animated Viewfinder Overlay */}
      {cameraActive && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Dark vignette effect */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 130px, rgba(0,0,0,0.7) 200px)',
            }}
          />
          
          {/* Centered Viewfinder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="w-72 h-72 relative"
              variants={viewfinderVariants}
              animate={viewfinderState}
            >
              {/* Corner brackets with spring animation */}
              <motion.div 
                className="absolute -top-1 -left-1 w-12 h-12 border-t-[5px] border-l-[5px] border-emerald-400 rounded-tl-2xl"
                initial={{ opacity: 0, x: -20, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ ...springTransition, delay: 0.1 }}
              />
              <motion.div 
                className="absolute -top-1 -right-1 w-12 h-12 border-t-[5px] border-r-[5px] border-emerald-400 rounded-tr-2xl"
                initial={{ opacity: 0, x: 20, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ ...springTransition, delay: 0.15 }}
              />
              <motion.div 
                className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[5px] border-l-[5px] border-emerald-400 rounded-bl-2xl"
                initial={{ opacity: 0, x: -20, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ ...springTransition, delay: 0.2 }}
              />
              <motion.div 
                className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[5px] border-r-[5px] border-emerald-400 rounded-br-2xl"
                initial={{ opacity: 0, x: 20, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ ...springTransition, delay: 0.25 }}
              />
              
              {/* Animated scan line */}
              <motion.div
                className="absolute left-6 right-6 h-1 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.9), transparent)',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                }}
                animate={{ 
                  top: ["8%", "88%", "8%"],
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                }}
              />

              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  className="w-6 h-6"
                  animate={{ 
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-emerald-400/60" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-emerald-400/60" />
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-0.5 bg-emerald-400/60" />
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-0.5 bg-emerald-400/60" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Transparent Header with Safe Area */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="absolute top-0 left-0 right-0 z-30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/70 via-black/40 to-transparent">
          <Link href="/scanner">
            <HapticButton 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10"
              data-testid="button-back"
              hapticType="light"
            >
              <ArrowLeft className="h-6 w-6 text-white" />
            </HapticButton>
          </Link>
          
          <div className="text-center flex-1 px-4">
            <motion.h1 
              className="text-white font-bold text-lg truncate" 
              data-testid="text-event-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {event?.name || "..."}
            </motion.h1>
            {event && (
              <motion.p 
                className="text-white/50 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {format(new Date(event.startDatetime), "d MMM • HH:mm", { locale: it })}
              </motion.p>
            )}
          </div>

          <HapticButton 
            variant="ghost" 
            size="icon" 
            className={`h-12 w-12 rounded-full backdrop-blur-md border border-white/10 ${
              flashEnabled ? 'bg-amber-500/30' : 'bg-white/10'
            }`}
            onClick={toggleFlash}
            data-testid="button-flash"
            hapticType="light"
          >
            {flashEnabled ? (
              <Zap className="h-6 w-6 text-amber-400" />
            ) : (
              <ZapOff className="h-6 w-6 text-white/70" />
            )}
          </HapticButton>
        </div>
      </motion.header>

      {/* Scan Result Feedback Overlay */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={springTransition}
              className={`p-8 rounded-3xl backdrop-blur-2xl shadow-2xl ${
                scanResult.success 
                  ? 'bg-emerald-500/95' 
                  : scanResult.alreadyCheckedIn 
                    ? 'bg-amber-500/95' 
                    : 'bg-rose-500/95'
              }`}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springTransition, delay: 0.1 }}
                className="text-center"
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-24 h-24 text-white mx-auto mb-4" />
                ) : scanResult.alreadyCheckedIn ? (
                  <AlertTriangle className="w-24 h-24 text-white mx-auto mb-4" />
                ) : (
                  <XCircle className="w-24 h-24 text-white mx-auto mb-4" />
                )}
                
                {scanResult.person && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-white text-3xl font-bold">
                      {scanResult.person.firstName}
                    </p>
                    <p className="text-white/90 text-2xl font-medium">
                      {scanResult.person.lastName}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                      {scanResult.person.type === 'lista' && (
                        <Badge className="bg-white/20 text-white border-0 px-3 py-1">
                          <Users className="w-4 h-4 mr-1.5" /> {scanResult.person.listName}
                        </Badge>
                      )}
                      {scanResult.person.type === 'tavolo' && (
                        <Badge className="bg-white/20 text-white border-0 px-3 py-1">
                          <Armchair className="w-4 h-4 mr-1.5" /> {scanResult.person.tableName}
                        </Badge>
                      )}
                      {scanResult.person.type === 'prenotazione_lista' && (
                        <Badge className="bg-purple-400/30 text-white border-0 px-3 py-1">
                          <Users className="w-4 h-4 mr-1.5" /> Prenotazione: {scanResult.person.listName}
                        </Badge>
                      )}
                      {scanResult.person.type === 'prenotazione_tavolo' && (
                        <Badge className="bg-purple-400/30 text-white border-0 px-3 py-1">
                          <Armchair className="w-4 h-4 mr-1.5" /> Prenotazione: {scanResult.person.tableTypeName}
                        </Badge>
                      )}
                      {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                        <Badge className="bg-white/20 text-white border-0 px-3 py-1">
                          +{scanResult.person.plusOnes}
                        </Badge>
                      )}
                      {scanResult.person.guestCount !== undefined && scanResult.person.guestCount > 0 && (
                        <Badge className="bg-white/20 text-white border-0 px-3 py-1">
                          Ospiti: {scanResult.person.guestCount}
                        </Badge>
                      )}
                      {scanResult.person.amount && (
                        <Badge className="bg-white/30 text-white border-0 px-3 py-1">
                          €{scanResult.person.amount}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {scanResult.alreadyCheckedIn && !scanResult.person && (
                  <p className="text-white text-2xl font-semibold">Già entrato</p>
                )}
                
                {scanResult.error && (
                  <p className="text-white text-xl">{scanResult.error}</p>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls Area with Safe Area */}
      <motion.footer
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.3 }}
        className="absolute bottom-0 left-0 right-0 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-12 px-4 pb-6">
          {/* Stats Pills */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <motion.div 
              className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm px-4 py-2.5 rounded-full border border-emerald-500/30"
              whileTap={{ scale: 0.95 }}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-bold text-lg">{successCount}</span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2 bg-rose-500/20 backdrop-blur-sm px-4 py-2.5 rounded-full border border-rose-500/30"
              whileTap={{ scale: 0.95 }}
            >
              <XCircle className="w-5 h-5 text-rose-400" />
              <span className="text-rose-400 font-bold text-lg">{errorCount}</span>
            </motion.div>
            <HapticButton
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 relative"
              onClick={() => setShowHistory(true)}
              data-testid="button-history"
              hapticType="light"
            >
              <History className="h-5 w-5 text-white" />
              {recentScans.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {recentScans.length > 99 ? '99+' : recentScans.length}
                </span>
              )}
            </HapticButton>
            <Link href={`/scanner/tickets/${eventId}`}>
              <HapticButton
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/10"
                data-testid="button-tickets-list"
                hapticType="light"
              >
                <List className="h-5 w-5 text-white" />
              </HapticButton>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              ref={inputRef}
              placeholder="Cerca nome, telefono o codice QR..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
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
              className="h-16 text-base pl-14 pr-14 rounded-2xl bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              data-testid="input-search"
            />
            {searchQuery && (
              <HapticButton
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 text-white/60 rounded-xl"
                onClick={() => {
                  setSearchQuery("");
                  clearSearchResults();
                  setShowSearch(false);
                }}
                hapticType="light"
              >
                <X className="h-5 w-5" />
              </HapticButton>
            )}
            {isSearching && (
              <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-white/40" />
            )}
          </div>

          {/* Quick Scan QR Button */}
          <AnimatePresence>
            {searchQuery.startsWith('E4U-') && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mt-4"
              >
                <HapticButton
                  onClick={() => handleScan(searchQuery.trim())}
                  disabled={scanMutation.isPending || isProcessing}
                  className="w-full h-16 text-lg bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-semibold"
                  data-testid="button-scan"
                  hapticType="medium"
                >
                  {scanMutation.isPending || isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="w-6 h-6 mr-2" />
                      Verifica QR
                    </>
                  )}
                </HapticButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.footer>

      {/* Search Results BottomSheet */}
      <BottomSheet
        open={showSearch && searchResults.length > 0}
        onClose={() => setShowSearch(false)}
        title={`${searchResults.length} risultati`}
      >
        <div className="px-4 pb-6">
          <div className="space-y-3">
            {searchResults.map((result) => (
              <motion.button
                key={`${result.type}-${result.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] ${
                  result.status === 'checked_in' 
                    ? 'bg-amber-500/10 border border-amber-500/20' 
                    : 'bg-muted/50 border border-border hover-elevate'
                }`}
                onClick={() => {
                  triggerHaptic("light");
                  handleSearchResultClick(result);
                }}
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
                      <p className="font-semibold text-foreground truncate">
                        {result.firstName} {result.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
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
                    <ChevronRight className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* History BottomSheet */}
      <BottomSheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title={`Cronologia (${recentScans.length})`}
      >
        <div className="px-4 pb-6">
          {/* Summary Stats */}
          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">{successCount}</p>
              <p className="text-sm text-emerald-400/70 mt-1">Check-in</p>
            </div>
            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-rose-400">{errorCount}</p>
              <p className="text-sm text-rose-400/70 mt-1">Errori</p>
            </div>
          </div>
          
          {recentScans.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nessuna scansione</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-2xl ${
                    scan.success 
                      ? 'bg-emerald-500/10 border border-emerald-500/20' 
                      : scan.alreadyCheckedIn
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-rose-500/10 border border-rose-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      scan.success 
                        ? 'bg-emerald-500/20' 
                        : scan.alreadyCheckedIn 
                          ? 'bg-amber-500/20' 
                          : 'bg-rose-500/20'
                    }`}>
                      {scan.success ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : scan.alreadyCheckedIn ? (
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {scan.person ? (
                        <>
                          <p className="font-semibold text-foreground truncate">
                            {scan.person.firstName} {scan.person.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(scan.scannedAt, "HH:mm:ss")}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground text-sm truncate">
                            {scan.error || scan.message || "Errore"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(scan.scannedAt, "HH:mm:ss")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Scan Confirmation BottomSheet - 3-section layout for small screens */}
      <BottomSheet
        open={showConfirmModal}
        onClose={handleConfirmScan}
        className="max-h-[80dvh]"
      >
        <div className="flex flex-col h-full max-h-[calc(80dvh-48px)]">
          {/* Fixed Header: Icon + Name + Status */}
          <div className="shrink-0 px-4 pt-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  scanResult?.success 
                    ? 'bg-emerald-500/20' 
                    : scanResult?.alreadyCheckedIn 
                      ? 'bg-amber-500/20' 
                      : 'bg-rose-500/20'
                }`}
              >
                {scanResult?.success ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                ) : scanResult?.alreadyCheckedIn ? (
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-500" />
                )}
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-foreground truncate" data-testid="confirm-person-name">
                  {scanResult?.person ? `${scanResult.person.firstName} ${scanResult.person.lastName}` : (
                    scanResult?.success ? "Check-in Effettuato" : scanResult?.alreadyCheckedIn ? "Già Entrato" : "Errore"
                  )}
                </p>
                <p className={`text-sm ${
                  scanResult?.success ? 'text-emerald-500' : scanResult?.alreadyCheckedIn ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {scanResult?.success ? "Check-in OK" : scanResult?.alreadyCheckedIn ? "Già registrato" : "Non valido"}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content: Details */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 min-h-0">
            {scanResult?.person && (
              <div className="grid grid-cols-2 gap-2">
                {/* Ticket info */}
                {scanResult.person.type === 'biglietto' && (
                  <>
                    {scanResult.person.ticketType && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Ticket className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Tipo</p>
                          <p className="font-medium text-sm truncate" data-testid="confirm-ticket-type">
                            {scanResult.person.ticketType}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {scanResult.person.sector && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Settore</p>
                          <p className="font-medium text-sm truncate" data-testid="confirm-sector">
                            {scanResult.person.sector}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {scanResult.person.price && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 col-span-2">
                        <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Prezzo</p>
                          <p className="font-semibold text-emerald-500" data-testid="confirm-ticket-price">
                            €{Number(scanResult.person.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* List info */}
                {(scanResult.person.type === 'lista' || scanResult.person.type === 'prenotazione_lista') && scanResult.person.listName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 col-span-2">
                    <Users className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">Lista</p>
                      <p className="font-medium text-sm truncate" data-testid="confirm-list-name">
                        {scanResult.person.listName}
                        {scanResult.person.plusOnes ? ` (+${scanResult.person.plusOnes})` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Table info */}
                {(scanResult.person.type === 'tavolo' || scanResult.person.type === 'prenotazione_tavolo') && (scanResult.person.tableName || scanResult.person.tableTypeName) && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 col-span-2">
                    <Armchair className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">Tavolo</p>
                      <p className="font-medium text-sm truncate" data-testid="confirm-table-name">
                        {scanResult.person.tableName || scanResult.person.tableTypeName}
                        {scanResult.person.guestCount ? ` (${scanResult.person.guestCount} ospiti)` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Amount */}
                {scanResult.person.amount && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 col-span-2">
                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Importo</p>
                      <p className="font-semibold text-emerald-500" data-testid="confirm-amount">
                        €{scanResult.person.amount}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Error messages */}
            {!scanResult?.success && scanResult?.message && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-400 text-center text-sm">{scanResult.message}</p>
              </div>
            )}
            
            {!scanResult?.success && scanResult?.error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-400 text-center text-sm">{scanResult.error}</p>
              </div>
            )}
          </div>
          
          {/* Fixed Footer: Action button with safe-area */}
          <div className="shrink-0 px-4 pt-2 pb-4 border-t border-border/50" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <HapticButton
              onClick={handleConfirmScan}
              className={`w-full h-12 text-base rounded-xl ${
                scanResult?.success 
                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                  : scanResult?.alreadyCheckedIn
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-rose-500 hover:bg-rose-600'
              }`}
              hapticType="medium"
              data-testid="button-confirm-scan"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Prossimo ({autoCloseCountdown}s)
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      {/* No Results Message */}
      <AnimatePresence>
        {showSearch && searchQuery.length >= 2 && !searchQuery.startsWith('E4U-') && !isSearching && searchResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-44 left-4 right-4 z-35"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-5 text-center border border-border shadow-xl">
              <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nessun risultato per "{searchQuery}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
