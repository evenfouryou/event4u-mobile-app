import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Users as UsersIcon, 
  Edit, 
  Trash2, 
  Ban, 
  CheckCircle, 
  LogIn, 
  Settings2, 
  Wine, 
  Calculator, 
  Users as PersonnelIcon, 
  Receipt, 
  FileText,
  ArrowLeft,
  Mail,
  Building2,
  Shield,
  UserCheck,
  UserX
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { User, Company, UserFeatures } from "@shared/schema";

const userFormSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().optional(),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  role: z.enum(['super_admin', 'gestore', 'warehouse', 'bartender']),
  companyId: z.string().optional().nullable(),
  isEditing: z.boolean().optional(),
}).refine((data) => {
  if (!data.isEditing && (!data.password || data.password.length < 8)) {
    return false;
  }
  if (data.isEditing && data.password && data.password.length < 8) {
    return false;
  }
  return true;
}, {
  message: "Password minimo 8 caratteri",
  path: ["password"],
});

type UserFormData = z.infer<typeof userFormSchema>;

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  gestore: 'Gestore',
  warehouse: 'Magazzino',
  bartender: 'Bartender',
};

const roleGradients: Record<string, string> = {
  super_admin: 'from-purple-500 to-indigo-600',
  gestore: 'from-amber-500 to-orange-600',
  warehouse: 'from-blue-500 to-cyan-600',
  bartender: 'from-teal-500 to-emerald-600',
};

