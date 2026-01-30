import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  FileCheck,
  FileX,
  Eye,
  RefreshCw,
  Loader2,
  Check,
  X,
  Clock,
  AlertCircle,
  Scan,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { format } from "date-fns";

interface IdentityDocument {
  id: string;
  identityId: string;
  documentType: string;
  documentNumber: string | null;
  frontImageUrl: string;
  backImageUrl: string | null;
  selfieImageUrl: string | null;
  issuingCountry: string;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  ocrEnabled: boolean;
  ocrStatus: string | null;
  ocrExtractedData: string | null;
  ocrConfidenceScore: string | null;
  verificationStatus: string;
  verificationMethod: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  uploadedFromPlatform: string | null;
  createdAt: string;
  identity?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    fiscalCode: string | null;
  };
}

interface Stats {
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  ocrPending: number;
}

interface Settings {
  id: string;
  verificationMode: string;
  ocrEnabled: boolean;
  ocrProvider: string;
  ocrAutoApproveThreshold: string;
  requireDocument: boolean;
  requireSelfie: boolean;
  acceptedDocumentTypes: string;
  blockOnExpiredDocument: boolean;
  expiryWarningDays: number;
  verificationDeadlineDays: number;
  blockOnVerificationDeadline: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  under_review: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  expired: "bg-gray-500/20 text-gray-400",
};

const ocrStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

const documentTypeLabels: Record<string, string> = {
  carta_identita: "Carta d'Identità",
  patente: "Patente",
  passaporto: "Passaporto",
  permesso_soggiorno: "Permesso di Soggiorno",
};

