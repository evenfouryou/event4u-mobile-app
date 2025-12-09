import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Users,
  Eye,
  XCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Copy,
  Upload,
  Image,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import type { SchoolBadgeLanding, SchoolBadgeRequest } from "@shared/schema";

const landingFormSchema = z.object({
  schoolName: z.string().min(1, "Nome scuola obbligatorio"),
  slug: z.string().min(1, "Slug obbligatorio").regex(/^[a-z0-9-]+$/, "Solo lettere minuscole, numeri e trattini"),
  logoUrl: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  authorizedDomains: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Colore esadecimale non valido").default("#3b82f6"),
  customWelcomeText: z.string().optional(),
  customThankYouText: z.string().optional(),
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLanding, setEditingLanding] = useState<SchoolBadgeLanding | null>(null);
  const [viewingLanding, setViewingLanding] = useState<SchoolBadgeLanding | null>(null);
  const [deletingLanding, setDeletingLanding] = useState<SchoolBadgeLanding | null>(null);
  const [revokingRequest, setRevokingRequest] = useState<SchoolBadgeRequest | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Errore",
        description: "Il file deve essere un'immagine",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
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
    };
    reader.onerror = () => {
      toast({
        title: "Errore",
        description: "Impossibile leggere il file",
        variant: "destructive",
      });
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
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
      toast({ title: "Landing creata", description: "La landing page è stata creata con successo" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
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
      toast({ title: "Landing aggiornata", description: "Le modifiche sono state salvate" });
      setIsDialogOpen(false);
      setEditingLanding(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/school-badges/landings/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Landing eliminata" });
      setDeletingLanding(null);
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/school-badges/landings/${id}`, { isActive });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.isActive ? "Landing attivata" : "Landing disattivata",
        description: variables.isActive ? "Le richieste sono ora aperte" : "Le richieste sono chiuse"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("POST", `/api/school-badges/requests/${requestId}/revoke`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Badge revocato" });
      setRevokingRequest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/school-badges/landings", viewingLanding?.id, "requests"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingLanding(null);
    setLogoPreview(null);
    form.reset({
      schoolName: "",
      slug: "",
      logoUrl: "",
      description: "",
      authorizedDomains: "",
      primaryColor: "#3b82f6",
      customWelcomeText: "",
      customThankYouText: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (landing: SchoolBadgeLanding) => {
    setEditingLanding(landing);
    setLogoPreview(landing.logoUrl || null);
    form.reset({
      schoolName: landing.schoolName,
      slug: landing.slug,
      logoUrl: landing.logoUrl || "",
      description: landing.description || "",
      authorizedDomains: landing.authorizedDomains?.join(", ") || "",
      primaryColor: landing.primaryColor || "#3b82f6",
      customWelcomeText: landing.customWelcomeText || "",
      customThankYouText: landing.customThankYouText || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: LandingFormData) => {
    if (editingLanding) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const copyLandingUrl = (slug: string) => {
    const url = `${window.location.origin}/badge/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiato", description: url });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-school-badges-title">
            Gestione Badge Scuole
          </h1>
          <p className="text-muted-foreground">
            Crea e gestisci landing page per la richiesta di badge scolastici
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-landing">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Landing
        </Button>
      </motion.div>

      {landings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nessuna landing page</h3>
          <p className="text-muted-foreground mb-4">
            Crea la tua prima landing page per permettere agli studenti di richiedere i badge
          </p>
          <Button onClick={openCreateDialog} data-testid="button-create-first-landing">
            <Plus className="h-4 w-4 mr-2" />
            Crea Landing
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {landings.map((landing, index) => (
            <motion.div
              key={landing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card h-full" data-testid={`card-landing-${landing.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {landing.logoUrl ? (
                        <img src={landing.logoUrl} alt={landing.schoolName} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: landing.primaryColor || "#3b82f6" }}
                        >
                          <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{landing.schoolName}</CardTitle>
                        <CardDescription className="truncate">/{landing.slug}</CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {landing.isActive ? "Attiva" : "Inattiva"}
                    </span>
                    <Switch
                      checked={landing.isActive}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: landing.id, isActive: checked })
                      }
                      disabled={toggleActiveMutation.isPending}
                      data-testid={`switch-active-${landing.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {landing.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{landing.description}</p>
                  )}
                  {landing.authorizedDomains && landing.authorizedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {landing.authorizedDomains.slice(0, 3).map((domain, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          @{domain}
                        </Badge>
                      ))}
                      {landing.authorizedDomains.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{landing.authorizedDomains.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLandingUrl(landing.slug)}
                      data-testid={`button-copy-url-${landing.id}`}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      URL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/badge/${landing.slug}`, "_blank")}
                      data-testid={`button-preview-${landing.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Anteprima
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingLanding(landing)}
                      data-testid={`button-view-requests-${landing.id}`}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Richieste
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(landing)}
                      data-testid={`button-edit-${landing.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingLanding(landing)}
                      data-testid={`button-delete-${landing.id}`}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLanding ? "Modifica Landing" : "Nuova Landing"}</DialogTitle>
            <DialogDescription>
              {editingLanding ? "Modifica i dettagli della landing page" : "Crea una nuova landing page per la richiesta di badge"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Scuola</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Liceo Scientifico Einstein" data-testid="input-school-name" />
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
                      <Input {...field} placeholder="liceo-einstein" data-testid="input-slug" />
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
                              className="w-24 h-24 rounded-lg object-cover border"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={clearLogo}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover-elevate">
                            {isUploadingLogo ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            <span className="text-sm">Carica immagine</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoFileChange}
                              disabled={isUploadingLogo}
                              data-testid="input-logo-file"
                            />
                          </label>
                        </div>
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
                      <Textarea {...field} placeholder="Descrizione della scuola..." data-testid="input-description" />
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
                      <Input {...field} placeholder="scuola.edu.it, liceo.it" data-testid="input-domains" />
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
                      <div className="flex gap-2 items-center">
                        <Input {...field} placeholder="#3b82f6" data-testid="input-primary-color" />
                        <div className="w-10 h-10 rounded-lg border" style={{ backgroundColor: field.value }} />
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
                      <Textarea {...field} placeholder="Benvenuto! Compila il form..." data-testid="input-welcome-text" />
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
                      <Textarea {...field} placeholder="Grazie per la richiesta..." data-testid="input-thankyou-text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-landing"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingLanding ? "Salva" : "Crea"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingLanding} onOpenChange={(open) => !open && setViewingLanding(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Richieste - {viewingLanding?.schoolName}
            </DialogTitle>
            <DialogDescription>
              Gestisci le richieste di badge per questa scuola
            </DialogDescription>
          </DialogHeader>
          {isLoadingRequests ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna richiesta ricevuta
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const status = statusConfig[request.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                        <TableCell>{request.firstName}</TableCell>
                        <TableCell>{request.lastName}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>{request.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.createdAt && format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell>
                          {request.status !== "revoked" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRevokingRequest(request)}
                              data-testid={`button-revoke-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLanding} onOpenChange={(open) => !open && setDeletingLanding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa landing?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Verranno eliminate anche tutte le richieste e i badge associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLanding && deleteMutation.mutate(deletingLanding.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revokingRequest} onOpenChange={(open) => !open && setRevokingRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocare questo badge?</AlertDialogTitle>
            <AlertDialogDescription>
              Il badge di {revokingRequest?.firstName} {revokingRequest?.lastName} verrà revocato e non sarà più valido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokingRequest && revokeMutation.mutate(revokingRequest.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
