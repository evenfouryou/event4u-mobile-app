import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "react-i18next";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Truck, Edit, Trash2, Search, ArrowLeft, Mail, Phone, MapPin, FileText } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier, type InsertSupplier } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { t } = useTranslation();
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
              {supplier.active ? t('suppliers.activeStatus') : t('suppliers.inactiveStatus')}
            </Badge>
          </div>
          
          {supplier.vatNumber && (
            <p className="text-base text-muted-foreground mb-3">
              {t('suppliers.vatPrefix')}: {supplier.vatNumber}
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
          <span>{t('common.edit')}</span>
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
          <span>{t('common.delete')}</span>
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
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
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
        title: t('common.success'),
        description: t('suppliers.createSuccess'),
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('common.unauthorized'),
          description: t('common.loginAgain'),
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('suppliers.createError'),
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
        title: t('common.success'),
        description: t('suppliers.updateSuccess'),
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('common.unauthorized'),
          description: t('common.loginAgain'),
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('suppliers.updateError'),
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
        title: t('common.success'),
        description: t('suppliers.deleteSuccess'),
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('common.unauthorized'),
          description: t('common.loginAgain'),
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('suppliers.deleteError'),
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

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('suppliers.nameRequired')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder={t('suppliers.namePlaceholder')} 
                  data-testid="input-supplier-name"
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
              <FormLabel>{t('suppliers.vatNumber')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value ?? ''} 
                  placeholder={t('suppliers.vatPlaceholder')} 
                  data-testid="input-supplier-vat"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('suppliers.email')}</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    value={field.value ?? ''} 
                    type="email" 
                    placeholder={t('suppliers.emailPlaceholder')} 
                    data-testid="input-supplier-email"
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
                <FormLabel>{t('suppliers.phone')}</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    value={field.value ?? ''} 
                    placeholder={t('suppliers.phonePlaceholder')} 
                    data-testid="input-supplier-phone"
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
              <FormLabel>{t('suppliers.address')}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value ?? ''} 
                  placeholder={t('suppliers.addressPlaceholder')} 
                  rows={2} 
                  data-testid="input-supplier-address"
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
              <FormLabel>{t('suppliers.notes')}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value ?? ''} 
                  placeholder={t('suppliers.notesPlaceholder')} 
                  rows={2} 
                  data-testid="input-supplier-notes"
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
                  className="h-5 w-5 rounded"
                  data-testid="checkbox-supplier-active"
                />
              </FormControl>
              <FormLabel className="!mt-0">{t('suppliers.supplierActive')}</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            data-testid="button-cancel-supplier"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-submit-supplier"
          >
            {createMutation.isPending || updateMutation.isPending ? t('suppliers.saving') : 
              editingSupplier ? t('suppliers.saveChanges') : t('suppliers.createSupplier')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-suppliers">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('suppliers.title')}</h1>
            <p className="text-muted-foreground">{t('suppliers.companyManagement')}</p>
          </div>
          {canManageSuppliers && (
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-supplier">
              <Plus className="w-4 h-4 mr-2" />
              {t('suppliers.newSupplier')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t('suppliers.totalSuppliers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{activeSuppliers.length}</div>
              <p className="text-sm text-muted-foreground">{t('suppliers.activeSuppliers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{inactiveSuppliers.length}</div>
              <p className="text-sm text-muted-foreground">{t('suppliers.deactivated')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">
                {suppliers?.filter(s => s.email).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">{t('suppliers.withEmail')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t('suppliers.supplierList')}</CardTitle>
                <CardDescription>{t('suppliers.manageSuppliers')}</CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('suppliers.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-suppliers"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  {searchQuery ? t('suppliers.noSuppliers') : t('suppliers.noSuppliersConfigured')}
                </p>
                {!searchQuery && canManageSuppliers && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('suppliers.clickNewSupplier')}
                  </p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('suppliers.vatNumber')}</TableHead>
                    <TableHead>{t('suppliers.email')}</TableHead>
                    <TableHead>{t('suppliers.phone')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                            <Truck className="h-4 w-4 text-white" />
                          </div>
                          <span>{supplier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.vatNumber || '-'}</TableCell>
                      <TableCell>
                        {supplier.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{supplier.email}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{supplier.phone}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.active ? "default" : "secondary"}>
                          {supplier.active ? t('suppliers.activeStatus') : t('suppliers.inactiveStatus')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(supplier)}
                            disabled={!canManageSuppliers}
                            data-testid={`button-edit-supplier-${supplier.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingSupplier(supplier)}
                            disabled={!canManageSuppliers}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-supplier-${supplier.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.newSupplier')}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier ? t('suppliers.editSupplierDesc') : t('suppliers.newSupplierDesc')}
              </DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingSupplier} onOpenChange={(open) => !open && setDeletingSupplier(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('suppliers.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('suppliers.confirmDeleteDesc', { name: deletingSupplier?.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const headerContent = (
    <MobileHeader
      title={t('suppliers.title')}
      subtitle={t('suppliers.supplierCount', { count: suppliers?.length ?? 0 })}
      showBackButton showMenuButton
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
            placeholder={t('suppliers.searchPlaceholder')}
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
            {searchQuery ? t('suppliers.noSuppliers') : t('suppliers.noSuppliersConfigured')}
          </p>
          {!searchQuery && canManageSuppliers && (
            <p className="text-base text-muted-foreground">
              {t('suppliers.tapToAdd')}
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
                {t('suppliers.activeSuppliersCount', { count: activeSuppliers.length })}
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
                {t('suppliers.deactivatedSuppliersCount', { count: inactiveSuppliers.length })}
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
              {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.newSupplier')}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editingSupplier ? t('suppliers.editSupplierDesc') : t('suppliers.newSupplierDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('suppliers.nameRequired')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t('suppliers.namePlaceholder')} 
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
                    <FormLabel className="text-base">{t('suppliers.vatNumber')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder={t('suppliers.vatPlaceholder')} 
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
                    <FormLabel className="text-base">{t('suppliers.email')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        type="email" 
                        placeholder={t('suppliers.emailPlaceholder')} 
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
                    <FormLabel className="text-base">{t('suppliers.phone')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder={t('suppliers.phonePlaceholder')} 
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
                    <FormLabel className="text-base">{t('suppliers.address')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder={t('suppliers.addressPlaceholder')} 
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
                    <FormLabel className="text-base">{t('suppliers.notes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ''} 
                        placeholder={t('suppliers.notesPlaceholder')} 
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
                    <FormLabel className="!mt-0 text-base">{t('suppliers.supplierActive')}</FormLabel>
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
                  {t('common.cancel')}
                </HapticButton>
                <HapticButton
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-supplier"
                  className="flex-1 h-12 gradient-golden text-black font-semibold rounded-xl text-base"
                  hapticType="medium"
                >
                  {editingSupplier ? t('suppliers.update') : t('suppliers.create')}
                </HapticButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto glass border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{t('suppliers.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t('suppliers.confirmDeleteDesc', { name: deletingSupplier?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              data-testid="button-cancel-delete-supplier"
              className="flex-1 h-12 border-white/10 rounded-xl text-base"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
              data-testid="button-confirm-delete-supplier"
              className="flex-1 h-12 bg-destructive text-destructive-foreground rounded-xl text-base"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
