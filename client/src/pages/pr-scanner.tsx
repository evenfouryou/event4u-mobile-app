import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ScanResult {
  type: 'booking' | 'guest';
  message: string;
  data: any;
}

export default function PrScannerPage() {
  const { toast } = useToast();
  const [qrInput, setQrInput] = useState("");
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/pr/scan-qr", { qrCode });
      return response.json();
    },
    onSuccess: (data: ScanResult) => {
      setLastScan(data);
      setScanError(null);
      setQrInput("");
      toast({
        title: data.type === 'booking' ? "Tavolo Check-in" : "Ospite Check-in",
        description: data.message,
      });
    },
    onError: async (error: any) => {
      setScanError(error.message);
      setLastScan(null);
      toast({
        title: "Errore Scansione",
        description: error.message,
        variant: "destructive",
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
    scanMutation.mutate(qrInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = () => {
    setQrInput("");
    setLastScan(null);
    setScanError(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <ScanLine className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Scanner QR
        </h1>
        <p className="text-muted-foreground mt-2">
          Scansiona il QR code per effettuare il check-in
        </p>
      </div>

      {/* Scanner Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scansione QR Code
          </CardTitle>
          <CardDescription>
            Usa il lettore QR o inserisci manualmente il codice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Inserisci o scansiona QR code..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              className="text-lg font-mono"
              data-testid="input-qr-code"
            />
            <Button
              onClick={handleScan}
              disabled={scanMutation.isPending || !qrInput.trim()}
              className="min-w-[120px]"
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
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={resetScanner}
            data-testid="button-reset"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </CardContent>
      </Card>

      {/* Success Result */}
      {lastScan && (
        <Card className="border-green-500/50 bg-green-500/5 mb-6" data-testid="card-success">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-green-500">Check-in Completato</CardTitle>
                <CardDescription>{lastScan.message}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg p-4 space-y-3">
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
                  <p className="text-lg font-semibold">{lastScan.data.customerName}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
                    <p className="text-xs text-muted-foreground">
                      Scansionato: {format(new Date(lastScan.data.qrScannedAt), "d MMM yyyy HH:mm", { locale: it })}
                    </p>
                  )}
                </div>
              )}
              
              {lastScan.type === 'guest' && lastScan.data && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    {lastScan.data.firstName} {lastScan.data.lastName}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
                    <p className="text-xs text-muted-foreground">
                      Scansionato: {format(new Date(lastScan.data.qrScannedAt), "d MMM yyyy HH:mm", { locale: it })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Result */}
      {scanError && (
        <Card className="border-red-500/50 bg-red-500/5" data-testid="card-error">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-red-500">Errore Scansione</CardTitle>
                <CardDescription>{scanError}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
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
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!lastScan && !scanError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Come funziona</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">1</span>
                <span>Punta il lettore QR code verso il telefono dell'ospite</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">2</span>
                <span>Il codice verrà letto automaticamente nel campo di testo</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">3</span>
                <span>Premi "Verifica" o Invio per confermare il check-in</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">4</span>
                <span>Verifica i dati dell'ospite mostrati sullo schermo</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
