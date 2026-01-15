import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  Users,
  Armchair,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLocation } from "wouter";

interface ScanResult {
  type: 'booking' | 'guest';
  message: string;
  data: any;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export default function PrScannerPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [qrInput, setQrInput] = useState("");
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

  const scanMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/pr/scan-qr", { qrCode });
      return response.json();
    },
    onSuccess: (data: ScanResult) => {
      setLastScan(data);
      setScanError(null);
      setQrInput("");
      setIsResultDialogOpen(true);
      triggerHaptic('success');
      toast({
        title: data.type === 'booking' ? "Tavolo Check-in" : "Ospite Check-in",
        description: data.message,
      });
    },
    onError: async (error: any) => {
      setScanError(error.message);
      setLastScan(null);
      setIsResultDialogOpen(true);
      triggerHaptic('error');
      toast({
        title: "Errore Scansione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = useCallback(() => {
    if (!qrInput.trim()) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Inserisci o scansiona un codice QR",
        variant: "destructive",
      });
      return;
    }
    triggerHaptic('medium');
    scanMutation.mutate(qrInput.trim());
  }, [qrInput, scanMutation, toast]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = useCallback(() => {
    triggerHaptic('light');
    setQrInput("");
    setLastScan(null);
    setScanError(null);
  }, []);

  const header = (
    <MobileHeader
      title="Scanner QR"
      subtitle="Check-in ospiti"
      leftAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/pr")}
          className="h-11 w-11"
          hapticType="light"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </HapticButton>
      }
    />
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-scanner">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/pr")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Scanner QR</h1>
              <p className="text-muted-foreground">Check-in ospiti e prenotazioni tavoli</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Scansione QR Code
              </CardTitle>
              <CardDescription>
                Inserisci o scansiona un codice QR per effettuare il check-in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Inserisci o scansiona QR code..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                className="h-12 text-lg font-mono"
                data-testid="input-qr-code"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={handleScan}
                  disabled={scanMutation.isPending || !qrInput.trim()}
                  className="flex-1"
                  data-testid="button-scan"
                >
                  {scanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4 mr-2" />
                      Verifica
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetScanner}
                  data-testid="button-reset"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Come funziona</CardTitle>
              <CardDescription>
                Istruzioni per la scansione dei codici QR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Step</TableHead>
                    <TableHead>Istruzione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    "Punta il lettore QR code verso il telefono dell'ospite",
                    "Il codice verrà letto automaticamente nel campo di testo",
                    "Premi \"Verifica\" o Invio per confermare il check-in",
                    "Verifica i dati dell'ospite mostrati sullo schermo"
                  ].map((step, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{step}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Result Dialog */}
        <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
          <DialogContent className="sm:max-w-md">
            {lastScan && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                    Check-in Completato
                  </DialogTitle>
                  <DialogDescription>{lastScan.message}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    {lastScan.type === 'booking' ? (
                      <Armchair className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Users className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Badge variant="outline">
                      {lastScan.type === 'booking' ? 'Prenotazione Tavolo' : 'Lista Ospiti'}
                    </Badge>
                  </div>
                  
                  {lastScan.type === 'booking' && lastScan.data && (
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">{lastScan.data.customerName}</p>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Ospiti</TableCell>
                            <TableCell className="font-medium">{lastScan.data.guestCount}</TableCell>
                          </TableRow>
                          {lastScan.data.customerPhone && (
                            <TableRow>
                              <TableCell className="text-muted-foreground">Telefono</TableCell>
                              <TableCell className="font-medium">{lastScan.data.customerPhone}</TableCell>
                            </TableRow>
                          )}
                          {lastScan.data.qrScannedAt && (
                            <TableRow>
                              <TableCell className="text-muted-foreground">Scansionato</TableCell>
                              <TableCell className="font-medium">
                                {format(new Date(lastScan.data.qrScannedAt), "d MMM yyyy HH:mm", { locale: it })}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {lastScan.type === 'guest' && lastScan.data && (
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">
                        {lastScan.data.firstName} {lastScan.data.lastName}
                      </p>
                      <Table>
                        <TableBody>
                          {lastScan.data.plusOnes > 0 && (
                            <TableRow>
                              <TableCell className="text-muted-foreground">+1</TableCell>
                              <TableCell className="font-medium">{lastScan.data.plusOnes}</TableCell>
                            </TableRow>
                          )}
                          {lastScan.data.phone && (
                            <TableRow>
                              <TableCell className="text-muted-foreground">Telefono</TableCell>
                              <TableCell className="font-medium">{lastScan.data.phone}</TableCell>
                            </TableRow>
                          )}
                          {lastScan.data.qrScannedAt && (
                            <TableRow>
                              <TableCell className="text-muted-foreground">Scansionato</TableCell>
                              <TableCell className="font-medium">
                                {format(new Date(lastScan.data.qrScannedAt), "d MMM yyyy HH:mm", { locale: it })}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {scanError && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-500">
                    <XCircle className="w-5 h-5" />
                    Errore Scansione
                  </DialogTitle>
                  <DialogDescription>{scanError}</DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                  <div className="flex items-center gap-3 text-yellow-600 bg-yellow-500/10 p-4 rounded-lg">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">
                      {scanError.includes('già utilizzato') 
                        ? "Questo QR code è già stato scansionato"
                        : scanError.includes('non valido')
                        ? "Il codice QR non corrisponde a nessuna prenotazione o ospite"
                        : "Si è verificato un errore durante la scansione"
                      }
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout header={header}>
      <div className="flex flex-col h-full pb-24">
        {/* Scanner Icon Header */}
        <motion.div 
          className="text-center py-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
        >
          <motion.div 
            className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
          >
            <ScanLine className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">
            Scanner QR
          </h1>
          <p className="text-muted-foreground mt-2">
            Scansiona il QR code per il check-in
          </p>
        </motion.div>

        {/* Scanner Input Area */}
        <motion.div 
          className="px-4 space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
        >
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-primary" />
              <span className="font-semibold">Scansione QR Code</span>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="Inserisci o scansiona QR code..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                className="h-14 text-lg font-mono rounded-xl"
                data-testid="input-qr-code"
              />
              
              <HapticButton
                onClick={handleScan}
                disabled={scanMutation.isPending || !qrInput.trim()}
                className="w-full h-14 text-base font-semibold rounded-xl"
                hapticType="medium"
                data-testid="button-scan"
              >
                {scanMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ScanLine className="w-5 h-5 mr-2" />
                    Verifica
                  </>
                )}
              </HapticButton>
              
              <HapticButton
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={resetScanner}
                hapticType="light"
                data-testid="button-reset"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </HapticButton>
            </div>
          </div>
        </motion.div>

        {/* Results Area */}
        <div className="flex-1 px-4 mt-4">
          <AnimatePresence mode="wait">
            {/* Success Result */}
            {lastScan && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={springTransition}
                className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4"
                data-testid="card-success"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...springTransition, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-500">Check-in Completato</h3>
                    <p className="text-muted-foreground text-sm">{lastScan.message}</p>
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {lastScan.type === 'booking' ? (
                      <Armchair className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Users className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Badge variant="outline">
                      {lastScan.type === 'booking' ? 'Prenotazione Tavolo' : 'Lista Ospiti'}
                    </Badge>
                  </div>
                  
                  {lastScan.type === 'booking' && lastScan.data && (
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">{lastScan.data.customerName}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Ospiti:</span>
                          <span className="ml-2 font-medium">{lastScan.data.guestCount}</span>
                        </div>
                        {lastScan.data.customerPhone && (
                          <div>
                            <span className="text-muted-foreground">Tel:</span>
                            <span className="ml-2 font-medium">{lastScan.data.customerPhone}</span>
                          </div>
                        )}
                      </div>
                      {lastScan.data.qrScannedAt && (
                        <p className="text-xs text-muted-foreground pt-2">
                          Scansionato: {format(new Date(lastScan.data.qrScannedAt), "d MMM yyyy HH:mm", { locale: it })}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {lastScan.type === 'guest' && lastScan.data && (
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">
                        {lastScan.data.firstName} {lastScan.data.lastName}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {lastScan.data.plusOnes > 0 && (
                          <div>
                            <span className="text-muted-foreground">+1:</span>
                            <span className="ml-2 font-medium">{lastScan.data.plusOnes}</span>
                          </div>
                        )}
                        {lastScan.data.phone && (
                          <div>
                            <span className="text-muted-foreground">Tel:</span>
                            <span className="ml-2 font-medium">{lastScan.data.phone}</span>
                          </div>
                        )}
                      </div>
                      {lastScan.data.qrScannedAt && (
                        <p className="text-xs text-muted-foreground pt-2">
                          Scansionato: {format(new Date(lastScan.data.qrScannedAt), "d MMM yyyy HH:mm", { locale: it })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Error Result */}
            {scanError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={springTransition}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4"
                data-testid="card-error"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...springTransition, delay: 0.1 }}
                  >
                    <XCircle className="w-7 h-7 text-red-500" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-500">Errore Scansione</h3>
                    <p className="text-muted-foreground text-sm">{scanError}</p>
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-yellow-600">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">
                      {scanError.includes('già utilizzato') 
                        ? "Questo QR code è già stato scansionato"
                        : scanError.includes('non valido')
                        ? "Il codice QR non corrisponde a nessuna prenotazione o ospite"
                        : "Si è verificato un errore durante la scansione"
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Instructions */}
            {!lastScan && !scanError && (
              <motion.div
                key="instructions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={springTransition}
                className="bg-card rounded-2xl p-4 border border-border"
              >
                <h3 className="font-semibold mb-4">Come funziona</h3>
                <ol className="space-y-4">
                  {[
                    "Punta il lettore QR code verso il telefono dell'ospite",
                    "Il codice verrà letto automaticamente nel campo di testo",
                    "Premi \"Verifica\" o Invio per confermare il check-in",
                    "Verifica i dati dell'ospite mostrati sullo schermo"
                  ].map((step, index) => (
                    <motion.li 
                      key={index}
                      className="flex gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springTransition, delay: 0.1 * (index + 1) }}
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MobileAppLayout>
  );
}
