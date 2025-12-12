import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  Monitor,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Wifi,
  WifiOff,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Download,
  Key,
  Copy,
  Check,
  Layout,
  Eye,
} from "lucide-react";
import { Link } from "wouter";
import type { TicketTemplate } from "@shared/schema";
import type { 
  PrinterModel, 
  PrinterAgent, 
  PrinterProfile,
  InsertPrinterModel,
  InsertPrinterProfile,
} from "@shared/schema";
import {
  insertPrinterModelSchema,
  insertPrinterProfileSchema,
} from "@shared/schema";

const printerModelFormSchema = insertPrinterModelSchema.extend({
  dpi: z.coerce.number().min(100).max(600),
  maxWidthMm: z.coerce.number().min(40).max(200),
});

const printerProfileFormSchema = insertPrinterProfileSchema.extend({
  paperWidthMm: z.coerce.number().min(20).max(120),
  paperHeightMm: z.coerce.number().min(20).max(300),
  marginTopMm: z.coerce.number().min(0).max(20),
  marginBottomMm: z.coerce.number().min(0).max(20),
  marginLeftMm: z.coerce.number().min(0).max(20),
  marginRightMm: z.coerce.number().min(0).max(20),
});

type PrinterModelFormData = z.infer<typeof printerModelFormSchema>;
type PrinterProfileFormData = z.infer<typeof printerProfileFormSchema>;

