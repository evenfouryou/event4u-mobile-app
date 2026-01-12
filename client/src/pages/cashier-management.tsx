import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { SiaeCashier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  MobileAppLayout,
  MobileHeader,
  BottomSheet,
  HapticButton,
  FloatingActionButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Printer,
  Loader2,
  CheckCircle2,
  XCircle,
  Store,
  ChevronLeft,
  User,
} from "lucide-react";

interface PrinterAgent {
  id: string;
  name: string;
  status: string;
  lastSeen?: string;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function CashierManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<SiaeCashier | null>(null);
  const [cashierToDelete, setCashierToDelete] = useState<SiaeCashier | null>(null);

  const isGestore = user?.role === "gestore" || user?.role === "super_admin";

  const cashierFormSchema = z.object({
    name: z.string().min(1, t("cashier.validation.nameRequired")),
    username: z.string().min(1, t("cashier.validation.usernameRequired")),
    password: z.string().optional(),
    defaultPrinterAgentId: z.string().optional(),
    isActive: z.boolean().default(true),
  });

  type CashierFormValues = z.infer<typeof cashierFormSchema>;

  const createCashierFormSchema = cashierFormSchema.extend({
    password: z.string().min(6, t("cashier.validation.passwordMinLength")),
  });

  const { data: cashiers, isLoading: cashiersLoading } = useQuery<SiaeCashier[]>({
    queryKey: ["/api/cashiers"],
    enabled: !!user?.companyId && isGestore,
  });

  const { data: printerAgents } = useQuery<PrinterAgent[]>({
    queryKey: ["/api/printers/agents"],
    enabled: !!user?.companyId && isGestore,
  });

  const form = useForm<CashierFormValues>({
    resolver: zodResolver(editingCashier ? cashierFormSchema : createCashierFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      defaultPrinterAgentId: "none",
      isActive: true,
    },
  });

