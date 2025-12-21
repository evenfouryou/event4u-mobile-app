import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Truck, Edit, Trash2, Search, ArrowLeft, Mail, Phone, MapPin, FileText } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier, type InsertSupplier } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  FloatingActionButton,
  triggerHaptic 
} from "@/components/mobile-primitives";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

function SupplierCard({
  supplier,
  onEdit,
  onDelete,
  canManage,
  delay = 0,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
  delay?: number;
}) {
  const isInactive = !supplier.active;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springTransition, delay }}
      whileTap={{ scale: 0.98 }}
      className={`glass-card p-6 ${isInactive ? 'opacity-60' : ''}`}
      data-testid={`card-supplier-${supplier.id}`}
    >
      <div className="flex items-start gap-4">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springTransition, delay: delay + 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg"
        >
          <Truck className="h-8 w-8 text-white" />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-xl truncate">{supplier.name}</h3>
            <Badge 
              variant={supplier.active ? "default" : "secondary"} 
              className="text-xs flex-shrink-0"
            >
              {supplier.active ? 'Attivo' : 'Disattivo'}
            </Badge>
          </div>
          
          {supplier.vatNumber && (
            <p className="text-base text-muted-foreground mb-3">
              P.IVA: {supplier.vatNumber}
            </p>
          )}
          
          <div className="space-y-2">
            {supplier.email && (
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{supplier.email}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{supplier.address}</span>
              </div>
            )}
            {supplier.notes && (
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{supplier.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
        className="flex gap-3 mt-4 pt-4 border-t border-white/10"
      >
        <HapticButton
          variant="ghost"
          onClick={() => {
            triggerHaptic('light');
            onEdit();
          }}
          data-testid={`button-edit-supplier-${supplier.id}`}
          disabled={!canManage}
          className="flex-1 h-12 rounded-xl gap-2"
          hapticType="light"
        >
          <Edit className="h-5 w-5" />
          <span>Modifica</span>
        </HapticButton>
        <HapticButton
          variant="ghost"
          onClick={() => {
            triggerHaptic('medium');
            onDelete();
          }}
          data-testid={`button-delete-supplier-${supplier.id}`}
          disabled={!canManage}
          className="flex-1 h-12 rounded-xl gap-2 text-destructive hover:text-destructive"
          hapticType="medium"
        >
          <Trash2 className="h-5 w-5" />
          <span>Elimina</span>
        </HapticButton>
      </motion.div>
    </motion.div>
  );
}

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  const canManageSuppliers = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: '',
      vatNumber: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      active: true,
      companyId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      await apiRequest('POST', '/api/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDialogOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Fornitore creato con successo",
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
        description: "Impossibile creare il fornitore",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      await apiRequest('PATCH', `/api/suppliers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Fornitore aggiornato con successo",
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
        description: "Impossibile aggiornare il fornitore",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDeletingSupplier(null);
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Fornitore eliminato con successo",
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
        description: "Impossibile eliminare il fornitore",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (supplier?: Supplier) => {
    triggerHaptic('light');
    if (supplier) {
      setEditingSupplier(supplier);
      form.reset({
        name: supplier.name,
        vatNumber: supplier.vatNumber ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
        active: supplier.active,
        companyId: supplier.companyId,
      });
    } else {
      setEditingSupplier(null);
      form.reset({
        name: '',
        vatNumber: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        active: true,
        companyId: '',
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (data: InsertSupplier) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    
    return suppliers.filter(supplier => {
      const matchesSearch = !searchQuery || 
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.vatNumber && supplier.vatNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [suppliers, searchQuery]);

  const activeSuppliers = filteredSuppliers.filter(s => s.active);
  const inactiveSuppliers = filteredSuppliers.filter(s => !s.active);

  const headerContent = (
    <MobileHeader
      title="Fornitori"
      subtitle={`${suppliers?.length ?? 0} fornitori`}
      leftAction={
        <Link href="/beverage">
          <HapticButton 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-xl"
            data-testid="button-back-beverage"
            hapticType="light"
          >
            <ArrowLeft className="h-6 w-6" />
          </HapticButton>
        </Link>
      }
      rightAction={
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springTransition}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center"
        >
          <Truck className="h-6 w-6 text-white" />
        </motion.div>
      }
    />
  );

  return (
    <MobileAppLayout
      header={headerContent}
      contentClassName="pb-24"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="glass-card p-4 my-4"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome o partita IVA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base bg-transparent border-white/10 rounded-xl"
            data-testid="input-search-suppliers"
          />
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4 px-0">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="glass-card p-12 text-center mt-8"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springTransition, delay: 0.2 }}
            className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6"
          >
            <Truck className="h-10 w-10 text-muted-foreground" />
          </motion.div>
          <p className="text-lg text-muted-foreground mb-2">
            {searchQuery ? "Nessun fornitore trovato" : "Nessun fornitore configurato"}
          </p>
          {!searchQuery && canManageSuppliers && (
            <p className="text-base text-muted-foreground">
              Tocca + per aggiungere il primo fornitore
            </p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          {activeSuppliers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider px-1">
                Fornitori Attivi ({activeSuppliers.length})
              </h2>
              <div className="space-y-4">
                {activeSuppliers.map((supplier, index) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    onEdit={() => handleOpenDialog(supplier)}
                    onDelete={() => setDeletingSupplier(supplier)}
                    canManage={canManageSuppliers}
                    delay={0.1 + index * 0.08}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {inactiveSuppliers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.3 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider px-1">
                Fornitori Disattivati ({inactiveSuppliers.length})
              </h2>
              <div className="space-y-4">
                {inactiveSuppliers.map((supplier, index) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    onEdit={() => handleOpenDialog(supplier)}
                    onDelete={() => setDeletingSupplier(supplier)}
                    canManage={canManageSuppliers}
                    delay={0.1 + index * 0.08}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {canManageSuppliers && (
        <FloatingActionButton
          onClick={() => handleOpenDialog()}
          data-testid="button-create-supplier"
          className="gradient-golden text-black shadow-xl"
          position="bottom-right"
        >
          <Plus className="h-7 w-7" />
        </FloatingActionButton>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editingSupplier ? 'Modifica i dati del fornitore' : 'Inserisci i dati del nuovo fornitore'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Nome *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nome fornitore" 
                        data-testid="input-supplier-name"
                        className="h-12 text-base bg-white/5 border-white/10 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Partita IVA</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder="IT12345678901" 
                        data-testid="input-supplier-vat"
                        className="h-12 text-base bg-white/5 border-white/10 rounded-xl"
                      />
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
                    <FormLabel className="text-base">Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        type="email" 
                        placeholder="info@fornitore.it" 
                        data-testid="input-supplier-email"
                        className="h-12 text-base bg-white/5 border-white/10 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Telefono</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder="+39 02 1234567" 
                        data-testid="input-supplier-phone"
                        className="h-12 text-base bg-white/5 border-white/10 rounded-xl"
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
                        placeholder="Via, Città, CAP" 
                        rows={2} 
                        data-testid="input-supplier-address"
                        className="text-base bg-white/5 border-white/10 resize-none rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Note</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder="Note aggiuntive..." 
                        rows={3} 
                        data-testid="input-supplier-notes"
                        className="text-base bg-white/5 border-white/10 resize-none rounded-xl"
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
                  <FormItem className="flex items-center gap-3 space-y-0 py-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-6 w-6 rounded"
                        data-testid="checkbox-supplier-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 text-base">Fornitore attivo</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-supplier"
                  className="flex-1 h-12 border-white/10 rounded-xl text-base"
                  hapticType="light"
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-supplier"
                  className="flex-1 h-12 gradient-golden text-black font-semibold rounded-xl text-base"
                  hapticType="medium"
                >
                  {editingSupplier ? 'Aggiorna' : 'Crea'}
                </HapticButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto glass border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Sei sicuro di voler eliminare il fornitore <strong>{deletingSupplier?.name}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              data-testid="button-cancel-delete-supplier"
              className="flex-1 h-12 border-white/10 rounded-xl text-base"
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
              data-testid="button-confirm-delete-supplier"
              className="flex-1 h-12 bg-destructive text-destructive-foreground rounded-xl text-base"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
