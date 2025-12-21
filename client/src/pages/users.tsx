import { useState, useEffect, useMemo } from "react";
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
  UserX,
  Ticket,
  Search,
  X
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  FloatingActionButton,
  triggerHaptic
} from "@/components/mobile-primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { User, Company, UserFeatures } from "@shared/schema";

const userFormSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().optional(),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  role: z.enum(['super_admin', 'gestore', 'gestore_covisione', 'capo_staff', 'pr', 'warehouse', 'bartender', 'cassiere']),
  companyId: z.string().optional().nullable(),
  phone: z.string().optional(),
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
  gestore_covisione: 'Gestore Covisione',
  capo_staff: 'Capo Staff',
  pr: 'PR',
  warehouse: 'Magazzino',
  bartender: 'Bartender',
  cassiere: 'Cassiere',
  scanner: 'Scanner',
};

const roleGradients: Record<string, string> = {
  super_admin: 'from-purple-500 to-indigo-600',
  gestore: 'from-amber-500 to-orange-600',
  gestore_covisione: 'from-amber-400 to-orange-500',
  capo_staff: 'from-teal-500 to-cyan-600',
  pr: 'from-pink-500 to-rose-600',
  warehouse: 'from-blue-500 to-cyan-600',
  bartender: 'from-teal-500 to-emerald-600',
  cassiere: 'from-green-500 to-emerald-600',
  scanner: 'from-emerald-500 to-green-600',
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
  { key: 'siaeEnabled', label: 'SIAE Biglietteria', description: 'Gestione biglietti e lettore fiscale SIAE', icon: <Ticket className="h-4 w-4" /> },
];

const warehouseFeaturesList: FeatureConfig[] = [
  { key: 'canCreateProducts', label: 'Crea Prodotti', description: 'Permesso di creare nuovi prodotti', icon: <Plus className="h-4 w-4" /> },
];

interface MobileUserCardProps {
  user: User;
  index: number;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  currentUser: User | null | undefined;
  getCompanyName: (companyId: string | null) => string;
  handleEdit: (user: User) => void;
  handleOpenFeaturesDialog: (user: User) => void;
  handleDeleteClick: (userId: string) => void;
  toggleActiveMutation: any;
  impersonateMutation: any;
}

