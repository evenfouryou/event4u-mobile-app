import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  FloatingActionButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Users,
  XCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Copy,
  Upload,
  ChevronDown,
  ChevronRight,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import type { SchoolBadgeLanding, SchoolBadgeRequest } from "@shared/schema";

const springConfig = { stiffness: 400, damping: 30 };

const landingFormSchema = z.object({
  schoolName: z.string().min(1, "Nome scuola obbligatorio"),
  slug: z.string().min(1, "Slug obbligatorio").regex(/^[a-z0-9-]+$/, "Solo lettere minuscole, numeri e trattini"),
  logoUrl: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  authorizedDomains: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Colore esadecimale non valido").default("#3b82f6"),
  customWelcomeText: z.string().optional(),
  customThankYouText: z.string().optional(),
  termsText: z.string().optional(),
  privacyText: z.string().optional(),
  marketingText: z.string().optional(),
  requireTerms: z.boolean().default(false),
  showMarketing: z.boolean().default(true),
});

type LandingFormData = z.infer<typeof landingFormSchema>;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  pending: { label: "In attesa", variant: "secondary", icon: Clock },
  verified: { label: "Verificato", variant: "default", icon: CheckCircle2 },
  badge_generated: { label: "Badge generato", variant: "default", icon: CheckCircle2 },
  revoked: { label: "Revocato", variant: "destructive", icon: XCircle },
};