export default function PrinterSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  
  const [activeTab, setActiveTab] = useState("agents");
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PrinterModel | null>(null);
  const [editingProfile, setEditingProfile] = useState<PrinterProfile | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Load companies for super_admin to select
  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/companies"],
    enabled: isSuperAdmin,
  });

  const { data: models = [], isLoading: modelsLoading, refetch: refetchModels } = useQuery<PrinterModel[]>({
    queryKey: ["/api/printers/models"],
    enabled: isSuperAdmin,
  });

  const { data: agents = [], isLoading: agentsLoading, refetch: refetchAgents } = useQuery<PrinterAgent[]>({
    queryKey: ["/api/printers/agents"],
  });

  const { data: profiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useQuery<PrinterProfile[]>({
    queryKey: ["/api/printers/profiles"],
  });

  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery<TicketTemplate[]>({
    queryKey: ["/api/ticket/templates"],
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ticket/templates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Template eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/ticket/templates"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il template", variant: "destructive" });
    },
  });

  const modelForm = useForm<PrinterModelFormData>({
    resolver: zodResolver(printerModelFormSchema),
    defaultValues: {
      vendor: "",
      model: "",
      dpi: 203,
      maxWidthMm: 80,
      connectionType: "usb",
      driverNotes: "",
      isActive: true,
    },
  });

  const profileForm = useForm<PrinterProfileFormData>({
    resolver: zodResolver(printerProfileFormSchema),
    defaultValues: {
      name: "",
      paperWidthMm: 80,
      paperHeightMm: 50,
      marginTopMm: 2,
      marginBottomMm: 2,
      marginLeftMm: 2,
      marginRightMm: 2,
      isDefault: false,
      isActive: true,
    },
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: PrinterModelFormData) => {
      const response = await apiRequest("POST", "/api/printers/models", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Modello creato", description: "Il modello stampante è stato aggiunto" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/models"] });
      setModelDialogOpen(false);
      modelForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: async (data: PrinterModelFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PATCH", `/api/printers/models/${id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Modello aggiornato", description: "Il modello stampante è stato modificato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/models"] });
      setModelDialogOpen(false);
      setEditingModel(null);
      modelForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/printers/models/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Modello eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/models"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: PrinterProfileFormData) => {
      const response = await apiRequest("POST", "/api/printers/profiles", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profilo creato", description: "Il profilo carta è stato aggiunto" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
      setProfileDialogOpen(false);
      profileForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: PrinterProfileFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PATCH", `/api/printers/profiles/${id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profilo aggiornato", description: "Il profilo carta è stato modificato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
      setProfileDialogOpen(false);
      setEditingProfile(null);
      profileForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/printers/profiles/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Profilo eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const registerAgentMutation = useMutation({
    mutationFn: async (data: { deviceName: string; companyId?: string }) => {
      const response = await apiRequest("POST", "/api/printers/agents/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedToken(data.authToken);
      queryClient.invalidateQueries({ queryKey: ["/api/printers/agents"] });
      toast({ title: "Agent registrato", description: "Copia il token nel Print Agent" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/printers/agents/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Agent eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/agents"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
      toast({ title: "Token copiato!" });
    }
  };

  const handleRegisterAgent = () => {
    if (!deviceName.trim()) {
      toast({ title: "Errore", description: "Inserisci un nome per il dispositivo", variant: "destructive" });
      return;
    }
    // Super admin must select a company
    if (isSuperAdmin && !selectedCompanyId) {
      toast({ title: "Errore", description: "Seleziona un'azienda", variant: "destructive" });
      return;
    }
    const data: { deviceName: string; companyId?: string } = { deviceName: deviceName.trim() };
    if (isSuperAdmin && selectedCompanyId) {
      data.companyId = selectedCompanyId;
    }
    registerAgentMutation.mutate(data);
  };

  const resetRegisterDialog = () => {
    setRegisterDialogOpen(false);
    setGeneratedToken(null);
    setDeviceName("");
    setTokenCopied(false);
    setSelectedCompanyId("");
  };

  const handleEditModel = (model: PrinterModel) => {
    setEditingModel(model);
    modelForm.reset({
      vendor: model.vendor,
      model: model.model,
      dpi: model.dpi ?? 203,
      maxWidthMm: model.maxWidthMm ?? 80,
      connectionType: model.connectionType ?? "usb",
      driverNotes: model.driverNotes ?? "",
      isActive: model.isActive,
    });
    setModelDialogOpen(true);
  };

  const handleEditProfile = (profile: PrinterProfile) => {
    setEditingProfile(profile);
    profileForm.reset({
      name: profile.name,
      printerModelId: profile.printerModelId ?? undefined,
      paperWidthMm: profile.paperWidthMm,
      paperHeightMm: profile.paperHeightMm,
      marginTopMm: profile.marginTopMm ?? 2,
      marginBottomMm: profile.marginBottomMm ?? 2,
      marginLeftMm: profile.marginLeftMm ?? 2,
      marginRightMm: profile.marginRightMm ?? 2,
      isDefault: profile.isDefault ?? false,
      isActive: profile.isActive,
    });
    setProfileDialogOpen(true);
  };

  const onSubmitModel = (data: PrinterModelFormData) => {
    if (editingModel) {
      updateModelMutation.mutate({ ...data, id: editingModel.id });
    } else {
      createModelMutation.mutate(data);
    }
  };

  const onSubmitProfile = (data: PrinterProfileFormData) => {
    if (editingProfile) {
      updateProfileMutation.mutate({ ...data, id: editingProfile.id });
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-600"><Wifi className="h-3 w-3 mr-1" />Online</Badge>;
      case "printing":
        return <Badge className="bg-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Stampa</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Errore</Badge>;
      default:
        return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Mai";
    return new Date(date).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Printer className="h-6 w-6" />
            Impostazioni Stampante
          </h1>
          <p className="text-muted-foreground">
            Gestisci stampanti, profili carta e agenti di stampa
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          refetchAgents();
          refetchProfiles();
          if (isSuperAdmin) refetchModels();
        }} data-testid="button-refresh-printers">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Monitor className="h-4 w-4 mr-2" />
            Agenti Collegati
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Layout className="h-4 w-4 mr-2" />
            Template Biglietti
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="models" data-testid="tab-models">
              <Settings className="h-4 w-4 mr-2" />
              Modelli (Admin)
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Agenti Stampante Collegati
              </CardTitle>
              <CardDescription>
                Computer con l'app Event4U Print Agent installata. Scarica l'app per collegare una nuova postazione.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button variant="outline" data-testid="button-download-agent">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Print Agent
                </Button>
                
                <Dialog open={registerDialogOpen} onOpenChange={(open) => {
                  if (!open) resetRegisterDialog();
                  else setRegisterDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-register-agent">
                      <Key className="h-4 w-4 mr-2" />
                      Genera Token Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Registra Nuovo Agent</DialogTitle>
                      <DialogDescription>
                        Genera un token di autenticazione per collegare un nuovo computer con Print Agent
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!generatedToken ? (
                      <div className="space-y-4">
                        {/* Company selector for super_admin */}
                        {isSuperAdmin && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Azienda</label>
                            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                              <SelectTrigger data-testid="select-company-agent">
                                <SelectValue placeholder="Seleziona azienda..." />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              L'azienda a cui associare questo Print Agent
                            </p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nome Dispositivo</label>
                          <Input
                            placeholder="es. Box Office 1, Cassa Ingresso..."
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            data-testid="input-device-name"
                          />
                          <p className="text-xs text-muted-foreground">
                            Un nome identificativo per riconoscere questo computer
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleRegisterAgent}
                            disabled={registerAgentMutation.isPending || !deviceName.trim() || (isSuperAdmin && !selectedCompanyId)}
                            data-testid="button-confirm-register"
                          >
                            {registerAgentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Genera Token
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">Token Generato!</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Copia questo token nel Print Agent sul computer "{deviceName}"
                          </p>
                          <div className="flex gap-2">
                            <Input
                              value={generatedToken}
                              readOnly
                              className="font-mono text-xs"
                              data-testid="input-generated-token"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={handleCopyToken}
                              data-testid="button-copy-token"
                            >
                              {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-xs text-yellow-600">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Questo token viene mostrato una sola volta. Salvalo subito!
                          </p>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={resetRegisterDialog} data-testid="button-close-register">
                            Chiudi
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              
              {agentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun agente collegato</p>
                  <p className="text-sm">Scarica e installa Event4U Print Agent su un computer con stampante termica</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Stampante</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Ultimo Heartbeat</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                        <TableCell className="font-medium">{agent.deviceName}</TableCell>
                        <TableCell>{agent.printerName || "Non configurata"}</TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(agent.lastHeartbeat)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => deleteAgentMutation.mutate(agent.id)}
                            data-testid={`button-delete-agent-${agent.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Template Biglietti
                </CardTitle>
                <CardDescription>
                  {isSuperAdmin 
                    ? "Crea e gestisci template grafici per la stampa dei biglietti"
                    : "Visualizza i template disponibili per la stampa dei biglietti"
                  }
                </CardDescription>
              </div>
              {isSuperAdmin && (
                <Link href="/template-builder">
                  <Button data-testid="button-new-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Template
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun template disponibile</p>
                  {isSuperAdmin && (
                    <p className="text-sm mt-2">Crea il tuo primo template per personalizzare la stampa dei biglietti</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Dimensioni</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Versione</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Azioni</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          {template.paperWidthMm}mm × {template.paperHeightMm}mm
                        </TableCell>
                        <TableCell>
                          {template.isActive ? (
                            <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Attivo</Badge>
                          ) : (
                            <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inattivo</Badge>
                          )}
                          {template.isDefault && (
                            <Badge variant="outline" className="ml-1">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell>v{template.version || 1}</TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Link href={`/template-builder/${template.id}`}>
                                <Button size="icon" variant="ghost" data-testid={`button-edit-template-${template.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                                disabled={deleteTemplateMutation.isPending}
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="models">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    Modelli Stampante (Super Admin)
                  </CardTitle>
                  <CardDescription>
                    Gestisci i modelli di stampante termica supportati dal sistema
                  </CardDescription>
                </div>
                <Dialog open={modelDialogOpen} onOpenChange={(open) => {
                  setModelDialogOpen(open);
                  if (!open) {
                    setEditingModel(null);
                    modelForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-model">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuovo Modello
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingModel ? "Modifica Modello" : "Nuovo Modello Stampante"}
                      </DialogTitle>
                      <DialogDescription>
                        Aggiungi un nuovo modello di stampante termica al sistema
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...modelForm}>
                      <form onSubmit={modelForm.handleSubmit(onSubmitModel)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={modelForm.control}
                            name="vendor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Produttore</FormLabel>
                                <FormControl>
                                  <Input placeholder="es. X PRINTER" {...field} data-testid="input-model-vendor" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={modelForm.control}
                            name="model"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Modello</FormLabel>
                                <FormControl>
                                  <Input placeholder="es. XP-420B" {...field} data-testid="input-model-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={modelForm.control}
                            name="dpi"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Risoluzione (DPI)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-model-dpi" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={modelForm.control}
                            name="maxWidthMm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Largh. Max (mm)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-model-width" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={modelForm.control}
                          name="connectionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo Connessione</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? "usb"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-connection-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="usb">USB</SelectItem>
                                  <SelectItem value="tcp">Rete (TCP/IP)</SelectItem>
                                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={modelForm.control}
                          name="driverNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Note Driver</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note sull'installazione driver..." {...field} value={field.value ?? ""} data-testid="input-driver-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={modelForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0">Attivo</FormLabel>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="submit" disabled={createModelMutation.isPending || updateModelMutation.isPending} data-testid="button-save-model">
                            {(createModelMutation.isPending || updateModelMutation.isPending) && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            {editingModel ? "Salva Modifiche" : "Crea Modello"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {modelsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : models.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun modello stampante configurato</p>
                    <p className="text-sm">Aggiungi modelli di stampante termica supportati</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produttore</TableHead>
                        <TableHead>Modello</TableHead>
                        <TableHead>DPI</TableHead>
                        <TableHead>Largh. Max</TableHead>
                        <TableHead>Connessione</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.id} data-testid={`row-model-${model.id}`}>
                          <TableCell className="font-medium">{model.vendor}</TableCell>
                          <TableCell>{model.model}</TableCell>
                          <TableCell>{model.dpi}</TableCell>
                          <TableCell>{model.maxWidthMm} mm</TableCell>
                          <TableCell className="capitalize">{model.connectionType}</TableCell>
                          <TableCell>
                            {model.isActive ? (
                              <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Attivo</Badge>
                            ) : (
                              <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inattivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => handleEditModel(model)} data-testid={`button-edit-model-${model.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteModelMutation.mutate(model.id)} data-testid={`button-delete-model-${model.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