  const createCashierMutation = useMutation({
    mutationFn: async (data: CashierFormValues) => {
      const response = await apiRequest("POST", "/api/cashiers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers"] });
      setIsFormSheetOpen(false);
      setIsFormDialogOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: t("cashier.cashierCreated"),
        description: t("cashier.cashierCreatedSuccess"),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: t("common.error"),
        description: error.message || t("cashier.createError"),
        variant: "destructive",
      });
    },
  });

  const updateCashierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CashierFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/cashiers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers"] });
      setIsFormSheetOpen(false);
      setIsFormDialogOpen(false);
      setEditingCashier(null);
      form.reset();
      triggerHaptic('success');
      toast({
        title: t("cashier.cashierUpdated"),
        description: t("cashier.cashierUpdatedSuccess"),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: t("common.error"),
        description: error.message || t("cashier.updateError"),
        variant: "destructive",
      });
    },
  });

  const deleteCashierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/cashiers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers"] });
      setIsDeleteSheetOpen(false);
      setIsDeleteDialogOpen(false);
      setCashierToDelete(null);
      triggerHaptic('success');
      toast({
        title: t("cashier.cashierDeactivated"),
        description: t("cashier.cashierDeactivatedSuccess"),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: t("common.error"),
        description: error.message || t("cashier.deactivateError"),
        variant: "destructive",
      });
    },
  });

  const handleOpenForm = (cashier?: SiaeCashier, forDesktop = false) => {
    triggerHaptic('light');
    if (cashier) {
      setEditingCashier(cashier);
      form.reset({
        name: cashier.name || "",
        username: cashier.username || "",
        password: "",
        defaultPrinterAgentId: cashier.defaultPrinterAgentId || "none",
        isActive: cashier.isActive,
      });
    } else {
      setEditingCashier(null);
      form.reset({
        name: "",
        username: "",
        password: "",
        defaultPrinterAgentId: "none",
        isActive: true,
      });
    }
    if (forDesktop) {
      setIsFormDialogOpen(true);
    } else {
      setIsFormSheetOpen(true);
    }
  };

  const handleSubmit = (values: CashierFormValues) => {
    triggerHaptic('medium');
    const processedPrinterId = values.defaultPrinterAgentId === "none" ? undefined : values.defaultPrinterAgentId;
    
    if (editingCashier) {
      const updateData: Partial<CashierFormValues> = {
        name: values.name,
        username: values.username,
        isActive: values.isActive,
        defaultPrinterAgentId: processedPrinterId,
      };
      if (values.password) {
        updateData.password = values.password;
      }
      updateCashierMutation.mutate({ id: editingCashier.id, data: updateData });
    } else {
      createCashierMutation.mutate({
        ...values,
        defaultPrinterAgentId: processedPrinterId,
      });
    }
  };

  const handleDeleteConfirm = () => {
    triggerHaptic('heavy');
    if (cashierToDelete) {
      deleteCashierMutation.mutate(cashierToDelete.id);
    }
  };

  const getPrinterName = (agentId: string | null) => {
    if (!agentId) return t("cashier.printerNotAssigned");
    const agent = printerAgents?.find(a => a.id === agentId);
    return agent?.name || t("cashier.printerUnknown");
  };

  if (!isGestore) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader title={t("cashier.accessDenied")} />
        }
      >
        <div className="flex flex-col items-center justify-center h-full px-6 pb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold">{t("cashier.accessDenied")}</h3>
            <p className="text-muted-foreground mt-2">
              {t("cashier.noPermission")}
            </p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  const renderFormContent = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("common.name")}</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Mario Rossi" 
                  {...field} 
                  data-testid="input-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.username")}</FormLabel>
              <FormControl>
                <Input 
                  placeholder="cassiere1"
                  {...field} 
                  disabled={!!editingCashier}
                  data-testid="input-username"
                />
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
                {t("auth.password")} {editingCashier && `(${t("cashier.leaveEmptyToKeep")})`}
              </FormLabel>
              <FormControl>
                <Input 
                  type="password"
                  placeholder={editingCashier ? "••••••••" : t("cashier.minSixChars")} 
                  {...field} 
                  data-testid="input-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultPrinterAgentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("cashier.defaultPrinter")}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-printer">
                    <SelectValue placeholder={t("cashier.selectPrinter")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t("cashier.noPrinter")}</SelectItem>
                  {printerAgents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        {agent.name}
                        {agent.status === "online" && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("common.active")}</FormLabel>
                <p className="text-sm text-muted-foreground">
                  {t("cashier.canAccessSystem")}
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsFormDialogOpen(false);
              setEditingCashier(null);
              form.reset();
            }}
            data-testid="button-cancel"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={createCashierMutation.isPending || updateCashierMutation.isPending}
            data-testid="button-save"
          >
            {(createCashierMutation.isPending || updateCashierMutation.isPending) && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {editingCashier ? t("cashier.saveChanges") : t("cashier.createCashier")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-cashier-management">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("cashier.title")}</h1>
            <p className="text-muted-foreground">{t("cashier.subtitle")}</p>
          </div>
          <Button onClick={() => handleOpenForm(undefined, true)} data-testid="button-add-cashier">
            <UserPlus className="w-4 h-4 mr-2" />
            {t("cashier.newCashier")}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{cashiers?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t("cashier.totalCashiers")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">
                {cashiers?.filter(c => c.isActive).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">{t("cashier.activeCashiers")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {cashiers?.filter(c => !c.isActive).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">{t("cashier.inactiveCashiers")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("cashier.cashierList")}
            </CardTitle>
            <CardDescription>
              {t("cashier.allCashiersRegistered")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cashiersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !cashiers || cashiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">{t("cashier.noCashiers")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("cashier.noCashiersYet")}
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => handleOpenForm(undefined, true)}
                  data-testid="button-add-cashier-empty"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("cashier.addFirstCashier")}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cashier.cashier")}</TableHead>
                    <TableHead>{t("auth.username")}</TableHead>
                    <TableHead>{t("cashier.printer")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashiers.map((cashier) => (
                    <TableRow key={cashier.id} data-testid={`row-cashier-${cashier.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-[#FFD700]" />
                          </div>
                          <span className="font-medium" data-testid={`text-name-${cashier.id}`}>
                            {cashier.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        @{cashier.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Printer className="w-4 h-4" />
                          {getPrinterName(cashier.defaultPrinterAgentId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cashier.isActive ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t("common.active")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("common.inactive")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenForm(cashier, true)}
                            data-testid={`button-edit-cashier-${cashier.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => {
                              setCashierToDelete(cashier);
                              setIsDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-cashier-${cashier.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) {
            setEditingCashier(null);
            form.reset();
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCashier ? t("cashier.editCashier") : t("cashier.newCashier")}
              </DialogTitle>
              <DialogDescription>
                {editingCashier 
                  ? t("cashier.editCashierInfo") 
                  : t("cashier.createNewOperator")}
              </DialogDescription>
            </DialogHeader>
            {renderFormContent()}
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("cashier.deactivateCashierQuestion")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("cashier.deactivateWarning", { name: cashierToDelete?.name })}
                {" "}{t("cashier.cashierNoAccess")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCashierToDelete(null)}>
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDeleteConfirm}
                disabled={deleteCashierMutation.isPending}
              >
                {deleteCashierMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("cashier.deactivate")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={t("cashier.title")}
          showBackButton
          showMenuButton
          leftAction={
            <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-[#FFD700]" />
            </div>
          }
          rightAction={
            <div className="text-xs text-muted-foreground">
              {cashiers?.length || 0} {t("cashier.total")}
            </div>
          }
        />
      }
      contentClassName="pb-24"
    >
      <div className="py-4 space-y-4" data-testid="page-cashier-management">
        {cashiersLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: i * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-2xl flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : !cashiers || cashiers.length === 0 ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
            className="flex flex-col items-center justify-center py-20 px-6"
          >
            <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-center">{t("cashier.noCashiers")}</h3>
            <p className="text-muted-foreground mt-2 text-center">
              {t("cashier.noCashiersYet")}
            </p>
            <HapticButton 
              className="mt-6 min-h-[52px] px-6"
              onClick={() => handleOpenForm()}
              hapticType="medium"
              data-testid="button-add-cashier-empty"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {t("cashier.addFirstCashier")}
            </HapticButton>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {cashiers.map((cashier, index) => (
              <motion.div
                key={cashier.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ ...springTransition, delay: index * 0.05 }}
                layout
              >
                <Card 
                  className="overflow-hidden hover-elevate active:scale-[0.98] transition-transform"
                  data-testid={`card-cashier-${cashier.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 flex items-center justify-center flex-shrink-0"
                        whileTap={{ scale: 0.95 }}
                        transition={springTransition}
                      >
                        <User className="w-8 h-8 text-[#FFD700]" />
                      </motion.div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg truncate" data-testid={`text-name-${cashier.id}`}>
                              {cashier.name}
                            </h3>
                            <p className="text-muted-foreground text-sm truncate">
                              @{cashier.username}
                            </p>
                          </div>
                          
                          {cashier.isActive ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {t("common.active")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-500/20 text-red-400 flex-shrink-0">
                              <XCircle className="w-3 h-3 mr-1" />
                              {t("common.inactive")}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <Printer className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{getPrinterName(cashier.defaultPrinterAgentId)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4">
                          <HapticButton
                            variant="outline"
                            className="flex-1 min-h-[48px]"
                            onClick={() => handleOpenForm(cashier)}
                            hapticType="light"
                            data-testid={`button-edit-cashier-${cashier.id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t("common.edit")}
                          </HapticButton>
                          <HapticButton
                            variant="outline"
                            size="icon"
                            className="min-h-[48px] min-w-[48px] text-red-500 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => {
                              setCashierToDelete(cashier);
                              setIsDeleteSheetOpen(true);
                            }}
                            hapticType="medium"
                            data-testid={`button-delete-cashier-${cashier.id}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </HapticButton>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <FloatingActionButton
        onClick={() => handleOpenForm()}
        data-testid="button-add-cashier"
      >
        <UserPlus className="w-6 h-6" />
      </FloatingActionButton>

      <BottomSheet
        open={isFormSheetOpen}
        onClose={() => {
          setIsFormSheetOpen(false);
          setEditingCashier(null);
          form.reset();
        }}
        title={editingCashier ? t("cashier.editCashier") : t("cashier.newCashier")}
      >
        <div className="p-4 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Mario Rossi" 
                        className="min-h-[48px] text-base"
                        {...field} 
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.username")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="cassiere1"
                        className="min-h-[48px] text-base"
                        {...field} 
                        disabled={!!editingCashier}
                        data-testid="input-username"
                      />
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
                      {t("auth.password")} {editingCashier && `(${t("cashier.leaveEmptyToKeep")})`}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        className="min-h-[48px] text-base"
                        placeholder={editingCashier ? "••••••••" : t("cashier.minSixChars")} 
                        {...field} 
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultPrinterAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("cashier.defaultPrinter")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="min-h-[48px] text-base" data-testid="select-printer">
                          <SelectValue placeholder={t("cashier.selectPrinter")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("cashier.noPrinter")}</SelectItem>
                        {printerAgents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <div className="flex items-center gap-2">
                              <Printer className="w-4 h-4" />
                              {agent.name}
                              {agent.status === "online" && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("cashier.printerForTickets")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("common.active")}</FormLabel>
                      <FormDescription>
                        {t("cashier.canAccessSystem")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          triggerHaptic('light');
                          field.onChange(checked);
                        }}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 min-h-[52px]"
                  onClick={() => {
                    setIsFormSheetOpen(false);
                    setEditingCashier(null);
                    form.reset();
                  }}
                  hapticType="light"
                  data-testid="button-cancel"
                >
                  {t("common.cancel")}
                </HapticButton>
                <HapticButton
                  type="submit"
                  className="flex-1 min-h-[52px]"
                  disabled={createCashierMutation.isPending || updateCashierMutation.isPending}
                  hapticType="medium"
                  data-testid="button-save"
                >
                  {(createCashierMutation.isPending || updateCashierMutation.isPending) && (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  )}
                  {editingCashier ? t("common.save") : t("cashier.create")}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isDeleteSheetOpen}
        onClose={() => {
          setIsDeleteSheetOpen(false);
          setCashierToDelete(null);
        }}
        title={t("cashier.deactivateCashierQuestion")}
      >
        <div className="p-4 pb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
            className="text-center mb-6"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-muted-foreground">
              {t("cashier.deactivateWarning", { name: "" })}
              <strong className="text-foreground">{cashierToDelete?.name}</strong>.
              {" "}{t("cashier.cashierNoAccess")}
            </p>
          </motion.div>
          
          <div className="flex gap-3">
            <HapticButton
              variant="outline"
              className="flex-1 min-h-[52px]"
              onClick={() => {
                setIsDeleteSheetOpen(false);
                setCashierToDelete(null);
              }}
              hapticType="light"
              data-testid="button-cancel-delete"
            >
              {t("common.cancel")}
            </HapticButton>
            <HapticButton
              className="flex-1 min-h-[52px] bg-red-500 hover:bg-red-600"
              onClick={handleDeleteConfirm}
              disabled={deleteCashierMutation.isPending}
              hapticType="heavy"
              data-testid="button-confirm-delete"
            >
              {deleteCashierMutation.isPending && (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              )}
              {t("cashier.deactivate")}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
