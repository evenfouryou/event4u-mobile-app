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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`glass-card p-5 ${isInactive ? 'opacity-60' : ''}`}
      data-testid={`card-supplier-${supplier.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{supplier.name}</h3>
            <Badge 
              variant={supplier.active ? "default" : "secondary"} 
              className="text-xs flex-shrink-0"
            >
              {supplier.active ? 'Attivo' : 'Disattivo'}
            </Badge>
          </div>
          
          {supplier.vatNumber && (
            <p className="text-sm text-muted-foreground mb-2">
              P.IVA: {supplier.vatNumber}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {supplier.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{supplier.email}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{supplier.phone}</span>
              </div>
            )}
          </div>
          
          {supplier.address && (
            <div className="flex items-start gap-1.5 mt-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{supplier.address}</span>
            </div>
          )}
          
          {supplier.notes && (
            <div className="flex items-start gap-1.5 mt-2 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{supplier.notes}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={`button-edit-supplier-${supplier.id}`}
            disabled={!canManage}
            title={!canManage ? "Solo gli admin possono modificare fornitori" : "Modifica"}
            className="rounded-xl"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-supplier-${supplier.id}`}
            disabled={!canManage}
            title={!canManage ? "Solo gli admin possono eliminare fornitori" : "Elimina"}
            className="rounded-xl text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
      toast({
        title: "Successo",
        description: "Fornitore creato con successo",
      });
    },
    onError: (error: Error) => {
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
      toast({
        title: "Successo",
        description: "Fornitore aggiornato con successo",
      });
    },
    onError: (error: Error) => {
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
      toast({
        title: "Successo",
        description: "Fornitore eliminato con successo",
      });
    },
    onError: (error: Error) => {
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

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
      >
        <Link href="/beverage">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl"
            data-testid="button-back-beverage"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Fornitori</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">Gestisci i tuoi fornitori</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          data-testid="button-create-supplier"
          disabled={!canManageSuppliers}
          title={!canManageSuppliers ? "Solo gli admin possono gestire fornitori" : ""}
          className="gradient-golden text-black font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuovo</span>
        </Button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-6"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome o partita IVA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-transparent border-white/10"
            data-testid="input-search-suppliers"
          />
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">
            {searchQuery ? "Nessun fornitore trovato" : "Nessun fornitore configurato"}
          </p>
          {!searchQuery && canManageSuppliers && (
            <p className="text-sm text-muted-foreground">
              Clicca su "Nuovo" per aggiungere il primo fornitore
            </p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          {activeSuppliers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
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
                    delay={0.1 + index * 0.05}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {inactiveSuppliers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
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
                    delay={0.1 + index * 0.05}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass border-white/10 md:w-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Modifica i dati del fornitore' : 'Inserisci i dati del nuovo fornitore'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Nome fornitore" 
                          data-testid="input-supplier-name"
                          className="bg-white/5 border-white/10"
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
                      <FormLabel>Partita IVA</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''} 
                          placeholder="IT12345678901" 
                          data-testid="input-supplier-vat"
                          className="bg-white/5 border-white/10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''} 
                          type="email" 
                          placeholder="info@fornitore.it" 
                          data-testid="input-supplier-email"
                          className="bg-white/5 border-white/10"
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
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''} 
                          placeholder="+39 02 1234567" 
                          data-testid="input-supplier-phone"
                          className="bg-white/5 border-white/10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        placeholder="Via, Città, CAP" 
                        rows={2} 
                        data-testid="input-supplier-address"
                        className="bg-white/5 border-white/10 resize-none"
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
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder="Note aggiuntive..." 
                        rows={3} 
                        data-testid="input-supplier-notes"
                        className="bg-white/5 border-white/10 resize-none"
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
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded"
                        data-testid="checkbox-supplier-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Fornitore attivo</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-supplier"
                  className="border-white/10"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-supplier"
                  className="gradient-golden text-black font-semibold"
                >
                  {editingSupplier ? 'Aggiorna' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il fornitore <strong>{deletingSupplier?.name}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              data-testid="button-cancel-delete-supplier"
              className="border-white/10"
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-supplier"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