interface FeatureConfig {
  key: keyof Omit<UserFeatures, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const featuresList: FeatureConfig[] = [
  { key: 'beverageEnabled', label: 'Beverage', description: 'Gestione stock bevande e consumi', icon: <Wine className="h-4 w-4" /> },
  { key: 'contabilitaEnabled', label: 'Contabilità', description: 'Costi fissi, extra e manutenzioni', icon: <Calculator className="h-4 w-4" /> },
  { key: 'personaleEnabled', label: 'Personale', description: 'Anagrafica staff e pagamenti', icon: <PersonnelIcon className="h-4 w-4" /> },
  { key: 'cassaEnabled', label: 'Cassa', description: 'Settori, postazioni e fondi cassa', icon: <Receipt className="h-4 w-4" /> },
  { key: 'nightFileEnabled', label: 'File della Serata', description: 'Documento integrato per evento', icon: <FileText className="h-4 w-4" /> },
];

const warehouseFeaturesList: FeatureConfig[] = [
  { key: 'canCreateProducts', label: 'Crea Prodotti', description: 'Permesso di creare nuovi prodotti', icon: <Plus className="h-4 w-4" /> },
];

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [selectedUserForFeatures, setSelectedUserForFeatures] = useState<User | null>(null);
  const [localFeatures, setLocalFeatures] = useState<Partial<UserFeatures>>({});
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: currentUser?.role === 'super_admin',
  });

  const { data: userFeatures } = useQuery<UserFeatures>({
    queryKey: [`/api/user-features/${selectedUserForFeatures?.id}`],
    enabled: !!selectedUserForFeatures,
  });

  useEffect(() => {
    if (userFeatures) {
      setLocalFeatures({
        beverageEnabled: userFeatures.beverageEnabled,
        contabilitaEnabled: userFeatures.contabilitaEnabled,
        personaleEnabled: userFeatures.personaleEnabled,
        cassaEnabled: userFeatures.cassaEnabled,
        nightFileEnabled: userFeatures.nightFileEnabled,
        canCreateProducts: userFeatures.canCreateProducts,
      });
    }
  }, [userFeatures]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'gestore';

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: isAdmin ? 'warehouse' : 'gestore',
      companyId: null,
      isEditing: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      await apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Utente creato con successo",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare l'utente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      await apiRequest('PATCH', `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Utente aggiornato con successo",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare l'utente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteUserId(null);
      toast({
        title: "Successo",
        description: "Utente eliminato con successo",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'utente",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/users/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Successo",
        description: variables.isActive ? "Utente riattivato con successo" : "Utente disattivato con successo",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile modificare lo stato dell'utente",
        variant: "destructive",
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('POST', `/api/users/${userId}/impersonate`, {});
    },
    onSuccess: () => {
      toast({
        title: "Impersonificazione attivata",
        description: "Accesso come utente effettuato",
      });
      setTimeout(() => window.location.href = '/', 500);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile impersonificare l'utente",
        variant: "destructive",
      });
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: async (data: { userId: string; features: Partial<UserFeatures> }) => {
      await apiRequest('PUT', `/api/user-features/${data.userId}`, data.features);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-features'] });
      if (selectedUserForFeatures) {
        queryClient.invalidateQueries({ queryKey: [`/api/user-features/${selectedUserForFeatures.id}`] });
      }
      setFeaturesDialogOpen(false);
      toast({
        title: "Successo",
        description: "Moduli aggiornati con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare i moduli",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: UserFormData) => {
    if (editingUser) {
      const updateData: Partial<UserFormData> = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        companyId: data.companyId,
      };
      if (data.password && data.password.trim() !== '') {
        updateData.password = data.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      const { isEditing, ...createData } = data;
      const cleanData = {
        ...createData,
        companyId: createData.companyId === 'null' ? null : createData.companyId,
      };
      createMutation.mutate(cleanData);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email || '',
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role as any,
      companyId: user.companyId,
      isEditing: true,
    });
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingUser(null);
      form.reset({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: isAdmin ? 'warehouse' : 'gestore',
        companyId: null,
        isEditing: false,
      });
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId);
  };

  const handleDeleteConfirm = () => {
    if (deleteUserId) {
      deleteMutation.mutate(deleteUserId);
    }
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return 'N/A';
    const company = companies?.find(c => c.id === companyId);
    return company?.name || 'Sconosciuta';
  };

  const handleOpenFeaturesDialog = (user: User) => {
    setSelectedUserForFeatures(user);
    setLocalFeatures({
      beverageEnabled: true,
      contabilitaEnabled: false,
      personaleEnabled: false,
      cassaEnabled: false,
      nightFileEnabled: false,
      canCreateProducts: false,
    });
    setFeaturesDialogOpen(true);
  };

  const handleToggleFeature = (key: keyof Omit<UserFeatures, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    setLocalFeatures(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveFeatures = () => {
    if (selectedUserForFeatures) {
      updateFeaturesMutation.mutate({
        userId: selectedUserForFeatures.id,
        features: localFeatures,
      });
    }
  };

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.isActive).length || 0;
  const verifiedUsers = users?.filter(u => u.emailVerified).length || 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <Link href="/">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">Gestione Utenti</h1>
              <p className="text-muted-foreground text-sm">Crea e gestisci gli utenti del sistema</p>
            </div>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="gradient-golden text-black font-semibold min-h-[48px] md:min-h-9" data-testid="button-create-user">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Nuovo Utente</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Modifica i dettagli dell\'utente. Lascia la password vuota per non modificarla.' 
                  : 'Inserisci i dettagli del nuovo utente.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-user-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-user-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password {editingUser && '(lascia vuoto per non modificare)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          placeholder={editingUser ? '' : 'Minimo 8 caratteri'}
                          data-testid="input-user-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ruolo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Seleziona ruolo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isSuperAdmin && (
                            <>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="gestore">Gestore</SelectItem>
                            </>
                          )}
                          <SelectItem value="warehouse">Magazzino</SelectItem>
                          <SelectItem value="bartender">Bartender</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isSuperAdmin && (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Azienda</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-user-company">
                              <SelectValue placeholder="Seleziona azienda (opzionale)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Nessuna azienda</SelectItem>
                            {companies?.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    data-testid="button-cancel-user"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="gradient-golden text-black font-semibold"
                    data-testid="button-save-user"
                  >
                    {editingUser ? 'Aggiorna' : 'Crea'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6"
      >
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-users">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Totale</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal" data-testid="text-active-users">{activeUsers}</p>
              <p className="text-xs text-muted-foreground">Attivi</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-verified-users">{verifiedUsers}</p>
              <p className="text-xs text-muted-foreground">Verificati</p>
            </div>
          </div>
        </div>
      </motion.div>

      {usersLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-5 hover:border-primary/30 transition-all"
              data-testid={`card-user-${user.id}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${roleGradients[user.role] || 'from-gray-500 to-gray-600'} flex items-center justify-center shrink-0`}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate" data-testid={`text-user-name-${user.id}`}>
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="shrink-0" data-testid={`badge-role-${user.id}`}>
                    {roleLabels[user.role]}
                  </Badge>
                  {user.isActive ? (
                    <Badge variant="outline" className="text-teal border-teal/30" data-testid={`badge-active-${user.id}`}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Attivo
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs" data-testid={`badge-inactive-${user.id}`}>
                      <UserX className="h-3 w-3 mr-1" />
                      Disattivato
                    </Badge>
                  )}
                  {user.emailVerified && (
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-verified-${user.id}`}>
                      Verificato
                    </Badge>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate" data-testid={`text-company-${user.id}`}>{getCompanyName(user.companyId)}</span>
                  </div>
                )}

                <div className="flex gap-1 pt-2 border-t border-white/5 flex-wrap">
                  {/* Super Admin can manage features for gestori */}
                  {isSuperAdmin && user.role === 'gestore' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenFeaturesDialog(user)}
                      data-testid={`button-features-user-${user.id}`}
                      title="Gestisci Moduli"
                      className="rounded-xl min-w-[44px] min-h-[44px]"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Organizer (gestore) can manage permissions for warehouse users */}
                  {isAdmin && user.role === 'warehouse' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenFeaturesDialog(user)}
                      data-testid={`button-permissions-user-${user.id}`}
                      title="Gestisci Permessi"
                      className="rounded-xl min-w-[44px] min-h-[44px]"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(user)}
                    data-testid={`button-edit-user-${user.id}`}
                    title="Modifica utente"
                    className="rounded-xl min-w-[44px] min-h-[44px]"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.id !== currentUser?.id && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })}
                        data-testid={`button-toggle-active-user-${user.id}`}
                        title={user.isActive ? "Disattiva utente" : "Riattiva utente"}
                        className="rounded-xl min-w-[44px] min-h-[44px]"
                      >
                        {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      {(isSuperAdmin || (isAdmin && user.role !== 'super_admin' && user.role !== 'gestore' && user.companyId === currentUser.companyId)) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => impersonateMutation.mutate(user.id)}
                          data-testid={`button-impersonate-user-${user.id}`}
                          title="Impersonifica utente"
                          className="rounded-xl min-w-[44px] min-h-[44px]"
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteClick(user.id)}
                        data-testid={`button-delete-user-${user.id}`}
                        title="Elimina utente"
                        className="rounded-xl text-destructive hover:text-destructive min-w-[44px] min-h-[44px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2" data-testid="text-no-users">Nessun utente trovato.</p>
          <p className="text-sm text-muted-foreground">Clicca su "Nuovo Utente" per aggiungere il primo utente</p>
        </motion.div>
      )}

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {selectedUserForFeatures?.role === 'warehouse' ? 'Gestione Permessi' : 'Gestione Moduli'}
            </DialogTitle>
            <DialogDescription>
              {selectedUserForFeatures?.firstName} {selectedUserForFeatures?.lastName} - {selectedUserForFeatures?.role === 'warehouse' ? 'Abilita o disabilita i permessi' : 'Attiva o disattiva i moduli disponibili'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {/* Show warehouse permissions for warehouse users */}
            {selectedUserForFeatures?.role === 'warehouse' && warehouseFeaturesList.map((feature) => (
              <div
                key={feature.key}
                className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => handleToggleFeature(feature.key)}
                data-testid={`toggle-feature-${feature.key}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <Label className="text-base font-medium cursor-pointer">{feature.label}</Label>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  checked={!!localFeatures[feature.key]}
                  onCheckedChange={() => handleToggleFeature(feature.key)}
                  data-testid={`switch-feature-${feature.key}`}
                />
              </div>
            ))}
            {/* Show module features for gestori */}
            {selectedUserForFeatures?.role === 'gestore' && featuresList.map((feature) => (
              <div
                key={feature.key}
                className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => handleToggleFeature(feature.key)}
                data-testid={`toggle-feature-${feature.key}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <Label className="text-base font-medium cursor-pointer">{feature.label}</Label>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  checked={!!localFeatures[feature.key]}
                  onCheckedChange={() => handleToggleFeature(feature.key)}
                  data-testid={`switch-feature-${feature.key}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeaturesDialogOpen(false)}
              data-testid="button-cancel-features"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveFeatures}
              disabled={updateFeaturesMutation.isPending}
              className="gradient-golden text-black font-semibold"
              data-testid="button-save-features"
            >
              {updateFeaturesMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
