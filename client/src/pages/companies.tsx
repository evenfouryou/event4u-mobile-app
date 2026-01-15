import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      name: '',
      taxId: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      fiscalCode: '',
      active: true,
      regimeFiscale: 'ordinario',
      isiDefaultRate: '16',
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
      city: company.city || '',
      province: company.province || '',
      postalCode: company.postalCode || '',
      fiscalCode: company.fiscalCode || '',
      active: company.active,
      regimeFiscale: (company as any).regimeFiscale || 'ordinario',
      isiDefaultRate: (company as any).isiDefaultRate || '16',
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
      showBackButton showMenuButton
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

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-companies">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Aziende</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Gestione delle aziende nel sistema' : 'Le tue aziende associate'}
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={handleFabClick} data-testid="button-create-company">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Azienda
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Elenco Aziende</CardTitle>
            <CardDescription>
              {companies?.length || 0} aziende registrate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : companies && companies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>P.IVA</TableHead>
                    <TableHead>Indirizzo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-taxid-${company.id}`}>
                        {company.taxId || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-address-${company.id}`}>
                        <div className="flex items-center gap-2 max-w-xs">
                          {company.address ? (
                            <>
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{company.address}</span>
                            </>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Attiva
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inattiva</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(company)}
                            data-testid={`button-edit-company-${company.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(company.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-company-${company.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  {isSuperAdmin ? 'Nessuna azienda presente' : 'Nessuna azienda associata al tuo account'}
                </p>
                {isSuperAdmin && (
                  <Button onClick={handleFabClick} data-testid="button-create-first-company">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Prima Azienda
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Modifica Azienda' : 'Nuova Azienda'}</DialogTitle>
              <DialogDescription>
                {editingCompany ? 'Modifica i dettagli dell\'azienda' : 'Inserisci i dettagli della nuova azienda'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Azienda</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-company-name" />
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
                      <FormLabel>P.IVA / Codice Fiscale</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} data-testid="input-company-taxid" />
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
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          className="resize-none"
                          data-testid="input-company-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comune</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="Es: Roma" data-testid="input-company-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="Es: RM" maxLength={2} data-testid="input-company-province" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAP</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="Es: 00100" maxLength={5} data-testid="input-company-cap" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="fiscalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Fiscale Azienda</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Es: 12345678901" maxLength={16} data-testid="input-company-fiscalcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sezione Regime Fiscale IVA */}
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium text-sm">Regime Fiscale IVA (DPR 633/72)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="regimeFiscale"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regime IVA</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'ordinario'}>
                            <FormControl>
                              <SelectTrigger data-testid="select-company-regime-fiscale">
                                <SelectValue placeholder="Seleziona regime" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ordinario">Ordinario (100% base imponibile)</SelectItem>
                              <SelectItem value="forfettario">Forfettario (50% base imponibile)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Forfettario: volume affari &lt; €25.822
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isiDefaultRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aliquota ISI Default (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={field.value ?? '16'} 
                              placeholder="16"
                              data-testid="input-company-isi-rate" 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            16% standard per intrattenimenti
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Attiva</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          L'azienda può operare nel sistema
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-company-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    data-testid="button-cancel-company"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-company"
                  >
                    {editingCompany ? 'Aggiorna' : 'Crea'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteCompanyId} onOpenChange={(open) => !open && setDeleteCompanyId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare questa azienda? Questa azione non può essere annullata.
                Se l'azienda ha dati collegati (utenti, eventi, etc.), l'eliminazione non sarà possibile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-company">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-confirm-delete-company"
              >
                {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

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
                  {isSuperAdmin && (
                    <HapticButton
                      variant="outline"
                      onClick={() => handleDeleteClick(company.id)}
                      className="h-12 w-12 rounded-xl text-destructive hover:text-destructive"
                      data-testid={`button-delete-company-${company.id}`}
                      hapticType="medium"
                    >
                      <Trash2 className="h-4 w-4" />
                    </HapticButton>
                  )}
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
            <p className="text-muted-foreground text-lg mb-6">
              {isSuperAdmin ? 'Nessuna azienda presente' : 'Nessuna azienda associata al tuo account'}
            </p>
            {isSuperAdmin && (
              <HapticButton 
                onClick={handleFabClick} 
                className="gradient-golden text-black font-semibold h-12 px-6 rounded-xl"
                data-testid="button-create-first-company"
                hapticType="medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crea Prima Azienda
              </HapticButton>
            )}
          </motion.div>
        )}
      </div>

      {isSuperAdmin && (
        <FloatingActionButton
          onClick={handleFabClick}
          className="gradient-golden"
          data-testid="button-create-company"
        >
          <Plus className="h-6 w-6 text-black" />
        </FloatingActionButton>
      )}

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Comune</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''} 
                          placeholder="Roma"
                          className="h-12 rounded-xl text-base"
                          data-testid="input-company-city" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Prov.</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''} 
                          placeholder="RM"
                          maxLength={2}
                          className="h-12 rounded-xl text-base"
                          data-testid="input-company-province" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">CAP</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''} 
                          placeholder="00100"
                          maxLength={5}
                          className="h-12 rounded-xl text-base"
                          data-testid="input-company-cap" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fiscalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Codice Fiscale Azienda</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder="12345678901"
                        maxLength={16}
                        className="h-12 rounded-xl text-base"
                        data-testid="input-company-fiscalcode" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sezione Regime Fiscale IVA - Mobile */}
              <div className="space-y-4 rounded-2xl border p-4">
                <h4 className="font-medium text-base">Regime Fiscale IVA</h4>
                <FormField
                  control={form.control}
                  name="regimeFiscale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Regime IVA</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'ordinario'}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl text-base" data-testid="select-company-regime-fiscale-mobile">
                            <SelectValue placeholder="Seleziona regime" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ordinario">Ordinario (100%)</SelectItem>
                          <SelectItem value="forfettario">Forfettario (50%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Forfettario: volume affari &lt; €25.822
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isiDefaultRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Aliquota ISI Default (%)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={field.value ?? '16'} 
                          placeholder="16"
                          className="h-12 rounded-xl text-base"
                          data-testid="input-company-isi-rate-mobile" 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        16% standard per intrattenimenti
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