export default function AdminIdentityDocuments() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<IdentityDocument | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/identity-documents/stats"],
  });

  const { data: docsData, isLoading, refetch } = useQuery<{
    documents: IdentityDocument[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["/api/admin/identity-documents", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "15");
      const res = await fetch(`/api/admin/identity-documents?${params}`);
      return res.json();
    },
  });

  const { data: settings, refetch: refetchSettings } = useQuery<Settings>({
    queryKey: ["/api/admin/identity-verification-settings"],
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, action, rejectionReason, documentNumber, expiryDate }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/identity-documents/${id}/verify`, {
        action,
        rejectionReason,
        documentNumber,
        expiryDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/identity-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/identity-documents/stats"] });
      setViewDialogOpen(false);
      setRejectDialogOpen(false);
      setRejectionReason("");
      toast({ title: "Documento aggiornato" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const reprocessOcrMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/identity-documents/${id}/reprocess-ocr`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/identity-documents"] });
      toast({ title: "OCR avviato" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const res = await apiRequest("PATCH", "/api/admin/identity-verification-settings", data);
      return res.json();
    },
    onSuccess: () => {
      refetchSettings();
      toast({ title: "Impostazioni salvate" });
    },
  });

  const verifySelfiemutatation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/identity-documents/${id}/verify-selfie`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/identity-documents"] });
      if (data.result?.match) {
        toast({ 
          title: "Verifica selfie completata", 
          description: `Match: ${data.result.match ? "Sì" : "No"} - Confidenza: ${Math.round(data.result.confidence * 100)}%` 
        });
      } else {
        toast({ 
          title: "Verifica selfie completata", 
          description: `Nessuna corrispondenza trovata`, 
          variant: "destructive" 
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Errore verifica selfie", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = (doc: IdentityDocument) => {
    verifyMutation.mutate({ id: doc.id, action: "approve" });
  };

  const handleReject = () => {
    if (!selectedDoc || !rejectionReason.trim()) return;
    verifyMutation.mutate({ id: selectedDoc.id, action: "reject", rejectionReason });
  };

  const handleMarkUnderReview = (doc: IdentityDocument) => {
    verifyMutation.mutate({ id: doc.id, action: "mark_under_review" });
  };

  const openRejectDialog = (doc: IdentityDocument) => {
    setSelectedDoc(doc);
    setRejectDialogOpen(true);
  };

  const openViewDialog = async (doc: IdentityDocument) => {
    const res = await fetch(`/api/admin/identity-documents/${doc.id}`);
    const fullDoc = await res.json();
    setSelectedDoc(fullDoc);
    setViewDialogOpen(true);
  };

  const getOcrData = (doc: IdentityDocument) => {
    if (!doc.ocrExtractedData) return null;
    try {
      return JSON.parse(doc.ocrExtractedData);
    } catch {
      return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Verifica Documenti</h1>
          <p className="text-muted-foreground">Gestione documenti d'identità con verifica manuale e OCR</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("pending")} data-testid="stat-pending">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            </div>
            <p className="text-sm text-muted-foreground">In attesa</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("under_review")} data-testid="stat-under-review">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" />
              <div className="text-2xl font-bold">{stats?.underReview || 0}</div>
            </div>
            <p className="text-sm text-muted-foreground">In revisione</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("approved")} data-testid="stat-approved">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-400" />
              <div className="text-2xl font-bold">{stats?.approved || 0}</div>
            </div>
            <p className="text-sm text-muted-foreground">Approvati</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("rejected")} data-testid="stat-rejected">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileX className="w-5 h-5 text-red-400" />
              <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
            </div>
            <p className="text-sm text-muted-foreground">Rifiutati</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-ocr">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-purple-400" />
              <div className="text-2xl font-bold">{stats?.ocrPending || 0}</div>
            </div>
            <p className="text-sm text-muted-foreground">OCR in coda</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents" data-testid="tab-documents">Documenti</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Impostazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="under_review">In revisione</SelectItem>
                <SelectItem value="approved">Approvati</SelectItem>
                <SelectItem value="rejected">Rifiutati</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {docsData?.total || 0} documenti trovati
            </span>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Numero</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : docsData?.documents?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nessun documento trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  docsData?.documents?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium">
                          {doc.identity ? `${doc.identity.firstName} ${doc.identity.lastName}` : "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">{doc.identity?.email || doc.identity?.phone || ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{documentTypeLabels[doc.documentType] || doc.documentType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{doc.documentNumber || "-"}</TableCell>
                      <TableCell>
                        {doc.ocrEnabled ? (
                          <Badge className={ocrStatusColors[doc.ocrStatus || "pending"]}>
                            {doc.ocrStatus === "completed" && doc.ocrConfidenceScore
                              ? `${Math.round(parseFloat(doc.ocrConfidenceScore) * 100)}%`
                              : doc.ocrStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[doc.verificationStatus]}>
                          {doc.verificationStatus === "pending" && "In attesa"}
                          {doc.verificationStatus === "under_review" && "In revisione"}
                          {doc.verificationStatus === "approved" && "Approvato"}
                          {doc.verificationStatus === "rejected" && "Rifiutato"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.createdAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openViewDialog(doc)} data-testid={`btn-view-${doc.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {doc.verificationStatus === "pending" && (
                            <>
                              <Button size="icon" variant="ghost" className="text-green-500" onClick={() => handleApprove(doc)} data-testid={`btn-approve-${doc.id}`}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-500" onClick={() => openRejectDialog(doc)} data-testid={`btn-reject-${doc.id}`}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {!doc.ocrEnabled && (
                            <Button size="icon" variant="ghost" onClick={() => reprocessOcrMutation.mutate(doc.id)} data-testid={`btn-ocr-${doc.id}`}>
                              <Scan className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {docsData && docsData.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                data-testid="btn-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="py-2 px-3 text-sm">
                Pagina {page} di {docsData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === docsData.totalPages}
                onClick={() => setPage(p => p + 1)}
                data-testid="btn-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Impostazioni Verifica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Abilita OCR automatico</Label>
                    <p className="text-sm text-muted-foreground">Estrai automaticamente i dati dai documenti con AI</p>
                  </div>
                  <Switch
                    checked={settings?.ocrEnabled || false}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ ocrEnabled: checked })}
                    data-testid="switch-ocr"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Richiedi documento per registrazione</Label>
                    <p className="text-sm text-muted-foreground">Gli utenti devono caricare un documento per completare la registrazione</p>
                  </div>
                  <Switch
                    checked={settings?.requireDocument || false}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ requireDocument: checked })}
                    data-testid="switch-require-doc"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Richiedi selfie con documento</Label>
                    <p className="text-sm text-muted-foreground">L'utente deve scattare un selfie tenendo il documento</p>
                  </div>
                  <Switch
                    checked={settings?.requireSelfie || false}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ requireSelfie: checked })}
                    data-testid="switch-require-selfie"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Blocca documenti scaduti</Label>
                    <p className="text-sm text-muted-foreground">Richiedi nuovo documento se scaduto</p>
                  </div>
                  <Switch
                    checked={settings?.blockOnExpiredDocument || false}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ blockOnExpiredDocument: checked })}
                    data-testid="switch-block-expired"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modalità verifica</Label>
                <Select
                  value={settings?.verificationMode || "manual_only"}
                  onValueChange={(v) => updateSettingsMutation.mutate({ verificationMode: v })}
                >
                  <SelectTrigger data-testid="select-verification-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_only">Solo manuale (Opzione A)</SelectItem>
                    <SelectItem value="ocr_with_manual_review">OCR + Revisione manuale (Opzione A+B)</SelectItem>
                    <SelectItem value="ocr_auto_approve">OCR con approvazione automatica (Opzione B)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {settings?.verificationMode === "manual_only" && "Ogni documento richiede approvazione manuale da un admin"}
                  {settings?.verificationMode === "ocr_with_manual_review" && "OCR estrae i dati, ma un admin deve approvare"}
                  {settings?.verificationMode === "ocr_auto_approve" && "Documenti con alta confidenza OCR vengono approvati automaticamente"}
                </p>
              </div>

              {settings?.ocrEnabled && settings?.verificationMode === "ocr_auto_approve" && (
                <div className="space-y-2">
                  <Label>Soglia approvazione automatica OCR</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={settings?.ocrAutoApproveThreshold || "0.95"}
                    onChange={(e) => updateSettingsMutation.mutate({ ocrAutoApproveThreshold: e.target.value })}
                    data-testid="input-ocr-threshold"
                  />
                  <p className="text-sm text-muted-foreground">
                    Documenti con confidenza superiore a questa soglia vengono approvati automaticamente (0-1)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Scadenza Verifica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Blocca profilo dopo scadenza</p>
                  <p className="text-sm text-muted-foreground">
                    Blocca automaticamente l'account se la verifica non viene completata entro la scadenza
                  </p>
                </div>
                <Switch
                  checked={settings?.blockOnVerificationDeadline ?? true}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ blockOnVerificationDeadline: checked })}
                  data-testid="switch-block-on-deadline"
                />
              </div>

              <div className="space-y-2">
                <Label>Giorni per completare la verifica</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={settings?.verificationDeadlineDays ?? 15}
                  onChange={(e) => updateSettingsMutation.mutate({ verificationDeadlineDays: parseInt(e.target.value) })}
                  data-testid="input-verification-deadline-days"
                />
                <p className="text-sm text-muted-foreground">
                  Numero di giorni dalla registrazione entro cui l'utente deve completare la verifica (default: 15 giorni)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettaglio Documento</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <User className="w-10 h-10 text-muted-foreground" />
                <div>
                  <div className="font-medium text-lg">
                    {selectedDoc.identity?.firstName} {selectedDoc.identity?.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedDoc.identity?.email} • {selectedDoc.identity?.phone}
                  </div>
                  {selectedDoc.identity?.fiscalCode && (
                    <div className="text-sm font-mono">{selectedDoc.identity.fiscalCode}</div>
                  )}
                </div>
                <Badge className={statusColors[selectedDoc.verificationStatus]} variant="secondary">
                  {selectedDoc.verificationStatus}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Fronte documento</h4>
                  <img
                    src={selectedDoc.frontImageUrl}
                    alt="Fronte"
                    className="w-full rounded-lg border"
                    data-testid="img-front"
                  />
                </div>
                {selectedDoc.backImageUrl && (
                  <div>
                    <h4 className="font-medium mb-2">Retro documento</h4>
                    <img
                      src={selectedDoc.backImageUrl}
                      alt="Retro"
                      className="w-full rounded-lg border"
                      data-testid="img-back"
                    />
                  </div>
                )}
              </div>

              {selectedDoc.selfieImageUrl && (
                <div>
                  <h4 className="font-medium mb-2">Selfie con documento</h4>
                  <img
                    src={selectedDoc.selfieImageUrl}
                    alt="Selfie"
                    className="w-48 rounded-lg border"
                    data-testid="img-selfie"
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Dati documento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{documentTypeLabels[selectedDoc.documentType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Numero:</span>
                      <span className="font-mono">{selectedDoc.documentNumber || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scadenza:</span>
                      <span>{selectedDoc.expiryDate ? format(new Date(selectedDoc.expiryDate), "dd/MM/yyyy") : "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ente rilascio:</span>
                      <span>{selectedDoc.issuingAuthority || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Caricato da:</span>
                      <span>{selectedDoc.uploadedFromPlatform || "-"}</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedDoc.ocrEnabled && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Scan className="w-4 h-4" />
                        Risultati OCR
                        <Badge className={ocrStatusColors[selectedDoc.ocrStatus || "pending"]} variant="secondary">
                          {selectedDoc.ocrStatus}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {selectedDoc.ocrConfidenceScore && (
                        <div className="mb-2">
                          <span className="text-muted-foreground">Confidenza: </span>
                          <span className="font-medium">{Math.round(parseFloat(selectedDoc.ocrConfidenceScore) * 100)}%</span>
                        </div>
                      )}
                      {getOcrData(selectedDoc) && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(getOcrData(selectedDoc), null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {selectedDoc.rejectionReason && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Motivo rifiuto</span>
                  </div>
                  <p className="text-sm">{selectedDoc.rejectionReason}</p>
                </div>
              )}

              {selectedDoc.verificationStatus === "pending" || selectedDoc.verificationStatus === "under_review" ? (
                <DialogFooter className="gap-2">
                  {selectedDoc.selfieImageUrl && (
                    <Button
                      variant="outline"
                      onClick={() => verifySelfiemutatation.mutate(selectedDoc.id)}
                      disabled={verifySelfiemutatation.isPending}
                      data-testid="btn-dialog-verify-selfie"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {verifySelfiemutatation.isPending ? "Verifica in corso..." : "Verifica Selfie AI"}
                    </Button>
                  )}
                  {!selectedDoc.ocrEnabled && (
                    <Button
                      variant="outline"
                      onClick={() => reprocessOcrMutation.mutate(selectedDoc.id)}
                      disabled={reprocessOcrMutation.isPending}
                      data-testid="btn-dialog-ocr"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      Avvia OCR
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => { setViewDialogOpen(false); openRejectDialog(selectedDoc); }}
                    data-testid="btn-dialog-reject"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rifiuta
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedDoc)}
                    disabled={verifyMutation.isPending}
                    data-testid="btn-dialog-approve"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approva
                  </Button>
                </DialogFooter>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inserisci il motivo del rifiuto. L'utente riceverà una notifica.
            </p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Es: Documento illeggibile, foto sfocata, documento scaduto..."
              rows={3}
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || verifyMutation.isPending}
              data-testid="btn-confirm-reject"
            >
              Conferma Rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
