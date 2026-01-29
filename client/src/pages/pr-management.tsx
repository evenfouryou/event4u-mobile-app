import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Check,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { Separator } from "@/components/ui/separator";

interface SearchedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  phonePrefix: string | null;
  phoneWithoutPrefix: string | null;
  role: string | null;
  isAlreadyPr: boolean;
  source?: 'user' | 'customer';
  customerId?: string;
  identityId?: string;
}

interface PrProfile {
  id: string;
  userId: string;
  companyId: string;
  prCode: string;
  phone: string;
  phonePrefix?: string;
  firstName?: string;
  lastName?: string;
  commissionPercentage: string | number; // Decimal comes as string from DB
  commissionFixedPerPerson: string | number; // Decimal comes as string from DB
  totalEarnings: string | number;
  pendingEarnings: string | number;
  paidEarnings: string | number;
  isActive: boolean;
  isStaff?: boolean;
  displayName?: string | null;
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
  isStaff: z.boolean().optional(),
  displayName: z.string().optional(),
});

type CreatePrFormData = z.infer<typeof createPrFormSchema>;
type EditPrFormData = z.infer<typeof editPrFormSchema>;

export default function PrManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PrProfile | null>(null);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);
  const [createMode, setCreateMode] = useState<'search' | 'manual'>('search');

  const canManagePr = user?.role === 'gestore' || user?.role === 'super_admin';

  const { data: prProfiles = [], isLoading, refetch } = useQuery<PrProfile[]>({
    queryKey: ["/api/reservations/pr-profiles", { includeStaff: true }],
    queryFn: async () => {
      const res = await fetch("/api/reservations/pr-profiles?includeStaff=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch PR profiles");
      return res.json();
    },
    enabled: canManagePr,
  });

  const { data: searchedUsers = [], isFetching: isSearching } = useQuery<SearchedUser[]>({
    queryKey: ["/api/reservations/search-users", phoneSearchQuery],
    queryFn: async () => {
      if (phoneSearchQuery.length < 5) return [];
      const res = await fetch(`/api/reservations/search-users?phone=${encodeURIComponent(phoneSearchQuery)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: phoneSearchQuery.length >= 5,
  });

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return prProfiles;
    const query = searchQuery.toLowerCase().replace(/\s/g, '');
    return prProfiles.filter((pr) => {
      const fullName = `${pr.user?.firstName || pr.firstName || ''} ${pr.user?.lastName || pr.lastName || ''}`.toLowerCase();
      const fullPhone = `${pr.phonePrefix || '+39'}${pr.phone}`.replace(/\s/g, '');
      return fullName.includes(query) ||
        fullPhone.includes(query) ||
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
    mutationFn: async (data: CreatePrFormData & { existingUserId?: string }) => {
      const response = await apiRequest("POST", "/api/reservations/pr-profiles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setSelectedUsers([]);
      setPhoneSearchQuery("");
      toast({
        title: "PR Creato",
        description: "Il profilo PR è stato creato",
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

  // Mutation for promoting multiple users to PR
  const promoteMultipleMutation = useMutation({
    mutationFn: async (usersToPromote: SearchedUser[]) => {
      const results = await Promise.allSettled(
        usersToPromote.map(async (u) => {
          // Extract phone number properly - handle all formats
          let phoneNumber = u.phoneWithoutPrefix;
          if (!phoneNumber && u.phone) {
            // Clean phone and remove prefix patterns
            let cleaned = u.phone.replace(/[\s\-\(\)]/g, '');
            // Remove +XX, +XXX, +XXXX prefixes
            if (cleaned.startsWith('+')) {
              cleaned = cleaned.replace(/^\+\d{1,4}/, '');
            }
            // Remove 0039 prefix
            else if (cleaned.startsWith('0039')) {
              cleaned = cleaned.slice(4);
            }
            // Remove 39 prefix if phone is longer than 10 digits
            else if (cleaned.startsWith('39') && cleaned.length > 10) {
              cleaned = cleaned.slice(2);
            }
            phoneNumber = cleaned.replace(/\D/g, '');
          }
          
          console.log(`[PR Promote] User: ${u.firstName} ${u.lastName}, phone: ${u.phone}, phoneWithoutPrefix: ${u.phoneWithoutPrefix}, extracted: ${phoneNumber}, source: ${u.source}`);
          
          const response = await apiRequest("POST", "/api/reservations/pr-profiles", {
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            phonePrefix: u.phonePrefix || '+39',
            phone: phoneNumber || '',
            existingUserId: u.source === 'user' ? u.id : undefined,
            existingCustomerId: u.source === 'customer' ? u.customerId || u.id : undefined,
            identityId: u.identityId,
          });
          return response.json();
        })
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/pr-profiles"] });
      setIsCreateDialogOpen(false);
      setSelectedUsers([]);
      setPhoneSearchQuery("");
      toast({
        title: "PR Creati",
        description: failed > 0 
          ? `${succeeded} PR creati, ${failed} errori`
          : `${succeeded} clienti promossi a PR`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la promozione",
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
      isStaff: pr.isStaff ?? false,
      displayName: pr.displayName ?? '',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{pr.phonePrefix || '+39'}{pr.phone}</span>
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
                          {pr.phonePrefix || '+39'}{pr.phone}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          setSelectedUsers([]);
          setPhoneSearchQuery("");
          setCreateMode('search');
          createForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuovo PR</DialogTitle>
            <DialogDescription>
              Scegli come aggiungere nuovi PR.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={createMode === 'search' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setCreateMode('search');
                  setSelectedUsers([]);
                  createForm.reset();
                }}
                data-testid="button-mode-search"
              >
                <Search className="h-4 w-4 mr-2" />
                Cerca Clienti
              </Button>
              <Button
                type="button"
                variant={createMode === 'manual' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setCreateMode('manual');
                  setSelectedUsers([]);
                  setPhoneSearchQuery("");
                  createForm.reset();
                }}
                data-testid="button-mode-manual"
              >
                <Plus className="h-4 w-4 mr-2" />
                Inserimento Manuale
              </Button>
            </div>
            
            {createMode === 'search' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Cerca clienti per telefono (selezione multipla)
                </Label>
                <Input
                  placeholder="Inserisci numero telefono (min 5 cifre)..."
                  value={phoneSearchQuery}
                  onChange={(e) => setPhoneSearchQuery(e.target.value)}
                  data-testid="input-search-customer-phone"
                />
                {isSearching && (
                  <p className="text-sm text-muted-foreground">Ricerca in corso...</p>
                )}
                {searchedUsers.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {searchedUsers.map((u) => {
                      const isSelected = selectedUsers.some(s => s.id === u.id);
                      return (
                        <div
                          key={u.id}
                          className={`p-2 hover-elevate cursor-pointer flex items-center justify-between ${
                            u.isAlreadyPr ? 'opacity-50' : ''
                          } ${isSelected ? 'bg-primary/10' : ''}`}
                          onClick={() => {
                            if (!u.isAlreadyPr) {
                              if (isSelected) {
                                setSelectedUsers(prev => prev.filter(s => s.id !== u.id));
                              } else {
                                setSelectedUsers(prev => [...prev, u]);
                              }
                            }
                          }}
                          data-testid={`button-select-user-${u.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium">{u.firstName} {u.lastName}</p>
                              <p className="text-sm text-muted-foreground">{u.phone}</p>
                            </div>
                          </div>
                          {u.isAlreadyPr && (
                            <Badge variant="secondary">Già PR</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {phoneSearchQuery.length >= 5 && searchedUsers.length === 0 && !isSearching && (
                  <p className="text-sm text-muted-foreground">Nessun cliente trovato. Usa "Inserimento Manuale" per creare un nuovo PR.</p>
                )}
              </div>
            )}
            
            {createMode === 'search' && selectedUsers.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Clienti selezionati: {selectedUsers.length}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUsers([])}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Deseleziona tutti
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedUsers.map(u => (
                    <Badge key={u.id} variant="secondary" className="gap-1">
                      {u.firstName} {u.lastName}
                      <XCircle 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUsers(prev => prev.filter(s => s.id !== u.id));
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
          </div>
          
          {/* When customers selected from search - show confirm button */}
          {createMode === 'search' && selectedUsers.length > 0 && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button 
                onClick={() => promoteMultipleMutation.mutate(selectedUsers)}
                disabled={promoteMultipleMutation.isPending} 
                data-testid="button-submit-create-pr"
              >
                {promoteMultipleMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Promuovendo...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Promuovi {selectedUsers.length} a PR
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
          
          {/* Show form fields only in manual mode */}
          {createMode === 'manual' && (
            <>
              <Separator />
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((data) => 
                  createPrMutation.mutate(data)
                )} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                    Le credenziali saranno inviate automaticamente via SMS.
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
            </>
          )}
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

                <div className="border-t pt-4 mt-4">
                  <FormField
                    control={editForm.control}
                    name="isStaff"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Abilita Account Staff
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Consente al PR di accedere come Staff
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-staff"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {editForm.watch("isStaff") && (
                    <FormField
                      control={editForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Nome Staff</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome visualizzato come Staff"
                              {...field}
                              value={field.value ?? ''}
                              data-testid="input-staff-display-name"
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            Il nome che verrà mostrato quando accede come Staff
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
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
