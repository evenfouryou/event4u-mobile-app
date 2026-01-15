import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  RefreshCw,
  AlertTriangle,
  User,
  Mail,
  Phone,
  School,
  Calendar,
  Shield,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface BadgeData {
  id: string;
  uniqueCode: string;
  qrCodeUrl: string;
  badgeImageUrl: string | null;
  isActive: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  request: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    landing: {
      schoolName: string;
      logoUrl: string | null;
      primaryColor: string;
    };
  };
}

export default function SchoolBadgeScannerPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [codeInput, setCodeInput] = useState("");
  const [searchCode, setSearchCode] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: badgeData, isLoading, error } = useQuery<BadgeData>({
    queryKey: ["/api/school-badges/badge", searchCode],
    enabled: !!searchCode,
  });

  const handleScan = () => {
    if (!codeInput.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci o scansiona un codice badge",
        variant: "destructive",
      });
      return;
    }
    
    let code = codeInput.trim();
    const urlMatch = code.match(/\/badge\/view\/([A-Z0-9]+)/i);
    if (urlMatch) {
      code = urlMatch[1];
    }
    
    setSearchCode(code.toUpperCase());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = () => {
    setCodeInput("");
    setSearchCode(null);
  };

  const isValid = badgeData && badgeData.isActive && !badgeData.revokedAt;
  const isRevoked = badgeData && (badgeData.revokedAt || !badgeData.isActive);

  const getStatusBadge = () => {
    if (isValid) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-valid">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Valido
        </Badge>
      );
    }
    if (isRevoked) {
      return (
        <Badge variant="destructive" data-testid="badge-revoked">
          <XCircle className="w-4 h-4 mr-1" />
          Revocato
        </Badge>
      );
    }
    return null;
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-school-badge-scanner">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scanner Badge</h1>
            <p className="text-muted-foreground">Scansiona o inserisci il codice per verificare un badge</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Verifica Badge
              </CardTitle>
              <CardDescription>
                Usa il lettore QR o inserisci manualmente il codice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Inserisci codice badge o URL..."
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                  className="text-lg font-mono"
                  data-testid="input-badge-code"
                />
                <Button
                  onClick={handleScan}
                  disabled={isLoading}
                  className="w-full"
                  data-testid="button-scan"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <ScanLine className="w-5 h-5 mr-2" />
                  )}
                  Verifica
                </Button>
              </div>

              {(searchCode || error) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetScanner}
                  data-testid="button-reset"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nuova Scansione
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risultato Verifica</CardTitle>
              <CardDescription>
                {searchCode ? `Ricerca per codice: ${searchCode}` : "Inserisci un codice per iniziare la verifica"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Verifica in corso...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold text-destructive mb-2">
                    Badge Non Trovato
                  </h3>
                  <p className="text-muted-foreground">
                    Il codice "{searchCode}" non corrisponde a nessun badge valido
                  </p>
                </div>
              )}

              {!searchCode && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ScanLine className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    Nessuna Ricerca Attiva
                  </h3>
                  <p className="text-muted-foreground">
                    Inserisci un codice badge nel campo a sinistra per verificarlo
                  </p>
                </div>
              )}

              {badgeData && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${isRevoked ? "border-destructive bg-destructive/5" : isValid ? "border-green-500 bg-green-500/5" : ""}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {badgeData.request.landing.logoUrl ? (
                          <img 
                            src={badgeData.request.landing.logoUrl} 
                            alt={badgeData.request.landing.schoolName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: badgeData.request.landing.primaryColor + '20' }}
                          >
                            <School className="w-6 h-6" style={{ color: badgeData.request.landing.primaryColor }} />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{badgeData.request.landing.schoolName}</p>
                          <p className="text-sm text-muted-foreground font-mono">{badgeData.uniqueCode}</p>
                        </div>
                      </div>
                      {getStatusBadge()}
                    </div>

                    {isValid && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Shield className="w-5 h-5" />
                          <span className="font-semibold">Badge Verificato</span>
                        </div>
                      </div>
                    )}

                    {isRevoked && badgeData.revokedReason && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2 text-destructive">
                          <AlertTriangle className="w-5 h-5 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Badge Revocato</span>
                            <span className="text-sm">{badgeData.revokedReason}</span>
                            {badgeData.revokedAt && (
                              <span className="text-sm block mt-1">
                                Revocato il: {format(new Date(badgeData.revokedAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campo</TableHead>
                        <TableHead>Valore</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow data-testid="row-holder-name">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            Titolare
                          </div>
                        </TableCell>
                        <TableCell data-testid="text-holder-name">
                          {badgeData.request.firstName} {badgeData.request.lastName}
                        </TableCell>
                      </TableRow>
                      <TableRow data-testid="row-holder-email">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            Email
                          </div>
                        </TableCell>
                        <TableCell data-testid="text-holder-email">
                          {badgeData.request.email}
                        </TableCell>
                      </TableRow>
                      {badgeData.request.phone && (
                        <TableRow data-testid="row-holder-phone">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              Telefono
                            </div>
                          </TableCell>
                          <TableCell data-testid="text-holder-phone">
                            {badgeData.request.phone}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow data-testid="row-created-date">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            Data Creazione
                          </div>
                        </TableCell>
                        <TableCell data-testid="text-created-date">
                          {format(new Date(badgeData.createdAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsDetailDialogOpen(true)}
                      data-testid="button-view-details"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizza Dettagli Completi
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <School className="w-5 h-5" />
                Dettagli Badge
              </DialogTitle>
              <DialogDescription>
                Informazioni complete del badge verificato
              </DialogDescription>
            </DialogHeader>
            {badgeData && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  {badgeData.request.landing.logoUrl ? (
                    <img 
                      src={badgeData.request.landing.logoUrl} 
                      alt={badgeData.request.landing.schoolName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: badgeData.request.landing.primaryColor + '20' }}
                    >
                      <School className="w-8 h-8" style={{ color: badgeData.request.landing.primaryColor }} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{badgeData.request.landing.schoolName}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{badgeData.uniqueCode}</p>
                  </div>
                  {getStatusBadge()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Titolare</p>
                    <p className="font-medium">{badgeData.request.firstName} {badgeData.request.lastName}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{badgeData.request.email}</p>
                  </div>
                  {badgeData.request.phone && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p className="font-medium">{badgeData.request.phone}</p>
                    </div>
                  )}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Data Creazione</p>
                    <p className="font-medium">{format(new Date(badgeData.createdAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}</p>
                  </div>
                </div>

                {isRevoked && badgeData.revokedReason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Badge Revocato</span>
                        <span className="text-sm">{badgeData.revokedReason}</span>
                        {badgeData.revokedAt && (
                          <span className="text-sm block mt-1">
                            Revocato il: {format(new Date(badgeData.revokedAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {badgeData.badgeImageUrl && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Immagine Badge</p>
                    <img 
                      src={badgeData.badgeImageUrl} 
                      alt="Badge"
                      className="max-w-full mx-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="container mx-auto p-6 max-w-2xl pb-24 md:pb-6">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <ScanLine className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Scanner Badge
        </h1>
        <p className="text-muted-foreground mt-2">
          Scansiona o inserisci il codice per verificare un badge
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Verifica Badge
          </CardTitle>
          <CardDescription>
            Usa il lettore QR o inserisci manualmente il codice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Inserisci codice badge o URL..."
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              className="text-lg font-mono"
              data-testid="input-badge-code"
            />
            <Button
              onClick={handleScan}
              disabled={isLoading}
              size="lg"
              data-testid="button-scan"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ScanLine className="w-5 h-5" />
              )}
            </Button>
          </div>

          {(searchCode || error) && (
            <Button
              variant="outline"
              className="w-full"
              onClick={resetScanner}
              data-testid="button-reset"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nuova Scansione
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verifica in corso...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-destructive mb-2">
                Badge Non Trovato
              </h3>
              <p className="text-muted-foreground">
                Il codice "{searchCode}" non corrisponde a nessun badge valido
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {badgeData && (
        <Card className={isRevoked ? "border-destructive" : isValid ? "border-green-500" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {badgeData.request.landing.logoUrl ? (
                  <img 
                    src={badgeData.request.landing.logoUrl} 
                    alt={badgeData.request.landing.schoolName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badgeData.request.landing.primaryColor + '20' }}
                  >
                    <School className="w-6 h-6" style={{ color: badgeData.request.landing.primaryColor }} />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{badgeData.request.landing.schoolName}</CardTitle>
                  <CardDescription>Codice: {badgeData.uniqueCode}</CardDescription>
                </div>
              </div>
              
              {getStatusBadge()}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isValid && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Badge Verificato</span>
                </div>
              </div>
            )}

            {isRevoked && badgeData.revokedReason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Badge Revocato</span>
                    <span className="text-sm">{badgeData.revokedReason}</span>
                    {badgeData.revokedAt && (
                      <span className="text-sm block mt-1">
                        Revocato il: {format(new Date(badgeData.revokedAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Titolare</p>
                  <p className="font-medium" data-testid="text-holder-name">
                    {badgeData.request.firstName} {badgeData.request.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium" data-testid="text-holder-email">
                    {badgeData.request.email}
                  </p>
                </div>
              </div>

              {badgeData.request.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium" data-testid="text-holder-phone">
                      {badgeData.request.phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data Creazione</p>
                  <p className="font-medium" data-testid="text-created-date">
                    {format(new Date(badgeData.createdAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
