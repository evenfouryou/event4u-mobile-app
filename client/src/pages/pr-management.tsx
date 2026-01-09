import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Edit,
  UserX,
  Phone,
  Euro,
  Percent,
  Hash,
  Wallet,
  Trash2,
  LogIn,
  RotateCcw,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

interface PrProfile {
  id: string;
  userId: string;
  companyId: string;
  prCode: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  commissionPercentage: string | number; // Decimal comes as string from DB
  commissionFixedPerPerson: string | number; // Decimal comes as string from DB
  totalEarnings: string | number;
  pendingEarnings: string | number;
  paidEarnings: string | number;
  isActive: boolean;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

// Helper to safely convert decimal strings to numbers
const toNumber = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Common international phone prefixes
const PHONE_PREFIXES = [
  { value: '+39', label: '+39 (Italia)' },
  { value: '+1', label: '+1 (USA/Canada)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+33', label: '+33 (Francia)' },
  { value: '+49', label: '+49 (Germania)' },
  { value: '+34', label: '+34 (Spagna)' },
  { value: '+41', label: '+41 (Svizzera)' },
  { value: '+43', label: '+43 (Austria)' },
  { value: '+32', label: '+32 (Belgio)' },
  { value: '+31', label: '+31 (Olanda)' },
];

const createPrFormSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  phonePrefix: z.string().min(2, "Prefisso richiesto").default('+39'),
  phone: z.string().min(9, "Numero troppo corto (min 9 cifre)").max(15).regex(/^[0-9]+$/, "Solo numeri, senza prefisso"),
});

const editPrFormSchema = z.object({
  commissionPercentage: z.coerce.number().min(0, "Valore deve essere positivo").max(100, "Max 100%"),
  commissionFixedPerPerson: z.coerce.number().min(0, "Valore deve essere positivo"),
});

type CreatePrFormData = z.infer<typeof createPrFormSchema>;
type EditPrFormData = z.infer<typeof editPrFormSchema>;