export default function SchoolBadgeManager() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLanding, setEditingLanding] = useState<SchoolBadgeLanding | null>(null);
  const [viewingLanding, setViewingLanding] = useState<SchoolBadgeLanding | null>(null);
  const [deletingLanding, setDeletingLanding] = useState<SchoolBadgeLanding | null>(null);
  const [revokingRequest, setRevokingRequest] = useState<SchoolBadgeRequest | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showPrivacySection, setShowPrivacySection] = useState(false);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Il file deve essere un'immagine",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "L'immagine deve essere inferiore a 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoPreview(dataUrl);
      form.setValue("logoUrl", dataUrl);
      setIsUploadingLogo(false);
      triggerHaptic('success');
    };
    reader.onerror = () => {
      toast({
        title: "Errore",
        description: "Impossibile leggere il file",
        variant: "destructive",
      });
      setIsUploadingLogo(false);
      triggerHaptic('error');
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    triggerHaptic('light');
    setLogoPreview(null);
    form.setValue("logoUrl", "");
  };

  const { data: landings = [], isLoading } = useQuery<SchoolBadgeLanding[]>({
    queryKey: ["/api/school-badges/landings"],
  });

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<SchoolBadgeRequest[]>({
    queryKey: ["/api/school-badges/landings", viewingLanding?.id, "requests"],
    enabled: !!viewingLanding,
  });

  const form = useForm<LandingFormData>({
    resolver: zodResolver(landingFormSchema),
    defaultValues: {
      schoolName: "",
      slug: "",
      logoUrl: "",
      description: "",
      authorizedDomains: "",
      primaryColor: "#3b82f6",
      customWelcomeText: "",
      customThankYouText: "",
      termsText: "",
      privacyText: "",
      marketingText: "",
      requireTerms: false,
      showMarketing: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LandingFormData) => {
      const payload = {
        ...data,
        authorizedDomains: data.authorizedDomains ? data.authorizedDomains.split(",").map(d => d.trim()).filter(Boolean) : [],
        logoUrl: data.logoUrl || null,
      };
      const response = await apiRequest("POST", "/api/school-badges/landings", payload);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Landing creata", description: "La landing page è stata creata con successo" });
      setIsFormOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LandingFormData) => {
      const payload = {
        ...data,
        authorizedDomains: data.authorizedDomains ? data.authorizedDomains.split(",").map(d => d.trim()).filter(Boolean) : [],
        logoUrl: data.logoUrl || null,
      };
      const response = await apiRequest("PATCH", `/api/school-badges/landings/${editingLanding!.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Landing aggiornata", description: "Le modifiche sono state salvate" });
      setIsFormOpen(false);
      setEditingLanding(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/school-badges/landings/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Landing eliminata" });
      setDeletingLanding(null);
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/school-badges/landings/${id}`, { isActive });
      return response.json();
    },
    onSuccess: (_, variables) => {
      triggerHaptic('medium');
      toast({ 
        title: variables.isActive ? "Landing attivata" : "Landing disattivata",
        description: variables.isActive ? "Le richieste sono ora aperte" : "Le richieste sono chiuse"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("PUT", `/api/school-badges/requests/${requestId}/revoke`, {});
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Badge revocato" });
      setRevokingRequest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings", viewingLanding?.id, "requests"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const openCreateForm = () => {
    triggerHaptic('medium');
    setEditingLanding(null);
    setLogoPreview(null);
    setShowPrivacySection(false);
    form.reset({
      schoolName: "",
      slug: "",
      logoUrl: "",
      description: "",
      authorizedDomains: "",
      primaryColor: "#3b82f6",
      customWelcomeText: "",
      customThankYouText: "",
      termsText: "",
      privacyText: "",
      marketingText: "",
      requireTerms: false,
      showMarketing: true,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (landing: SchoolBadgeLanding) => {
    triggerHaptic('light');
    setEditingLanding(landing);
    setLogoPreview(landing.logoUrl || null);
    setShowPrivacySection(false);
    form.reset({
      schoolName: landing.schoolName,
      slug: landing.slug,
      logoUrl: landing.logoUrl || "",
      description: landing.description || "",
      authorizedDomains: landing.authorizedDomains?.join(", ") || "",
      primaryColor: landing.primaryColor || "#3b82f6",
      customWelcomeText: landing.customWelcomeText || "",
      customThankYouText: landing.customThankYouText || "",
      termsText: landing.termsText || "",
      privacyText: landing.privacyText || "",
      marketingText: landing.marketingText || "",
      requireTerms: landing.requireTerms ?? false,
      showMarketing: landing.showMarketing ?? true,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: LandingFormData) => {
    if (editingLanding) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const copyLandingUrl = (slug: string) => {
    triggerHaptic('success');
    const url = `${window.location.origin}/badge/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiato", description: url });
  };

  const header = (
    <MobileHeader
      title="Badge Scuole"
      subtitle={`${landings.length} landing`}
    />
  );

  if (isLoading) {
    return (
      <MobileAppLayout header={header}>
        <div className="py-6 pb-24 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout header={header}>
      <div className="py-4 pb-24">
        <AnimatePresence mode="popLayout">
          {landings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", ...springConfig }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <motion.div 
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", ...springConfig, delay: 0.1 }}
              >
                <GraduationCap className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2 text-center">Nessuna landing page</h3>
              <p className="text-muted-foreground text-center mb-6">
                Crea la tua prima landing page per permettere agli studenti di richiedere i badge
              </p>
              <HapticButton 
                onClick={openCreateForm} 
                hapticType="medium"
                className="min-h-[52px] px-6"
                data-testid="button-create-first-landing"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crea Landing
              </HapticButton>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {landings.map((landing, index) => (
                <motion.div
                  key={landing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", ...springConfig, delay: index * 0.05 }}
                  layout
                >
                  <div 
                    className="bg-card rounded-2xl border border-border overflow-hidden"
                    data-testid={`card-landing-${landing.id}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        {landing.logoUrl ? (
                          <img 
                            src={landing.logoUrl} 
                            alt={landing.schoolName} 
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0" 
                          />
                        ) : (
                          <div 
                            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: landing.primaryColor || "#3b82f6" }}
                          >
                            <GraduationCap className="h-7 w-7 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-lg truncate">{landing.schoolName}</h3>
                            <Switch
                              checked={landing.isActive}
                              onCheckedChange={(checked) => {
                                triggerHaptic('medium');
                                toggleActiveMutation.mutate({ id: landing.id, isActive: checked });
                              }}
                              disabled={toggleActiveMutation.isPending}
                              data-testid={`switch-active-${landing.id}`}
                            />
                          </div>
                          <p className="text-muted-foreground text-sm truncate">/{landing.slug}</p>
                          <Badge 
                            variant={landing.isActive ? "default" : "secondary"} 
                            className="mt-2"
                          >
                            {landing.isActive ? "Attiva" : "Inattiva"}
                          </Badge>
                        </div>
                      </div>

                      {landing.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{landing.description}</p>
                      )}

                      {landing.authorizedDomains && landing.authorizedDomains.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {landing.authorizedDomains.slice(0, 2).map((domain, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              @{domain}
                            </Badge>
                          ))}
                          {landing.authorizedDomains.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{landing.authorizedDomains.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <HapticButton
                          variant="outline"
                          onClick={() => copyLandingUrl(landing.slug)}
                          className="flex-1"
                          data-testid={`button-copy-url-${landing.id}`}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copia URL
                        </HapticButton>
                        <HapticButton
                          variant="outline"
                          onClick={() => {
                            triggerHaptic('light');
                            window.open(`/badge/${landing.slug}`, "_blank");
                          }}
                          className="flex-1"
                          data-testid={`button-preview-${landing.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Apri
                        </HapticButton>
                      </div>
                    </div>

                    <div className="border-t border-border bg-muted/30">
                      <div className="flex divide-x divide-border">
                        <HapticButton
                          variant="ghost"
                          onClick={() => {
                            triggerHaptic('light');
                            setViewingLanding(landing);
                          }}
                          className="flex-1 rounded-none h-12"
                          data-testid={`button-view-requests-${landing.id}`}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Richieste
                        </HapticButton>
                        <HapticButton
                          variant="ghost"
                          onClick={() => openEditForm(landing)}
                          className="flex-1 rounded-none h-12"
                          data-testid={`button-edit-${landing.id}`}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifica
                        </HapticButton>
                        <HapticButton
                          variant="ghost"
                          onClick={() => {
                            triggerHaptic('heavy');
                            setDeletingLanding(landing);
                          }}
                          className="flex-1 rounded-none h-12 text-destructive hover:text-destructive"
                          data-testid={`button-delete-${landing.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </HapticButton>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <FloatingActionButton
        onClick={openCreateForm}
        data-testid="button-create-landing"
      >
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      <BottomSheet
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLanding(null);
        }}
        title={editingLanding ? "Modifica Landing" : "Nuova Landing"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 pb-8 space-y-5">
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Scuola</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Liceo Scientifico Einstein" 
                      className="h-12"
                      data-testid="input-school-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug URL</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="liceo-einstein" 
                      className="h-12"
                      data-testid="input-slug" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo (opzionale)</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {(logoPreview || field.value) && (
                        <div className="relative inline-block">
                          <img 
                            src={logoPreview || field.value} 
                            alt="Anteprima logo" 
                            className="w-24 h-24 rounded-xl object-cover border"
                          />
                          <HapticButton
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                            onClick={clearLogo}
                          >
                            <XCircle className="h-4 w-4" />
                          </HapticButton>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors min-h-[56px]">
                        {isUploadingLogo ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                        <span>Carica immagine</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFileChange}
                          disabled={isUploadingLogo}
                          data-testid="input-logo-file"
                        />
                      </label>
                      <p className="text-xs text-muted-foreground">Max 2MB. Formati: JPG, PNG, GIF, WebP</p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Descrizione della scuola..." 
                      className="min-h-[100px]"
                      data-testid="input-description" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorizedDomains"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domini email autorizzati</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="scuola.edu.it, liceo.it" 
                      className="h-12"
                      data-testid="input-domains" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colore primario</FormLabel>
                  <FormControl>
                    <div className="flex gap-3 items-center">
                      <Input 
                        {...field} 
                        placeholder="#3b82f6" 
                        className="h-12 flex-1"
                        data-testid="input-primary-color" 
                      />
                      <div 
                        className="w-12 h-12 rounded-xl border-2 flex-shrink-0" 
                        style={{ backgroundColor: field.value }} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customWelcomeText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testo di benvenuto (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Benvenuto! Compila il form..." 
                      className="min-h-[80px]"
                      data-testid="input-welcome-text" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customThankYouText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testo di ringraziamento (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Grazie per la richiesta..." 
                      className="min-h-[80px]"
                      data-testid="input-thankyou-text" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowPrivacySection(!showPrivacySection);
                }}
                className="flex items-center justify-between w-full p-4 min-h-[56px]"
                data-testid="collapsible-privacy-trigger"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Termini e Privacy</span>
                </div>
                <motion.div
                  animate={{ rotate: showPrivacySection ? 90 : 0 }}
                  transition={{ type: "spring", ...springConfig }}
                >
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {showPrivacySection && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", ...springConfig }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t">
                      <FormField
                        control={form.control}
                        name="termsText"
                        render={({ field }) => (
                          <FormItem className="pt-4">
                            <FormLabel>Termini e Condizioni</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Inserisci il testo dei termini..." 
                                className="min-h-[100px]"
                                data-testid="input-terms-text" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="privacyText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Privacy Policy</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Inserisci l'informativa privacy..." 
                                className="min-h-[100px]"
                                data-testid="input-privacy-text" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="marketingText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Consenso Marketing</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Inserisci il testo per il consenso marketing..." 
                                className="min-h-[100px]"
                                data-testid="input-marketing-text" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-4 pt-2">
                        <FormField
                          control={form.control}
                          name="requireTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-3 space-y-0 min-h-[48px]">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    triggerHaptic('light');
                                    field.onChange(checked);
                                  }}
                                  className="h-6 w-6"
                                  data-testid="checkbox-require-terms"
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer text-base">
                                Richiedi accettazione termini
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="showMarketing"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-3 space-y-0 min-h-[48px]">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    triggerHaptic('light');
                                    field.onChange(checked);
                                  }}
                                  className="h-6 w-6"
                                  data-testid="checkbox-show-marketing"
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer text-base">
                                Mostra opzione consenso marketing
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-3 pt-4">
              <HapticButton 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingLanding(null);
                }}
                className="flex-1 h-14"
              >
                Annulla
              </HapticButton>
              <HapticButton 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-14"
                hapticType="success"
                data-testid="button-submit-landing"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                )}
                {editingLanding ? "Salva" : "Crea"}
              </HapticButton>
            </div>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={!!viewingLanding}
        onClose={() => setViewingLanding(null)}
        title={`Richieste - ${viewingLanding?.schoolName}`}
      >
        <div className="px-4 pb-8">
          {isLoadingRequests ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">Nessuna richiesta ricevuta</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {requests.map((request) => {
                const status = statusConfig[request.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", ...springConfig }}
                    className="bg-muted/50 rounded-xl p-4"
                    data-testid={`row-request-${request.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{request.email}</p>
                        {request.phone && (
                          <p className="text-sm text-muted-foreground">{request.phone}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {request.createdAt && format(new Date(request.createdAt), "dd/MM/yy HH:mm", { locale: it })}
                          </span>
                        </div>
                      </div>
                      {request.status !== "revoked" && (
                        <HapticButton
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            triggerHaptic('heavy');
                            setRevokingRequest(request);
                          }}
                          className="text-destructive"
                          data-testid={`button-revoke-${request.id}`}
                        >
                          <XCircle className="h-5 w-5" />
                        </HapticButton>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      <AlertDialog open={!!deletingLanding} onOpenChange={(open) => !open && setDeletingLanding(null)}>
        <AlertDialogContent className="rounded-2xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa landing?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Verranno eliminate anche tutte le richieste e i badge associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel className="min-h-[48px]">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                triggerHaptic('heavy');
                deletingLanding && deleteMutation.mutate(deletingLanding.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[48px]"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revokingRequest} onOpenChange={(open) => !open && setRevokingRequest(null)}>
        <AlertDialogContent className="rounded-2xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Revocare questo badge?</AlertDialogTitle>
            <AlertDialogDescription>
              Il badge di {revokingRequest?.firstName} {revokingRequest?.lastName} verrà revocato e non sarà più valido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel className="min-h-[48px]">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                triggerHaptic('heavy');
                revokingRequest && revokeMutation.mutate(revokingRequest.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[48px]"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
