import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, Edit, Trash2, ArrowLeft, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema, type Company, type InsertCompany } from "@shared/schema";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  FloatingActionButton,
  HapticButton,
  BottomSheet,
  triggerHaptic
} from "@/components/mobile-primitives";

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.08,
    },
  }),
};

export default function Companies() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      name: '',
      taxId: '',
      address: '',
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      await apiRequest('POST', '/api/companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setDialogOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Azienda creata con successo",
      });
    },
    onError: (error: Error) => {
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
        description: "Impossibile creare l'azienda",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      await apiRequest('PATCH', `/api/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Azienda aggiornata con successo",
      });
    },
    onError: (error: Error) => {
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
        description: "Impossibile aggiornare l'azienda",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await apiRequest('DELETE', `/api/companies/${companyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setDeleteCompanyId(null);
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Azienda eliminata con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'azienda",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertCompany) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (company: Company) => {
    triggerHaptic('medium');
    setEditingCompany(company);
    form.reset({
      name: company.name,
      taxId: company.taxId || '',
      address: company.address || '',
      active: company.active,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCompany(null);
    form.reset();
  };

  const handleDeleteClick = (companyId: string) => {
    triggerHaptic('medium');
    setDeleteCompanyId(companyId);
  };

  const handleDeleteConfirm = () => {
    if (deleteCompanyId) {
      deleteMutation.mutate(deleteCompanyId);
    }
  };

  const handleFabClick = () => {
    triggerHaptic('medium');
    setEditingCompany(null);
    form.reset();
    setDialogOpen(true);
  };

  const headerContent = (
    <MobileHeader
      title="Aziende"
      subtitle={companies ? `${companies.length} aziende` : undefined}
      leftAction={
        <Link href="/">
          <HapticButton 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-xl"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </HapticButton>
        </Link>
      }
      rightAction={
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springTransition}
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
        >
          <Building2 className="h-5 w-5 text-white" />
        </motion.div>
      }
    />
  );

  return (
    <MobileAppLayout header={headerContent} contentClassName="pb-24">
      <div className="py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-3xl" />
            ))}
          </div>
        ) : companies && companies.length > 0 ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {companies.map((company, index) => (
              <motion.div 
                key={company.id}
                custom={index}
                variants={cardVariants}
                whileTap={{ scale: 0.98 }}
                className="glass-card rounded-3xl p-5"
                data-testid={`company-card-${company.id}`}
              >
                <div className="flex items-start gap-4">
                  <motion.div 
                    whileTap={{ scale: 0.9 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0"
                  >
                    <Building2 className="h-7 w-7 text-white" />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate">{company.name}</h3>
                        {company.active ? (
                          <span className="text-sm text-teal font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                            Attiva
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Inattiva</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">P.IVA:</span>
                        <span className="text-sm font-medium" data-testid={`text-taxid-${company.id}`}>
                          {company.taxId || 'N/A'}
                        </span>
                      </div>
                      {company.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-address-${company.id}`}>
                            {company.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
                  <HapticButton
                    variant="outline"
                    onClick={() => handleEdit(company)}
                    className="flex-1 h-12 rounded-xl gap-2"
                    data-testid={`button-edit-company-${company.id}`}
                  >
                    <Edit className="h-4 w-4" />
                    Modifica
                  </HapticButton>
                  <HapticButton
                    variant="outline"
                    onClick={() => handleDeleteClick(company.id)}
                    className="h-12 w-12 rounded-xl text-destructive hover:text-destructive"
                    data-testid={`button-delete-company-${company.id}`}
                    hapticType="medium"
                  >
                    <Trash2 className="h-4 w-4" />
                  </HapticButton>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="glass-card rounded-3xl p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-4"
            >
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </motion.div>
            <p className="text-muted-foreground text-lg mb-6">Nessuna azienda presente</p>
            <HapticButton 
              onClick={handleFabClick} 
              className="gradient-golden text-black font-semibold h-12 px-6 rounded-xl"
              data-testid="button-create-first-company"
              hapticType="medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crea Prima Azienda
            </HapticButton>
          </motion.div>
        )}
      </div>

      <FloatingActionButton
        onClick={handleFabClick}
        className="gradient-golden"
        data-testid="button-create-company"
      >
        <Plus className="h-6 w-6 text-black" />
      </FloatingActionButton>

      <BottomSheet
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingCompany ? 'Modifica Azienda' : 'Nuova Azienda'}
      >
        <div className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Nome Azienda</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-company-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">P.IVA / Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-company-taxid" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Indirizzo</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ''} 
                        className="min-h-[100px] rounded-xl text-base resize-none"
                        data-testid="input-company-address" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">Attiva</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        L'azienda può operare nel sistema
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="scale-110"
                        data-testid="switch-company-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  className="flex-1 h-14 rounded-xl text-base"
                  data-testid="button-cancel-company"
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 h-14 rounded-xl text-base gradient-golden text-black font-semibold"
                  data-testid="button-submit-company"
                  hapticType="medium"
                >
                  {editingCompany ? 'Aggiorna' : 'Crea'}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <AlertDialog open={!!deleteCompanyId} onOpenChange={(open) => !open && setDeleteCompanyId(null)}>
        <AlertDialogContent className="rounded-3xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Sei sicuro di voler eliminare questa azienda? Questa azione non può essere annullata.
              Se l'azienda ha dati collegati (utenti, eventi, etc.), l'eliminazione non sarà possibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3">
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-base"
              data-testid="button-confirm-delete-company"
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="w-full h-12 rounded-xl text-base mt-0"
              data-testid="button-cancel-delete-company"
            >
              Annulla
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