export default function PrManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PrProfile | null>(null);

  const canManagePr = user?.role === 'gestore' || user?.role === 'super_admin';

  const { data: prProfiles = [], isLoading, refetch } = useQuery<PrProfile[]>({
    queryKey: ["/api/reservations/pr-profiles"],
    enabled: canManagePr,
  });

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return prProfiles;
    const query = searchQuery.toLowerCase();
    return prProfiles.filter((pr) => {
      const fullName = `${pr.user?.firstName || pr.firstName || ''} ${pr.user?.lastName || pr.lastName || ''}`.toLowerCase();
      return fullName.includes(query) ||
        pr.phone.includes(query) ||
        pr.prCode.toLowerCase().includes(query);
    });
  }, [prProfiles, searchQuery]);

  const createForm = useForm<CreatePrFormData>({
    resolver: zodResolver(createPrFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phonePrefix: "+39",
      phone: "",
    },
  });

  const editForm = useForm<EditPrFormData>({
    resolver: zodResolver(editPrFormSchema),
    defaultValues: {
      commissionPercentage: 0,
      commissionFixedPerPerson: 0,
    },
  });

  const createPrMutation = useMutation({
    mutationFn: async (data: CreatePrFormData) => {
      const response = await apiRequest("POST", "/api/reservations/pr-profiles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "PR Creato",
        description: "Il profilo PR è stato creato e le credenziali inviate via SMS",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del PR",
        variant: "destructive",
      });
    },
  });

  const updatePrMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditPrFormData }) => {
      const response = await apiRequest("PATCH", `/api/reservations/pr-profiles/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      setIsEditDialogOpen(false);
      setSelectedPr(null);
      toast({
        title: "PR Aggiornato",
        description: "Il profilo PR è stato aggiornato",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const deactivatePrMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reservations/pr-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      toast({
        title: "PR Disattivato",
        description: "Il profilo PR è stato disattivato",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la disattivazione",
        variant: "destructive",
      });
    },
  });

  const resendSmsMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/reservations/pr-profiles/${id}/resend-sms`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "SMS Inviato",
        description: "Le credenziali sono state inviate nuovamente via SMS",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio dell'SMS",
        variant: "destructive",
      });
    },
  });

  const deletePrMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reservations/pr-profiles/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      toast({
        title: "PR Eliminato",
        description: "Il profilo PR è stato eliminato permanentemente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione",
        variant: "destructive",
      });
    },
  });

  const reactivatePrMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/reservations/pr-profiles/${id}`, { isActive: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      toast({
        title: "PR Riattivato",
        description: "Il profilo PR è stato riattivato",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la riattivazione",
        variant: "destructive",
      });
    },
  });

  const impersonatePrMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/reservations/pr-profiles/${id}/impersonate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Impersonazione attivata",
        description: "Stai ora operando come questo PR",
      });
      // Redirect to unified PR app
      window.location.href = "/pr-app";
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'impersonazione",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (pr: PrProfile) => {
    setSelectedPr(pr);
    editForm.reset({
      commissionPercentage: toNumber(pr.commissionPercentage),
      commissionFixedPerPerson: toNumber(pr.commissionFixedPerPerson),
    });
    setIsEditDialogOpen(true);
  };

  const getPrName = (pr: PrProfile) => {
    const firstName = pr.user?.firstName || pr.firstName || '';
    const lastName = pr.user?.lastName || pr.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'N/A';
  };

  const getCommissionLabel = (pr: PrProfile) => {
    const percentage = toNumber(pr.commissionPercentage);
    const fixed = toNumber(pr.commissionFixedPerPerson);
    
    const parts: string[] = [];
    if (percentage > 0) {
      parts.push(`${percentage}%`);
    }
    if (fixed > 0) {
      parts.push(`€${fixed.toFixed(2)}/persona`);
    }
    
    if (parts.length === 0) {
      return "Nessuna commissione";
    }
    return parts.join(" + ");
  };

  if (!canManagePr) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Accesso Non Autorizzato</h3>
            <p className="text-muted-foreground">
              Non hai i permessi per accedere a questa pagina.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const activeCount = prProfiles.filter(p => p.isActive).length;
  const totalEarnings = prProfiles.reduce((sum, p) => sum + toNumber(p.totalEarnings), 0);
  const pendingPayouts = prProfiles.reduce((sum, p) => sum + toNumber(p.pendingEarnings), 0);

  const content = (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Totale PR</p>
                <p className="text-2xl font-bold" data-testid="text-total-pr">{prProfiles.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Attivi</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-active-pr">{activeCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Guadagni Totali</p>
                <p className="text-2xl font-bold text-blue-500" data-testid="text-total-earnings">€{totalEarnings.toFixed(2)}</p>
              </div>
              <Euro className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Da Pagare</p>
                <p className="text-2xl font-bold text-amber-500" data-testid="text-pending-payout">€{pendingPayouts.toFixed(2)}</p>
              </div>
              <Wallet className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">Profili PR</CardTitle>
                {!isMobile && <CardDescription>Gestisci i profili PR della tua azienda</CardDescription>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  data-testid="button-refresh-pr"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-pr" size={isMobile ? "sm" : "default"}>
                  <Plus className="w-4 h-4 mr-1" />
                  {isMobile ? "Nuovo" : "Nuovo PR"}
                </Button>
              </div>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-pr"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nessun PR trovato</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Nessun risultato per la ricerca" : "Crea il tuo primo profilo PR"}
              </p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredProfiles.map((pr) => (
                <Card key={pr.id} data-testid={`card-pr-${pr.id}`} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold truncate">{getPrName(pr)}</span>
                          {pr.isActive ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs shrink-0">
                              Attivo
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs shrink-0">
                              Disattivato
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{pr.phone}</span>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs w-fit">
                            <Hash className="h-3 w-3 mr-1" />
                            {pr.prCode}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Euro className="h-3.5 w-3.5" />
                            <span>{getCommissionLabel(pr)}</span>
                          </div>
                          <div className="flex items-center gap-1 font-medium text-primary">
                            <Euro className="h-3.5 w-3.5" />
                            <span>{toNumber(pr.totalEarnings).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-pr-actions-${pr.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => impersonatePrMutation.mutate(pr.id)}
                            disabled={impersonatePrMutation.isPending || !pr.isActive}
                            data-testid={`button-impersonate-pr-${pr.id}`}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Entra come PR
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resendSmsMutation.mutate(pr.id)}
                            disabled={resendSmsMutation.isPending}
                            data-testid={`button-resend-sms-${pr.id}`}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Reinvia SMS
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEdit(pr)}
                            data-testid={`button-edit-pr-${pr.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {pr.isActive ? (
                            <DropdownMenuItem
                              onClick={() => deactivatePrMutation.mutate(pr.id)}
                              disabled={deactivatePrMutation.isPending}
                              className="text-amber-500"
                              data-testid={`button-deactivate-pr-${pr.id}`}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Disattiva
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => reactivatePrMutation.mutate(pr.id)}
                              disabled={reactivatePrMutation.isPending}
                              className="text-green-500"
                              data-testid={`button-reactivate-pr-${pr.id}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Riattiva
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm("Sei sicuro di voler eliminare permanentemente questo PR? Questa azione non può essere annullata.")) {
                                deletePrMutation.mutate(pr.id);
                              }
                            }}
                            disabled={deletePrMutation.isPending}
                            className="text-destructive"
                            data-testid={`button-delete-pr-${pr.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Codice PR</TableHead>
                    <TableHead>Commissione</TableHead>
                    <TableHead className="text-right">Guadagni</TableHead>
                    <TableHead className="text-center">Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((pr) => (
                    <TableRow key={pr.id} data-testid={`row-pr-${pr.id}`}>
                      <TableCell className="font-medium">
                        {getPrName(pr)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {pr.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          <Hash className="h-3 w-3 mr-1" />
                          {pr.prCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          {getCommissionLabel(pr)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{toNumber(pr.totalEarnings).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {pr.isActive ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Attivo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                            Disattivato
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-pr-actions-${pr.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => impersonatePrMutation.mutate(pr.id)}
                              disabled={impersonatePrMutation.isPending || !pr.isActive}
                              data-testid={`button-impersonate-pr-${pr.id}`}
                            >
                              <LogIn className="h-4 w-4 mr-2" />
                              Entra come PR
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => resendSmsMutation.mutate(pr.id)}
                              disabled={resendSmsMutation.isPending}
                              data-testid={`button-resend-sms-${pr.id}`}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Reinvia SMS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(pr)}
                              data-testid={`button-edit-pr-${pr.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {pr.isActive ? (
                              <DropdownMenuItem
                                onClick={() => deactivatePrMutation.mutate(pr.id)}
                                disabled={deactivatePrMutation.isPending}
                                className="text-amber-500"
                                data-testid={`button-deactivate-pr-${pr.id}`}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Disattiva
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => reactivatePrMutation.mutate(pr.id)}
                                disabled={reactivatePrMutation.isPending}
                                className="text-green-500"
                                data-testid={`button-reactivate-pr-${pr.id}`}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Riattiva
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Sei sicuro di voler eliminare permanentemente questo PR? Questa azione non può essere annullata.")) {
                                  deletePrMutation.mutate(pr.id);
                                }
                              }}
                              disabled={deletePrMutation.isPending}
                              className="text-destructive"
                              data-testid={`button-delete-pr-${pr.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo PR</DialogTitle>
            <DialogDescription>
              Crea un nuovo profilo PR. Le credenziali saranno inviate automaticamente via SMS.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createPrMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Mario" {...field} data-testid="input-pr-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input placeholder="Rossi" {...field} data-testid="input-pr-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={createForm.control}
                  name="phonePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefisso</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-pr-phone-prefix">
                            <SelectValue placeholder="+39" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PHONE_PREFIXES.map((prefix) => (
                            <SelectItem key={prefix.value} value={prefix.value}>
                              {prefix.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Numero</FormLabel>
                      <FormControl>
                        <Input placeholder="3381234567" {...field} data-testid="input-pr-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Le commissioni possono essere configurate successivamente modificando il profilo PR.
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={createPrMutation.isPending} data-testid="button-submit-create-pr">
                  {createPrMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crea PR
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica PR</DialogTitle>
            <DialogDescription>
              Modifica le impostazioni di commissione per {selectedPr && getPrName(selectedPr)}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => {
                if (selectedPr) {
                  updatePrMutation.mutate({ id: selectedPr.id, data });
                }
              })}
              className="space-y-4"
            >
              <div className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="commissionPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Commissione Percentuale (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="es. 10 per il 10%"
                          {...field}
                          data-testid="input-edit-commission-percentage"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="commissionFixedPerPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Euro className="h-4 w-4" />
                        Commissione Fissa per Persona (€)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="es. 2 per €2 a persona"
                          {...field}
                          data-testid="input-edit-commission-fixed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  Entrambe le commissioni possono essere applicate insieme.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={updatePrMutation.isPending} data-testid="button-submit-edit-pr">
                  {updatePrMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    "Salva Modifiche"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isMobile) {
    return (
      <MobileAppLayout>
        <MobileHeader title="Gestione PR" />
        <div className="p-4 space-y-4">
          {content}
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione PR</h1>
          <p className="text-muted-foreground">Crea e gestisci i profili PR della tua azienda</p>
        </div>
      </div>
      {content}
    </div>
  );
}
