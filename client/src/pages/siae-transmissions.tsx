import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type SiaeTransmission, type Company } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Send,
  FileText,
  Euro,
  Ticket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  Upload,
  ChevronRight,
  ArrowLeft,
  Filter,
  X,
  Mail,
  Zap,
  TestTube,
  Plus,
  Building2,
} from "lucide-react";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function SiaeTransmissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedTransmission, setSelectedTransmission] = useState<SiaeTransmission | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isTestEmailSheetOpen, setIsTestEmailSheetOpen] = useState(false);
  const [isSendDailySheetOpen, setIsSendDailySheetOpen] = useState(false);
  const [isConfirmReceiptSheetOpen, setIsConfirmReceiptSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSendDailyDialogOpen, setIsSendDailyDialogOpen] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [isConfirmReceiptDialogOpen, setIsConfirmReceiptDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [transmissionType, setTransmissionType] = useState<string>("daily");
  const [periodDate, setPeriodDate] = useState<string>("");
  const [testEmail, setTestEmail] = useState<string>("servertest2@batest.siae.it");
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyEmail, setDailyEmail] = useState<string>("servertest2@batest.siae.it");
  const [receiptProtocol, setReceiptProtocol] = useState<string>("");
  const [receiptContent, setReceiptContent] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const companyId = isSuperAdmin ? selectedCompanyId : user?.companyId;

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  const { data: transmissions, isLoading } = useQuery<SiaeTransmission[]>({
    queryKey: ['/api/siae/companies', companyId, 'transmissions'],
    enabled: !!companyId,
  });

  const createTransmissionMutation = useMutation({
    mutationFn: async (data: { transmissionType: string; periodDate: string }) => {
      const response = await apiRequest("POST", `/api/siae/transmissions`, {
        ...data,
        companyId,
        periodDate: new Date(data.periodDate).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      setIsCreateSheetOpen(false);
      setPeriodDate("");
      triggerHaptic('success');
      toast({
        title: "Trasmissione Creata",
        description: "Il file XML è stato generato. Procedi con l'invio.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryTransmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/siae/transmissions/${id}`, {
        status: "pending",
        retryCount: (selectedTransmission?.retryCount || 0) + 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      triggerHaptic('success');
      toast({
        title: "Riprova Invio",
        description: "La trasmissione è stata rimessa in coda.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, toEmail }: { id: string; toEmail: string }) => {
      const response = await apiRequest("POST", `/api/siae/transmissions/${id}/send-email`, {
        toEmail,
        companyId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      setIsDetailSheetOpen(false);
      triggerHaptic('success');
      toast({
        title: "Email Inviata",
        description: "La trasmissione XML è stata inviata via email.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (toEmail: string) => {
      const response = await apiRequest("POST", `/api/siae/transmissions/test-email`, {
        toEmail,
        companyId,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsTestEmailSheetOpen(false);
      triggerHaptic('success');
      toast({
        title: "Test Inviato",
        description: "L'email di test è stata inviata con successo.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendDailyMutation = useMutation({
    mutationFn: async ({ date, toEmail }: { date: string; toEmail: string }) => {
      const response = await apiRequest("POST", `/api/siae/companies/${companyId}/transmissions/send-daily`, {
        date,
        toEmail,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      setIsSendDailySheetOpen(false);
      triggerHaptic('success');
      toast({
        title: "Trasmissione Inviata",
        description: `Trasmissione giornaliera inviata con ${data.transmission?.ticketsCount || 0} biglietti.`,
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async ({ id, receiptProtocol, receiptContent }: { id: string; receiptProtocol: string; receiptContent?: string }) => {
      const response = await apiRequest("POST", `/api/siae/transmissions/${id}/confirm-receipt`, {
        receiptProtocol,
        receiptContent,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      setIsConfirmReceiptSheetOpen(false);
      setIsDetailSheetOpen(false);
      setReceiptProtocol("");
      setReceiptContent("");
      triggerHaptic('success');
      toast({
        title: "Conferma Registrata",
        description: "La conferma di ricezione SIAE è stata registrata.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkResponsesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/siae/transmissions/check-responses`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      triggerHaptic('success');
      toast({
        title: "Controllo Completato",
        description: `Trovate ${data.totalEmails} email SIAE, aggiornate ${data.updatedTransmissions} trasmissioni.`,
      });
    },
    onError: (error: Error & { code?: string }) => {
      triggerHaptic('error');
      const isPermissionError = error.message?.includes('permessi') || error.message?.includes('GMAIL_PERMISSION');
      toast({
        title: isPermissionError ? "Lettura Email Non Disponibile" : "Errore",
        description: isPermissionError 
          ? "L'integrazione Gmail attuale non supporta la lettura delle email. Usa la conferma manuale del protocollo SIAE."
          : error.message,
        variant: isPermissionError ? "default" : "destructive",
      });
    },
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "sent":
        return { 
          badge: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Inviata</Badge>,
          icon: Send,
          color: "text-blue-400",
          bgColor: "bg-blue-500/10"
        };
      case "received":
        return { 
          badge: <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ricevuta</Badge>,
          icon: CheckCircle2,
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10"
        };
      case "pending":
        return { 
          badge: <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Attesa</Badge>,
          icon: Clock,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10"
        };
      case "error":
        return { 
          badge: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Errore</Badge>,
          icon: AlertTriangle,
          color: "text-red-400",
          bgColor: "bg-red-500/10"
        };
      default:
        return { 
          badge: <Badge variant="secondary">{status}</Badge>,
          icon: FileText,
          color: "text-muted-foreground",
          bgColor: "bg-muted/10"
        };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "daily": return "Giornaliera";
      case "monthly": return "Mensile";
      case "corrective": return "Correttiva";
      default: return type;
    }
  };

  const filteredTransmissions = transmissions?.filter((trans) => {
    const matchesStatus = statusFilter === "all" || trans.status === statusFilter;
    const matchesType = typeFilter === "all" || trans.transmissionType === typeFilter;
    return matchesStatus && matchesType;
  });

  const stats = {
    total: transmissions?.length || 0,
    pending: transmissions?.filter(t => t.status === "pending").length || 0,
    sent: transmissions?.filter(t => t.status === "sent").length || 0,
    received: transmissions?.filter(t => t.status === "received").length || 0,
    error: transmissions?.filter(t => t.status === "error").length || 0,
    totalTickets: transmissions?.reduce((sum, t) => sum + (t.ticketsCount || 0), 0) || 0,
  };

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-transmissions">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Trasmissioni SIAE</h1>
            <p className="text-muted-foreground">Gestione trasmissioni XML verso SIAE</p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <div className="flex items-center gap-2 mr-4">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  <Building2 className="h-4 w-4 inline-block mr-1" />
                  Azienda:
                </Label>
                <Select
                  value={selectedCompanyId || ""}
                  onValueChange={(value) => setSelectedCompanyId(value)}
                >
                  <SelectTrigger className="w-[250px]" data-testid="select-company">
                    <SelectValue placeholder="Seleziona azienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={() => checkResponsesMutation.mutate()} 
              data-testid="button-check-responses" 
              disabled={checkResponsesMutation.isPending}
            >
              {checkResponsesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Controlla Risposte
            </Button>
            <Button variant="outline" onClick={() => setIsTestEmailDialogOpen(true)} data-testid="button-test-email" disabled={!companyId}>
              <TestTube className="w-4 h-4 mr-2" />
              Test Email
            </Button>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create" disabled={!companyId}>
              <Upload className="w-4 h-4 mr-2" />
              Genera XML
            </Button>
            <Button onClick={() => setIsSendDailyDialogOpen(true)} data-testid="button-send-daily" disabled={!companyId}>
              <Zap className="w-4 h-4 mr-2" />
              Invia Trasmissione Giornaliera
            </Button>
          </div>
        </div>

        {!companyId && isSuperAdmin && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Seleziona un'azienda</h3>
              <p className="text-muted-foreground">
                Scegli un'azienda dal menu sopra per visualizzare le trasmissioni SIAE
              </p>
            </CardContent>
          </Card>
        )}

        {companyId && (
        <>
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">In Attesa</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.sent}</div>
              <p className="text-sm text-muted-foreground">Inviate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.received}</div>
              <p className="text-sm text-muted-foreground">Ricevute</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{stats.error}</div>
              <p className="text-sm text-muted-foreground">Errori</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Elenco Trasmissioni</CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="pending">In Attesa</SelectItem>
                    <SelectItem value="sent">Inviata</SelectItem>
                    <SelectItem value="received">Ricevuta</SelectItem>
                    <SelectItem value="error">Errore</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="daily">Giornaliera</SelectItem>
                    <SelectItem value="monthly">Mensile</SelectItem>
                    <SelectItem value="corrective">Correttiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredTransmissions && filteredTransmissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Biglietti</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Protocollo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransmissions.map((trans) => {
                    const statusConfig = getStatusConfig(trans.status);
                    return (
                      <TableRow key={trans.id} data-testid={`row-transmission-${trans.id}`}>
                        <TableCell>
                          {trans.periodDate && format(new Date(trans.periodDate), "dd/MM/yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>{getTypeLabel(trans.transmissionType)}</TableCell>
                        <TableCell>{trans.ticketsCount}</TableCell>
                        <TableCell>€{Number(trans.totalAmount || 0).toFixed(2)}</TableCell>
                        <TableCell>{statusConfig.badge}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {trans.receiptProtocol || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransmission(trans);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {trans.fileContent && (
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {trans.status === "pending" && trans.fileContent && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  sendEmailMutation.mutate({
                                    id: trans.id,
                                    toEmail: "servertest2@batest.siae.it",
                                  });
                                }}
                                disabled={sendEmailMutation.isPending}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Invia
                              </Button>
                            )}
                            {trans.status === "sent" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTransmission(trans);
                                  setIsConfirmReceiptDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Conferma
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna trasmissione trovata</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Genera Trasmissione XML</DialogTitle>
              <DialogDescription>Crea un nuovo file XML per la trasmissione SIAE</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Tipo Trasmissione</Label>
                <Select value={transmissionType} onValueChange={setTransmissionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Giornaliera</SelectItem>
                    <SelectItem value="monthly">Mensile</SelectItem>
                    <SelectItem value="corrective">Correttiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Periodo</Label>
                <Input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annulla</Button>
              <Button
                onClick={() => {
                  createTransmissionMutation.mutate({ transmissionType, periodDate });
                  setIsCreateDialogOpen(false);
                }}
                disabled={!periodDate || createTransmissionMutation.isPending}
              >
                {createTransmissionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Genera XML
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSendDailyDialogOpen} onOpenChange={setIsSendDailyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trasmissione Giornaliera Automatica</DialogTitle>
              <DialogDescription>Genera e invia automaticamente la trasmissione XML</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
              </div>
              <div>
                <Label>Email Destinatario SIAE</Label>
                <Input type="email" value={dailyEmail} onChange={(e) => setDailyEmail(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSendDailyDialogOpen(false)}>Annulla</Button>
              <Button
                onClick={() => {
                  sendDailyMutation.mutate({ date: dailyDate, toEmail: dailyEmail });
                }}
                disabled={!dailyDate || !dailyEmail || sendDailyMutation.isPending}
              >
                {sendDailyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Genera e Invia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Invio Email</DialogTitle>
              <DialogDescription>Verifica la configurazione email SIAE</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Email Destinatario</Label>
                <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestEmailDialogOpen(false)}>Annulla</Button>
              <Button
                onClick={() => {
                  testEmailMutation.mutate(testEmail);
                  setIsTestEmailDialogOpen(false);
                }}
                disabled={!testEmail || testEmailMutation.isPending}
              >
                {testEmailMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Invia Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isConfirmReceiptDialogOpen} onOpenChange={setIsConfirmReceiptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma Ricezione SIAE</DialogTitle>
              <DialogDescription>Registra la conferma ricevuta da SIAE</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Protocollo Ricezione *</Label>
                <Input
                  value={receiptProtocol}
                  onChange={(e) => setReceiptProtocol(e.target.value)}
                  placeholder="Es: SIAE-2025-001234"
                />
              </div>
              <div>
                <Label>Contenuto Ricevuta (opzionale)</Label>
                <Input
                  value={receiptContent}
                  onChange={(e) => setReceiptContent(e.target.value)}
                  placeholder="Note o riferimenti"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsConfirmReceiptDialogOpen(false);
                setReceiptProtocol("");
                setReceiptContent("");
              }}>Annulla</Button>
              <Button
                onClick={() => {
                  if (selectedTransmission) {
                    confirmReceiptMutation.mutate({
                      id: selectedTransmission.id,
                      receiptProtocol,
                      receiptContent: receiptContent || undefined,
                    });
                    setIsConfirmReceiptDialogOpen(false);
                  }
                }}
                disabled={!receiptProtocol || confirmReceiptMutation.isPending}
              >
                {confirmReceiptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Conferma Ricezione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dettaglio Trasmissione</DialogTitle>
            </DialogHeader>
            {selectedTransmission && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{getTypeLabel(selectedTransmission.transmissionType)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data Periodo</Label>
                    <p className="font-medium">
                      {selectedTransmission.periodDate && format(new Date(selectedTransmission.periodDate), "dd/MM/yyyy", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Biglietti</Label>
                    <p className="font-medium">{selectedTransmission.ticketsCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Importo Totale</Label>
                    <p className="font-medium">€{Number(selectedTransmission.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stato</Label>
                    <div className="mt-1">{getStatusConfig(selectedTransmission.status).badge}</div>
                  </div>
                  {selectedTransmission.receiptProtocol && (
                    <div>
                      <Label className="text-muted-foreground">Protocollo SIAE</Label>
                      <p className="font-mono text-green-600">{selectedTransmission.receiptProtocol}</p>
                    </div>
                  )}
                  {selectedTransmission.sentAt && (
                    <div>
                      <Label className="text-muted-foreground">Data Invio</Label>
                      <p className="font-medium">{format(new Date(selectedTransmission.sentAt), "dd/MM/yyyy HH:mm", { locale: it })}</p>
                    </div>
                  )}
                  {selectedTransmission.receivedAt && (
                    <div>
                      <Label className="text-muted-foreground">Data Ricezione</Label>
                      <p className="font-medium">{format(new Date(selectedTransmission.receivedAt), "dd/MM/yyyy HH:mm", { locale: it })}</p>
                    </div>
                  )}
                </div>
                {selectedTransmission.errorMessage && (
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <Label className="text-red-600">Messaggio Errore</Label>
                    <p className="text-red-700 dark:text-red-400">{selectedTransmission.errorMessage}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedTransmission?.status === "sent" && (
                <Button
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsConfirmReceiptDialogOpen(true);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Conferma Ricezione
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
        )}
      </div>
    );
  }

  // Mobile version
  const header = (
    <MobileHeader
      title="Trasmissioni SIAE"
      showBackButton
      showUserMenu
      rightAction={
        <div className="relative">
          <HapticButton
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => setIsFilterSheetOpen(true)}
          >
            <Filter className="h-5 w-5" />
          </HapticButton>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FFD700] text-black text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </div>
      }
    />
  );

  return (
    <MobileAppLayout
      header={header}
      className="bg-background"
      contentClassName="pb-24"
    >
      <div className="space-y-4 py-4" data-testid="page-siae-transmissions">
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTransition}
          >
            <Card className="glass-card overflow-visible">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <Label className="text-sm text-muted-foreground">Seleziona Azienda</Label>
                </div>
                <Select
                  value={selectedCompanyId || ""}
                  onValueChange={(value) => setSelectedCompanyId(value)}
                >
                  <SelectTrigger className="w-full h-12 bg-background/50 rounded-xl" data-testid="select-company-mobile">
                    <SelectValue placeholder="Seleziona un'azienda..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!companyId && isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="glass-card border-dashed overflow-visible">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Seleziona un'azienda</h3>
                <p className="text-sm text-muted-foreground">
                  Scegli un'azienda dal menu sopra per gestire le trasmissioni
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {companyId && (
        <>
        <motion.div 
          className="grid grid-cols-3 gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
        >
          <Card className="glass-card overflow-visible">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Attesa</span>
              </div>
              <div className="text-xl font-bold text-amber-400" data-testid="stat-pending">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="glass-card overflow-visible">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Ricevute</span>
              </div>
              <div className="text-xl font-bold text-emerald-400" data-testid="stat-received">{stats.received}</div>
            </CardContent>
          </Card>
          <Card className="glass-card overflow-visible">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>Errori</span>
              </div>
              <div className="text-xl font-bold text-red-400" data-testid="stat-error">{stats.error}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.05 }}
          className="space-y-3"
        >
          <HapticButton
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black"
            onClick={() => setIsSendDailySheetOpen(true)}
            hapticType="medium"
            data-testid="button-send-daily"
          >
            <Zap className="w-5 h-5 mr-2" />
            Invia Trasmissione Giornaliera
          </HapticButton>
          
          <div className="grid grid-cols-2 gap-3">
            <HapticButton
              variant="outline"
              className="h-12"
              onClick={() => setIsCreateSheetOpen(true)}
              hapticType="light"
              data-testid="button-create"
            >
              <Upload className="w-4 h-4 mr-2" />
              Genera XML
            </HapticButton>
            <HapticButton
              variant="outline"
              className="h-12"
              onClick={() => setIsTestEmailSheetOpen(true)}
              hapticType="light"
              data-testid="button-test-email"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Test Email
            </HapticButton>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="glass-card overflow-visible">
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : filteredTransmissions?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="glass-card overflow-visible" data-testid="card-empty-state">
              <CardContent className="p-8 text-center">
                <motion.div 
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                >
                  <Send className="w-10 h-10 text-muted-foreground" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Nessuna Trasmissione</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Non ci sono trasmissioni XML registrate
                </p>
                <HapticButton 
                  className="h-12 px-6"
                  onClick={() => setIsCreateSheetOpen(true)}
                  hapticType="medium"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Genera Prima Trasmissione
                </HapticButton>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTransmissions?.map((transmission, index) => {
                const statusConfig = getStatusConfig(transmission.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <motion.div
                    key={transmission.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ ...springTransition, delay: index * 0.03 }}
                    data-testid={`card-transmission-${transmission.id}`}
                  >
                    <Card 
                      className="glass-card overflow-visible hover-elevate active:scale-[0.98] transition-transform"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedTransmission(transmission);
                        setIsDetailSheetOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.bgColor} shrink-0`}>
                            <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base truncate flex items-center gap-2">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  {transmission.fileName || `${transmission.id.slice(0, 8)}${transmission.fileExtension}`}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {getTypeLabel(transmission.transmissionType)} • {transmission.periodDate && format(new Date(transmission.periodDate), "dd MMM yyyy", { locale: it })}
                                </p>
                              </div>
                              {statusConfig.badge}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Ticket className="w-4 h-4" />
                                  {transmission.ticketsCount}
                                </span>
                                <span className="flex items-center gap-1.5 text-[#FFD700] font-medium">
                                  <Euro className="w-4 h-4" />
                                  {Number(transmission.totalAmount || 0).toFixed(2)}
                                </span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        </>
        )}
      </div>

      <BottomSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        title="Genera Trasmissione"
      >
        <div className="p-4 space-y-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-[#FFD700]" />
            </div>
            <p className="text-muted-foreground text-sm">
              Crea un nuovo file XML da inviare a SIAE
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo Trasmissione</Label>
              <Select value={transmissionType} onValueChange={setTransmissionType}>
                <SelectTrigger className="h-12" data-testid="select-transmission-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Giornaliera</SelectItem>
                  <SelectItem value="monthly">Mensile</SelectItem>
                  <SelectItem value="corrective">Correttiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Data Periodo</Label>
              <Input
                type="date"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
                className="h-12"
                data-testid="input-period-date"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setIsCreateSheetOpen(false)}
            >
              Annulla
            </HapticButton>
            <HapticButton
              className="flex-1 h-12 bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
              onClick={() => {
                createTransmissionMutation.mutate({
                  transmissionType,
                  periodDate,
                });
              }}
              disabled={!periodDate || createTransmissionMutation.isPending}
              hapticType="medium"
              data-testid="button-generate"
            >
              {createTransmissionMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Genera XML
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filtra Trasmissioni"
      >
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Stato</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12" data-testid="select-status-filter">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="sent">Inviate</SelectItem>
                  <SelectItem value="received">Ricevute</SelectItem>
                  <SelectItem value="error">Errori</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12" data-testid="select-type-filter">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="daily">Giornaliera</SelectItem>
                  <SelectItem value="monthly">Mensile</SelectItem>
                  <SelectItem value="corrective">Correttiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              className="flex-1 h-12"
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </HapticButton>
            <HapticButton
              className="flex-1 h-12"
              onClick={() => setIsFilterSheetOpen(false)}
              hapticType="light"
            >
              Applica Filtri
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isDetailSheetOpen}
        onClose={() => setIsDetailSheetOpen(false)}
        title="Dettaglio Trasmissione"
      >
        {selectedTransmission && (
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-4">
              {(() => {
                const statusConfig = getStatusConfig(selectedTransmission.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${statusConfig.bgColor}`}>
                      <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{getTypeLabel(selectedTransmission.transmissionType)}</h3>
                      <p className="text-muted-foreground text-sm">
                        {selectedTransmission.periodDate && format(new Date(selectedTransmission.periodDate), "dd MMMM yyyy", { locale: it })}
                      </p>
                    </div>
                    {statusConfig.badge}
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="glass-card overflow-visible">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Ticket className="w-3 h-3" />
                    <span>Biglietti</span>
                  </div>
                  <div className="text-2xl font-bold">{selectedTransmission.ticketsCount}</div>
                </CardContent>
              </Card>
              <Card className="glass-card overflow-visible">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Euro className="w-3 h-3" />
                    <span>Importo</span>
                  </div>
                  <div className="text-2xl font-bold text-[#FFD700]">€{Number(selectedTransmission.totalAmount || 0).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {selectedTransmission.fileName && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">File</span>
                  <span className="font-mono text-sm">{selectedTransmission.fileName}</span>
                </div>
              )}
              {selectedTransmission.sentAt && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Data Invio</span>
                  <span className="text-sm">
                    {format(new Date(selectedTransmission.sentAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
              )}
              {selectedTransmission.sentToPec && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">PEC Destinatario</span>
                  <span className="text-sm truncate max-w-[180px]">{selectedTransmission.sentToPec}</span>
                </div>
              )}
              {selectedTransmission.receivedAt && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Data Ricezione</span>
                  <span className="text-sm">
                    {format(new Date(selectedTransmission.receivedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
              )}
              {selectedTransmission.receiptProtocol && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Protocollo SIAE</span>
                  <span className="text-sm font-mono text-green-400">{selectedTransmission.receiptProtocol}</span>
                </div>
              )}
              {selectedTransmission.retryCount > 0 && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Tentativi</span>
                  <span className="text-sm">{selectedTransmission.retryCount}</span>
                </div>
              )}
              {selectedTransmission.errorMessage && (
                <div className="py-3">
                  <span className="text-muted-foreground text-sm block mb-2">Messaggio Errore</span>
                  <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{selectedTransmission.errorMessage}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {selectedTransmission.status === "sent" && (
                <HapticButton
                  className="w-full h-12 bg-green-500 text-white hover:bg-green-500/90"
                  onClick={() => setIsConfirmReceiptSheetOpen(true)}
                  hapticType="medium"
                  data-testid={`button-confirm-receipt-${selectedTransmission.id}`}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Conferma Ricezione SIAE
                </HapticButton>
              )}
              {selectedTransmission.fileContent && selectedTransmission.status === "pending" && (
                <HapticButton
                  className="w-full h-12 bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                  onClick={() => {
                    sendEmailMutation.mutate({
                      id: selectedTransmission.id,
                      toEmail: "servertest2@batest.siae.it",
                    });
                  }}
                  disabled={sendEmailMutation.isPending}
                  hapticType="medium"
                  data-testid={`button-send-email-${selectedTransmission.id}`}
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5 mr-2" />
                  )}
                  Invia via Email
                </HapticButton>
              )}
              <div className="flex gap-3">
                {selectedTransmission.fileContent && (
                  <HapticButton
                    variant="outline"
                    className="flex-1 h-12"
                    hapticType="light"
                    data-testid={`button-download-${selectedTransmission.id}`}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Scarica XML
                  </HapticButton>
                )}
                {selectedTransmission.status === "error" && (
                  <HapticButton
                    className="flex-1 h-12"
                    onClick={() => {
                      retryTransmissionMutation.mutate(selectedTransmission.id);
                    }}
                    disabled={retryTransmissionMutation.isPending}
                    hapticType="medium"
                    data-testid={`button-retry-${selectedTransmission.id}`}
                  >
                    {retryTransmissionMutation.isPending ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5 mr-2" />
                    )}
                    Riprova Invio
                  </HapticButton>
                )}
                {!selectedTransmission.fileContent && selectedTransmission.status !== "error" && (
                  <HapticButton
                    className="flex-1 h-12"
                    onClick={() => setIsDetailSheetOpen(false)}
                    hapticType="light"
                  >
                    Chiudi
                  </HapticButton>
                )}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isTestEmailSheetOpen}
        onClose={() => setIsTestEmailSheetOpen(false)}
        title="Test Invio Email"
      >
        <div className="p-4 space-y-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <TestTube className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-muted-foreground text-sm">
              Invia un'email di test per verificare la configurazione
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Email Destinatario</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="h-12"
              placeholder="servertest2@batest.siae.it"
              data-testid="input-test-email"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setIsTestEmailSheetOpen(false)}
            >
              Annulla
            </HapticButton>
            <HapticButton
              className="flex-1 h-12 bg-cyan-500 text-white hover:bg-cyan-500/90"
              onClick={() => testEmailMutation.mutate(testEmail)}
              disabled={!testEmail || testEmailMutation.isPending}
              hapticType="medium"
              data-testid="button-send-test"
            >
              {testEmailMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Invia Test
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isSendDailySheetOpen}
        onClose={() => setIsSendDailySheetOpen(false)}
        title="Trasmissione Giornaliera Automatica"
      >
        <div className="p-4 space-y-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-[#FFD700]" />
            </div>
            <p className="text-muted-foreground text-sm">
              Genera e invia automaticamente la trasmissione XML del giorno selezionato
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Data</Label>
              <Input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="h-12"
                data-testid="input-daily-date"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Email Destinatario SIAE</Label>
              <Input
                type="email"
                value={dailyEmail}
                onChange={(e) => setDailyEmail(e.target.value)}
                className="h-12"
                placeholder="servertest2@batest.siae.it"
                data-testid="input-daily-email"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setIsSendDailySheetOpen(false)}
            >
              Annulla
            </HapticButton>
            <HapticButton
              className="flex-1 h-12 bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
              onClick={() => sendDailyMutation.mutate({ date: dailyDate, toEmail: dailyEmail })}
              disabled={!dailyDate || !dailyEmail || sendDailyMutation.isPending}
              hapticType="medium"
              data-testid="button-send-daily-confirm"
            >
              {sendDailyMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Genera e Invia
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isConfirmReceiptSheetOpen}
        onClose={() => {
          setIsConfirmReceiptSheetOpen(false);
          setReceiptProtocol("");
          setReceiptContent("");
        }}
        title="Conferma Ricezione SIAE"
      >
        <div className="p-4 space-y-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-muted-foreground text-sm">
              Registra la conferma di ricezione ricevuta da SIAE
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Protocollo Ricezione *</Label>
              <Input
                type="text"
                value={receiptProtocol}
                onChange={(e) => setReceiptProtocol(e.target.value)}
                className="h-12"
                placeholder="Es: SIAE-2025-001234"
                data-testid="input-receipt-protocol"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Inserisci il numero di protocollo presente nell'email di conferma SIAE
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Contenuto Ricevuta (opzionale)</Label>
              <Input
                type="text"
                value={receiptContent}
                onChange={(e) => setReceiptContent(e.target.value)}
                className="h-12"
                placeholder="Note o riferimenti aggiuntivi"
                data-testid="input-receipt-content"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              className="flex-1 h-12"
              onClick={() => {
                setIsConfirmReceiptSheetOpen(false);
                setReceiptProtocol("");
                setReceiptContent("");
              }}
            >
              Annulla
            </HapticButton>
            <HapticButton
              className="flex-1 h-12 bg-green-500 text-white hover:bg-green-500/90"
              onClick={() => {
                if (selectedTransmission) {
                  confirmReceiptMutation.mutate({
                    id: selectedTransmission.id,
                    receiptProtocol,
                    receiptContent: receiptContent || undefined,
                  });
                }
              }}
              disabled={!receiptProtocol || confirmReceiptMutation.isPending}
              hapticType="medium"
              data-testid="button-confirm-receipt-submit"
            >
              {confirmReceiptMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Conferma Ricezione
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