function MobileUserCard({ 
  user, 
  index, 
  isSuperAdmin, 
  isAdmin, 
  currentUser, 
  getCompanyName, 
  handleEdit, 
  handleOpenFeaturesDialog, 
  handleDeleteClick,
  toggleActiveMutation,
  impersonateMutation
}: MobileUserCardProps) {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        delay: index * 0.05 
      }}
      className="glass-card p-4 active:scale-[0.98] transition-transform"
      data-testid={`card-user-${user.id}`}
    >
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarFallback 
            className={`bg-gradient-to-br ${roleGradients[user.role] || 'from-gray-500 to-gray-600'} text-white text-lg font-semibold`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate" data-testid={`text-user-name-${user.id}`}>
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {user.email}
          </p>
          {isSuperAdmin && user.companyId && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span data-testid={`text-company-${user.id}`}>{getCompanyName(user.companyId)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Badge variant="outline" className="shrink-0 text-sm py-1" data-testid={`badge-role-${user.id}`}>
          {roleLabels[user.role]}
        </Badge>
        {user.isActive ? (
          <Badge variant="outline" className="text-teal border-teal/30 text-sm py-1" data-testid={`badge-active-${user.id}`}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Attivo
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-sm py-1" data-testid={`badge-inactive-${user.id}`}>
            <UserX className="h-3.5 w-3.5 mr-1" />
            Disattivato
          </Badge>
        )}
        {user.emailVerified && (
          <Badge variant="secondary" className="text-sm py-1" data-testid={`badge-verified-${user.id}`}>
            Verificato
          </Badge>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-white/5 overflow-x-auto">
        {isSuperAdmin && user.role === 'gestore' && (
          <HapticButton
            size="icon"
            variant="ghost"
            onClick={() => handleOpenFeaturesDialog(user)}
            data-testid={`button-features-user-${user.id}`}
            className="rounded-xl h-11 w-11 shrink-0"
            hapticType="light"
          >
            <Settings2 className="h-5 w-5" />
          </HapticButton>
        )}
        {isAdmin && user.role === 'warehouse' && (
          <HapticButton
            size="icon"
            variant="ghost"
            onClick={() => handleOpenFeaturesDialog(user)}
            data-testid={`button-permissions-user-${user.id}`}
            className="rounded-xl h-11 w-11 shrink-0"
            hapticType="light"
          >
            <Settings2 className="h-5 w-5" />
          </HapticButton>
        )}
        <HapticButton
          size="icon"
          variant="ghost"
          onClick={() => handleEdit(user)}
          data-testid={`button-edit-user-${user.id}`}
          className="rounded-xl h-11 w-11 shrink-0"
          hapticType="light"
        >
          <Edit className="h-5 w-5" />
        </HapticButton>
        {user.id !== currentUser?.id && (
          <>
            <HapticButton
              size="icon"
              variant="ghost"
              onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })}
              data-testid={`button-toggle-active-user-${user.id}`}
              className="rounded-xl h-11 w-11 shrink-0"
              hapticType="medium"
            >
              {user.isActive ? <Ban className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            </HapticButton>
            {(isSuperAdmin || (isAdmin && user.role !== 'super_admin' && user.role !== 'gestore' && currentUser && user.companyId === currentUser.companyId)) && (
              <HapticButton
                size="icon"
                variant="ghost"
                onClick={() => impersonateMutation.mutate(user.id)}
                data-testid={`button-impersonate-user-${user.id}`}
                className="rounded-xl h-11 w-11 shrink-0"
                hapticType="medium"
              >
                <LogIn className="h-5 w-5" />
              </HapticButton>
            )}
            <HapticButton
              size="icon"
              variant="ghost"
              onClick={() => handleDeleteClick(user.id)}
              data-testid={`button-delete-user-${user.id}`}
              className="rounded-xl h-11 w-11 shrink-0 text-destructive hover:text-destructive"
              hapticType="heavy"
            >
              <Trash2 className="h-5 w-5" />
            </HapticButton>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [selectedUserForFeatures, setSelectedUserForFeatures] = useState<User | null>(null);
  const [localFeatures, setLocalFeatures] = useState<Partial<UserFeatures>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
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
        siaeEnabled: userFeatures.siaeEnabled,
        canCreateProducts: userFeatures.canCreateProducts,
      });
    }
  }, [userFeatures]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'gestore';
  const isCapoStaff = currentUser?.role === 'capo_staff';

  const getDefaultRole = () => {
    if (isCapoStaff) return 'pr';
    if (isAdmin) return 'warehouse';
    return 'gestore';
  };

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: getDefaultRole(),
      companyId: null,
      phone: '',
      isEditing: false,
    },
  });

  const watchRole = form.watch('role');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = [...users];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }
    
    if (selectedRole) {
      result = result.filter(user => user.role === selectedRole);
    }
    
    return result;
  }, [users, searchQuery, selectedRole]);

  const availableRoles = useMemo(() => {
    if (!users) return [];
    const roles = new Set(users.map(u => u.role));
    const roleOrder = ['super_admin', 'gestore', 'gestore_covisione', 'capo_staff', 'pr', 'warehouse', 'bartender', 'cassiere', 'scanner'];
    return roleOrder.filter(role => roles.has(role));
  }, [users]);

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      await apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDialogOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Utente creato con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Utente aggiornato con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Utente eliminato con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: variables.isActive ? "Utente riattivato con successo" : "Utente disattivato con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({
        title: "Impersonificazione attivata",
        description: "Accesso come utente effettuato",
      });
      setTimeout(() => window.location.href = '/', 500);
    },
    onError: (error: any) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Moduli aggiornati con successo",
      });
    },
    onError: () => {
      triggerHaptic('error');
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
        phone: data.phone,
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
      phone: (user as any).phone || '',
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
        role: getDefaultRole(),
        companyId: null,
        phone: '',
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

  const header = (
    <MobileHeader
      title="Utenti"
      subtitle={`${filteredUsers.length} ${filteredUsers.length === 1 ? 'utente' : 'utenti'}`}
      leftAction={
        <Link href="/">
          <HapticButton 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-11 w-11"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </HapticButton>
        </Link>
      }
      rightAction={
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <UsersIcon className="h-5 w-5 text-white" />
        </div>
      }
    />
  );

  return (
    <MobileAppLayout header={header} noPadding>
      <div className="px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative mt-4 mb-4"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cerca utenti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 pr-12 text-base rounded-2xl bg-card border-border"
            data-testid="input-search-users"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>

        {availableRoles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.05 }}
            className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide"
          >
            <button
              onClick={() => {
                triggerHaptic('light');
                setSelectedRole(null);
              }}
              className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] ${
                selectedRole === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}
              data-testid="button-filter-all"
            >
              Tutti ({totalUsers})
            </button>
            {availableRoles.map((role) => {
              const count = users?.filter(u => u.role === role).length || 0;
              return (
                <button
                  key={role}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedRole(selectedRole === role ? null : role);
                  }}
                  className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] ${
                    selectedRole === role
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground'
                  }`}
                  data-testid={`button-filter-${role}`}
                >
                  {roleLabels[role]} ({count})
                </button>
              );
            })}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-users">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Totale</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-teal" data-testid="text-active-users">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Attivi</p>
              </div>
            </div>
          </div>
        </motion.div>

        {usersLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, index) => (
                <MobileUserCard 
                  key={user.id} 
                  user={user} 
                  index={index}
                  isSuperAdmin={isSuperAdmin}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  getCompanyName={getCompanyName}
                  handleEdit={handleEdit}
                  handleOpenFeaturesDialog={handleOpenFeaturesDialog}
                  handleDeleteClick={handleDeleteClick}
                  toggleActiveMutation={toggleActiveMutation}
                  impersonateMutation={impersonateMutation}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2" data-testid="text-no-users">
              {searchQuery || selectedRole ? 'Nessun utente trovato.' : 'Nessun utente presente.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedRole 
                ? 'Prova a modificare i filtri di ricerca' 
                : 'Tocca + per aggiungere il primo utente'}
            </p>
          </motion.div>
        )}
      </div>

      <FloatingActionButton
        position="bottom-right"
        onClick={() => {
          form.reset({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            role: getDefaultRole(),
            companyId: null,
            phone: '',
            isEditing: false,
          });
          setEditingUser(null);
          setDialogOpen(true);
        }}
        data-testid="button-create-user"
        className="mb-20"
      >
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
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
                      <Input className="h-12" {...field} data-testid="input-user-firstname" />
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
                      <Input className="h-12" {...field} data-testid="input-user-lastname" />
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
                      <Input type="email" className="h-12" {...field} data-testid="input-user-email" />
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
                        className="h-12"
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
                        <SelectTrigger className="h-12" data-testid="select-user-role">
                          <SelectValue placeholder="Seleziona ruolo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isSuperAdmin && (
                          <>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="gestore">Gestore</SelectItem>
                            <SelectItem value="gestore_covisione">Gestore Covisione</SelectItem>
                            <SelectItem value="capo_staff">Capo Staff</SelectItem>
                            <SelectItem value="pr">PR</SelectItem>
                            <SelectItem value="warehouse">Magazzino</SelectItem>
                            <SelectItem value="bartender">Bartender</SelectItem>
                            <SelectItem value="cassiere">Cassiere</SelectItem>
                          </>
                        )}
                        {isAdmin && (
                          <>
                            <SelectItem value="gestore_covisione">Gestore Covisione</SelectItem>
                            <SelectItem value="capo_staff">Capo Staff</SelectItem>
                            <SelectItem value="pr">PR</SelectItem>
                            <SelectItem value="warehouse">Magazzino</SelectItem>
                            <SelectItem value="bartender">Bartender</SelectItem>
                            <SelectItem value="cassiere">Cassiere</SelectItem>
                          </>
                        )}
                        {isCapoStaff && (
                          <SelectItem value="pr">PR</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchRole === 'pr' && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="+39..." {...field} data-testid="input-user-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                          <SelectTrigger className="h-12" data-testid="select-user-company">
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
              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                  className="flex-1 h-12"
                  data-testid="button-cancel-user"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 h-12 gradient-golden text-black font-semibold"
                  data-testid="button-save-user"
                >
                  {editingUser ? 'Aggiorna' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="max-w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1 h-12" data-testid="button-cancel-delete">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="flex-1 h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
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
            {selectedUserForFeatures?.role === 'warehouse' && warehouseFeaturesList.map((feature) => (
              <div
                key={feature.key}
                className="glass-card p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => handleToggleFeature(feature.key)}
                data-testid={`toggle-feature-${feature.key}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
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
            {selectedUserForFeatures?.role === 'gestore' && featuresList.map((feature) => (
              <div
                key={feature.key}
                className="glass-card p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => handleToggleFeature(feature.key)}
                data-testid={`toggle-feature-${feature.key}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
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
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeaturesDialogOpen(false)}
              className="flex-1 h-12"
              data-testid="button-cancel-features"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveFeatures}
              disabled={updateFeaturesMutation.isPending}
              className="flex-1 h-12 gradient-golden text-black font-semibold"
              data-testid="button-save-features"
            >
              {updateFeaturesMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  );
}
