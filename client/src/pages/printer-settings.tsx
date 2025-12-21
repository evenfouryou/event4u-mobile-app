import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
  Smartphone,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { TicketTemplate, DigitalTicketTemplate } from "@shared/schema";
import type { 
  PrinterModel, 
  PrinterAgent, 
  PrinterProfile,
} from "@shared/schema";
import {
  insertPrinterModelSchema,
  insertPrinterProfileSchema,
} from "@shared/schema";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

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

interface SettingsCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  rightContent?: React.ReactNode;
}

function SettingsCard({ icon: Icon, title, description, badge, onClick, rightContent }: SettingsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="overflow-visible cursor-pointer hover-elevate active-elevate-2"
        onClick={() => {
          triggerHaptic('light');
          onClick?.();
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{title}</h3>
                {badge}
              </div>
              <p className="text-muted-foreground text-sm truncate">{description}</p>
            </div>
            {rightContent || <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AgentCardProps {
  agent: PrinterAgent;
  profiles: PrinterProfile[];
  onManageProfiles: () => void;
  onDelete: () => void;
}

function AgentCard({ agent, profiles, onManageProfiles, onDelete }: AgentCardProps) {
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
    >
      <Card className="overflow-visible">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{agent.deviceName}</h3>
                {getStatusBadge(agent.status)}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {agent.printerName || "Stampante non configurata"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Ultimo heartbeat: {formatDate(agent.lastHeartbeat)}
              </p>
              
              {profiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profiles.map(profile => (
                    <Badge key={profile.id} variant="secondary" className="text-xs">
                      {profile.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                <HapticButton
                  variant="outline"
                  size="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageProfiles();
                  }}
                  className="flex-1 min-h-[44px]"
                  data-testid={`button-manage-profiles-${agent.id}`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Profili
                </HapticButton>
                <HapticButton
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="min-h-[44px] min-w-[44px]"
                  hapticType="medium"
                  data-testid={`button-delete-agent-${agent.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </HapticButton>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PrinterSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isSuperAdmin = user?.role === "super_admin";
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PrinterModel | null>(null);
  const [editingProfile, setEditingProfile] = useState<PrinterProfile | null>(null);
  const [registerSheetOpen, setRegisterSheetOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [profileAssignSheetOpen, setProfileAssignSheetOpen] = useState(false);
  const [selectedAgentForProfiles, setSelectedAgentForProfiles] = useState<PrinterAgent | null>(null);

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

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TicketTemplate[]>({
    queryKey: ["/api/ticket/templates"],
  });

  const { data: digitalTemplates = [], isLoading: digitalTemplatesLoading } = useQuery<DigitalTicketTemplate[]>({
    queryKey: ["/api/digital-templates"],
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ticket/templates/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Template eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/ticket/templates"] });
    },
    onError: () => {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Impossibile eliminare il template", variant: "destructive" });
    },
  });

  const deleteDigitalTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/digital-templates/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Template digitale eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/digital-templates"] });
    },
    onError: () => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({ title: "Modello creato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/models"] });
      setModelSheetOpen(false);
      modelForm.reset();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({ title: "Modello aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/models"] });
      setModelSheetOpen(false);
      setEditingModel(null);
      modelForm.reset();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/printers/models/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Modello eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/models"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: PrinterProfileFormData) => {
      const response = await apiRequest("POST", "/api/printers/profiles", data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Profilo creato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
      setProfileSheetOpen(false);
      profileForm.reset();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({ title: "Profilo aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
      setProfileSheetOpen(false);
      setEditingProfile(null);
      profileForm.reset();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/printers/profiles/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Profilo eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const registerAgentMutation = useMutation({
    mutationFn: async (data: { deviceName: string; companyId?: string }) => {
      const response = await apiRequest("POST", "/api/printers/agents/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      triggerHaptic('success');
      setGeneratedToken(data.authToken);
      queryClient.invalidateQueries({ queryKey: ["/api/printers/agents"] });
      toast({ title: "Agent registrato" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/printers/agents/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Agent eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/agents"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const assignProfileToAgentMutation = useMutation({
    mutationFn: async ({ profileId, agentId }: { profileId: string; agentId: string | null }) => {
      const response = await apiRequest("PATCH", `/api/printers/profiles/${profileId}`, { agentId });
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Profilo aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/printers/profiles"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      triggerHaptic('success');
      setTimeout(() => setTokenCopied(false), 2000);
      toast({ title: "Token copiato!" });
    }
  };

  const handleRegisterAgent = () => {
    if (!deviceName.trim()) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Inserisci un nome per il dispositivo", variant: "destructive" });
      return;
    }
    if (isSuperAdmin && !selectedCompanyId) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Seleziona un'azienda", variant: "destructive" });
      return;
    }
    const data: { deviceName: string; companyId?: string } = { deviceName: deviceName.trim() };
    if (isSuperAdmin && selectedCompanyId) {
      data.companyId = selectedCompanyId;
    }
    registerAgentMutation.mutate(data);
  };

  const resetRegisterSheet = () => {
    setRegisterSheetOpen(false);
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
    setModelSheetOpen(true);
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
    setProfileSheetOpen(true);
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

  const getProfilesForAgent = (agentId: string) => {
    return profiles.filter(p => p.agentId === agentId);
  };

  const getUnassignedProfiles = () => {
    return profiles.filter(p => !p.agentId);
  };

  const openProfileAssignSheet = (agent: PrinterAgent) => {
    setSelectedAgentForProfiles(agent);
    setProfileAssignSheetOpen(true);
  };

  const handleRefresh = () => {
    triggerHaptic('light');
    refetchAgents();
    refetchProfiles();
    if (isSuperAdmin) refetchModels();
  };

  const renderMainMenu = () => (
    <div className="space-y-3 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig, delay: 0 }}
      >
        <p className="text-muted-foreground text-sm px-1 mb-4">
          Gestisci stampanti, profili carta e template biglietti
        </p>
      </motion.div>

      <SettingsCard
        icon={Monitor}
        title="Agenti Collegati"
        description={agentsLoading ? "Caricamento..." : `${agents.length} dispositivi`}
        badge={agents.filter(a => a.status === "online").length > 0 ? (
          <Badge className="bg-green-600 text-xs">{agents.filter(a => a.status === "online").length} online</Badge>
        ) : undefined}
        onClick={() => setActiveSection("agents")}
      />

      <SettingsCard
        icon={Layout}
        title="Template Biglietti"
        description={templatesLoading ? "Caricamento..." : `${templates.length} template`}
        onClick={() => setActiveSection("templates")}
      />

      <SettingsCard
        icon={Smartphone}
        title="Template Digitali"
        description={digitalTemplatesLoading ? "Caricamento..." : `${digitalTemplates.length} template`}
        onClick={() => setActiveSection("digital-templates")}
      />

      {isSuperAdmin && (
        <SettingsCard
          icon={Settings}
          title="Modelli Stampante"
          description={modelsLoading ? "Caricamento..." : `${models.length} modelli`}
          badge={<Badge variant="outline" className="text-xs">Admin</Badge>}
          onClick={() => setActiveSection("models")}
        />
      )}
    </div>
  );

  const renderAgentsSection = () => (
    <div className="space-y-4 pb-24">
      <div className="flex gap-2">
        <HapticButton
          variant="outline"
          className="flex-1 min-h-[48px]"
          data-testid="button-download-agent"
        >
          <Download className="w-4 h-4 mr-2" />
          Scarica Agent
        </HapticButton>
        <HapticButton
          className="flex-1 min-h-[48px]"
          onClick={() => setRegisterSheetOpen(true)}
          data-testid="button-register-agent"
        >
          <Key className="w-4 h-4 mr-2" />
          Genera Token
        </HapticButton>
      </div>

      {agentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Nessun agente collegato</p>
          <p className="text-muted-foreground text-sm mt-1">
            Installa Event4U Print Agent su un computer
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: index * 0.05 }}
            >
              <AgentCard
                agent={agent}
                profiles={getProfilesForAgent(agent.id)}
                onManageProfiles={() => openProfileAssignSheet(agent)}
                onDelete={() => deleteAgentMutation.mutate(agent.id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTemplatesSection = () => (
    <div className="space-y-4 pb-24">
      {isSuperAdmin && (
        <Link href="/template-builder">
          <HapticButton className="w-full min-h-[48px]" data-testid="button-new-template">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Template
          </HapticButton>
        </Link>
      )}

      {templatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Layout className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Nessun template</p>
          {isSuperAdmin && (
            <p className="text-muted-foreground text-sm mt-1">
              Crea il tuo primo template
            </p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: index * 0.05 }}
            >
              <Card className="overflow-visible">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Layout className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        {!template.companyId ? (
                          <Badge className="bg-purple-600 text-xs">Sistema</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Azienda</Badge>
                        )}
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {template.paperWidthMm}mm × {template.paperHeightMm}mm
                      </p>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex gap-1">
                        <Link href={`/template-builder/${template.id}`}>
                          <HapticButton
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px]"
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </HapticButton>
                        </Link>
                        <HapticButton
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          hapticType="medium"
                          data-testid={`button-delete-template-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </HapticButton>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDigitalTemplatesSection = () => (
    <div className="space-y-4 pb-24">
      <Link href="/digital-template-builder">
        <HapticButton className="w-full min-h-[48px]" data-testid="button-new-digital-template">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Template Digitale
        </HapticButton>
      </Link>

      {digitalTemplatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : digitalTemplates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Nessun template digitale</p>
          <p className="text-muted-foreground text-sm mt-1">
            Crea il tuo primo template digitale
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {digitalTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: index * 0.05 }}
            >
              <Card className="overflow-visible">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Smartphone className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        {!template.companyId ? (
                          <Badge className="bg-purple-600 text-xs">Sistema</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Azienda</Badge>
                        )}
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-xs">Predefinito</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm capitalize">
                        {template.backgroundStyle || "gradient"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/digital-template-builder/${template.id}`}>
                        <HapticButton
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          data-testid={`button-edit-digital-template-${template.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </HapticButton>
                      </Link>
                      <HapticButton
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => deleteDigitalTemplateMutation.mutate(template.id)}
                        hapticType="medium"
                        data-testid={`button-delete-digital-template-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </HapticButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderModelsSection = () => (
    <div className="space-y-4 pb-24">
      <HapticButton
        className="w-full min-h-[48px]"
        onClick={() => {
          setEditingModel(null);
          modelForm.reset();
          setModelSheetOpen(true);
        }}
        data-testid="button-add-model"
      >
        <Plus className="w-4 h-4 mr-2" />
        Nuovo Modello
      </HapticButton>

      {modelsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : models.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Printer className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Nessun modello</p>
          <p className="text-muted-foreground text-sm mt-1">
            Aggiungi modelli stampante supportati
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {models.map((model, index) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: index * 0.05 }}
            >
              <Card className="overflow-visible">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Printer className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{model.vendor} {model.model}</h3>
                        {model.isActive ? (
                          <Badge className="bg-green-600 text-xs">Attivo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inattivo</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {model.dpi} DPI • {model.maxWidthMm}mm • {model.connectionType}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <HapticButton
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => handleEditModel(model)}
                        data-testid={`button-edit-model-${model.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </HapticButton>
                      <HapticButton
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => deleteModelMutation.mutate(model.id)}
                        hapticType="medium"
                        data-testid={`button-delete-model-${model.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </HapticButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const getSectionTitle = () => {
    switch (activeSection) {
      case "agents": return "Agenti Collegati";
      case "templates": return "Template Biglietti";
      case "digital-templates": return "Template Digitali";
      case "models": return "Modelli Stampante";
      default: return "Impostazioni Stampante";
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "agents": return renderAgentsSection();
      case "templates": return renderTemplatesSection();
      case "digital-templates": return renderDigitalTemplatesSection();
      case "models": return renderModelsSection();
      default: return renderMainMenu();
    }
  };

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={getSectionTitle()}
          leftAction={
            activeSection ? (
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setActiveSection(null)}
                className="min-h-[44px] min-w-[44px]"
              >
                <ArrowLeft className="w-5 h-5" />
              </HapticButton>
            ) : undefined
          }
          rightAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="min-h-[44px] min-w-[44px]"
              data-testid="button-refresh-printers"
            >
              <RefreshCw className="w-5 h-5" />
            </HapticButton>
          }
        />
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection || "main"}
          initial={{ opacity: 0, x: activeSection ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeSection ? -20 : 20 }}
          transition={springConfig}
          className="py-4"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      <BottomSheet
        open={registerSheetOpen}
        onClose={resetRegisterSheet}
        title="Registra Agent"
      >
        <div className="p-4 space-y-4">
          {!generatedToken ? (
            <>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Azienda</label>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="min-h-[48px]" data-testid="select-company-agent">
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
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Dispositivo</label>
                <Input
                  placeholder="es. Box Office 1"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="min-h-[48px]"
                  data-testid="input-device-name"
                />
              </div>
              <HapticButton
                className="w-full min-h-[48px]"
                onClick={handleRegisterAgent}
                disabled={registerAgentMutation.isPending || !deviceName.trim() || (isSuperAdmin && !selectedCompanyId)}
                data-testid="button-confirm-register"
              >
                {registerAgentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Genera Token
              </HapticButton>
            </>
          ) : (
            <>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Token Generato!</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Copia questo token nel Print Agent
                </p>
                <div className="flex gap-2">
                  <Input
                    value={generatedToken}
                    readOnly
                    className="font-mono text-xs min-h-[48px]"
                    data-testid="input-generated-token"
                  />
                  <HapticButton
                    size="icon"
                    variant="outline"
                    onClick={handleCopyToken}
                    className="min-h-[48px] min-w-[48px]"
                    data-testid="button-copy-token"
                  >
                    {tokenCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </HapticButton>
                </div>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-xs text-yellow-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Questo token viene mostrato una sola volta!
                </p>
              </div>
              <HapticButton
                variant="outline"
                className="w-full min-h-[48px]"
                onClick={resetRegisterSheet}
                data-testid="button-close-register"
              >
                Chiudi
              </HapticButton>
            </>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={profileAssignSheetOpen}
        onClose={() => {
          setProfileAssignSheetOpen(false);
          setSelectedAgentForProfiles(null);
        }}
        title={`Profili - ${selectedAgentForProfiles?.deviceName || ""}`}
      >
        <div className="p-4 space-y-4">
          {selectedAgentForProfiles && (
            <>
              <div>
                <h4 className="font-medium text-sm mb-3">Profili assegnati</h4>
                {getProfilesForAgent(selectedAgentForProfiles.id).length > 0 ? (
                  <div className="space-y-2">
                    {getProfilesForAgent(selectedAgentForProfiles.id).map(profile => (
                      <div key={profile.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <span className="font-medium">{profile.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {profile.paperWidthMm}×{profile.paperHeightMm}mm
                          </span>
                        </div>
                        <HapticButton 
                          size="icon"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => assignProfileToAgentMutation.mutate({ profileId: profile.id, agentId: null })}
                          disabled={assignProfileToAgentMutation.isPending}
                          hapticType="medium"
                          data-testid={`button-unassign-profile-${profile.id}`}
                        >
                          <XCircle className="w-5 h-5 text-destructive" />
                        </HapticButton>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun profilo assegnato</p>
                )}
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Profili disponibili</h4>
                {getUnassignedProfiles().length > 0 ? (
                  <div className="space-y-2">
                    {getUnassignedProfiles().map(profile => (
                      <div key={profile.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <span className="font-medium">{profile.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {profile.paperWidthMm}×{profile.paperHeightMm}mm
                          </span>
                        </div>
                        <HapticButton 
                          size="icon"
                          variant="outline"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => assignProfileToAgentMutation.mutate({ profileId: profile.id, agentId: selectedAgentForProfiles.id })}
                          disabled={assignProfileToAgentMutation.isPending}
                          data-testid={`button-assign-profile-${profile.id}`}
                        >
                          <Plus className="w-5 h-5" />
                        </HapticButton>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Tutti i profili sono assegnati</p>
                )}
              </div>

              {profiles.length === 0 && (
                <div className="text-center py-6">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">Nessun profilo nel sistema</p>
                </div>
              )}
            </>
          )}

          <HapticButton
            variant="outline"
            className="w-full min-h-[48px]"
            onClick={() => setProfileAssignSheetOpen(false)}
            data-testid="button-close-profile-dialog"
          >
            Chiudi
          </HapticButton>
        </div>
      </BottomSheet>

      <BottomSheet
        open={modelSheetOpen}
        onClose={() => {
          setModelSheetOpen(false);
          setEditingModel(null);
          modelForm.reset();
        }}
        title={editingModel ? "Modifica Modello" : "Nuovo Modello"}
      >
        <div className="p-4">
          <Form {...modelForm}>
            <form onSubmit={modelForm.handleSubmit(onSubmitModel)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={modelForm.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produttore</FormLabel>
                      <FormControl>
                        <Input placeholder="X PRINTER" {...field} className="min-h-[48px]" data-testid="input-model-vendor" />
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
                        <Input placeholder="XP-420B" {...field} className="min-h-[48px]" data-testid="input-model-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={modelForm.control}
                  name="dpi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DPI</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="min-h-[48px]" data-testid="input-model-dpi" />
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
                        <Input type="number" {...field} className="min-h-[48px]" data-testid="input-model-width" />
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
                    <FormLabel>Connessione</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "usb"}>
                      <FormControl>
                        <SelectTrigger className="min-h-[48px]" data-testid="select-connection-type">
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
                      <Textarea 
                        placeholder="Note installazione..." 
                        {...field} 
                        value={field.value ?? ""} 
                        className="min-h-[80px]"
                        data-testid="input-driver-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={modelForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <FormLabel className="!mt-0">Attivo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <HapticButton
                type="submit"
                className="w-full min-h-[48px]"
                disabled={createModelMutation.isPending || updateModelMutation.isPending}
                data-testid="button-save-model"
              >
                {(createModelMutation.isPending || updateModelMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingModel ? "Salva Modifiche" : "Crea Modello"}
              </HapticButton>
            </form>
          </Form>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
