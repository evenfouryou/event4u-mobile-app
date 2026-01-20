import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, CreditCard, Edit, Ban, Loader2, CheckCircle, XCircle } from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OrganizerPlan } from "@shared/schema";

const planFormSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  type: z.enum(["monthly", "per_event"]),
  price: z.string().min(1, "Prezzo richiesto"),
  durationDays: z.string().optional(),
  eventsIncluded: z.string().optional(),
  description: z.string().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function AdminBillingPlans() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<OrganizerPlan | null>(null);
  const [deactivatingPlan, setDeactivatingPlan] = useState<OrganizerPlan | null>(null);

  const { data: plans, isLoading } = useQuery<OrganizerPlan[]>({
    queryKey: ["/api/admin/billing/plans"],
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      type: "monthly",
      price: "",
      durationDays: "",
      eventsIncluded: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const payload = {
        name: data.name,
        type: data.type,
        price: data.price,
        durationDays: data.durationDays ? parseInt(data.durationDays) : null,
        eventsIncluded: data.eventsIncluded ? parseInt(data.eventsIncluded) : null,
        description: data.description || null,
      };
      return apiRequest("POST", "/api/admin/billing/plans", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: t('admin.billing.plans.createSuccess'), description: t('admin.billing.plans.createSuccessMessage') });
    },
    onError: (error: any) => {
      toast({ title: t('admin.billing.common.error'), description: error.message || t('admin.billing.plans.createError'), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const payload = {
        name: data.name,
        type: data.type,
        price: data.price,
        durationDays: data.durationDays ? parseInt(data.durationDays) : null,
        eventsIncluded: data.eventsIncluded ? parseInt(data.eventsIncluded) : null,
        description: data.description || null,
      };
      return apiRequest("PUT", `/api/admin/billing/plans/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      setEditingPlan(null);
      form.reset();
      toast({ title: t('admin.billing.plans.updateSuccess'), description: t('admin.billing.plans.updateSuccessMessage') });
    },
    onError: (error: any) => {
      toast({ title: t('admin.billing.common.error'), description: error.message || t('admin.billing.plans.updateError'), variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/billing/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      setDeactivatingPlan(null);
      toast({ title: t('admin.billing.plans.deactivateSuccess'), description: t('admin.billing.plans.deactivateSuccessMessage') });
    },
    onError: (error: any) => {
      toast({ title: t('admin.billing.common.error'), description: error.message || t('admin.billing.plans.deactivateError'), variant: "destructive" });
    },
  });

  const handleCreate = (data: PlanFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (plan: OrganizerPlan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      type: plan.type as "monthly" | "per_event",
      price: plan.price,
      durationDays: plan.durationDays?.toString() || "",
      eventsIncluded: plan.eventsIncluded?.toString() || "",
      description: plan.description || "",
    });
  };

  const handleUpdate = (data: PlanFormData) => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(price));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-admin-billing-plans">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-billing-plans">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.billing.plans.title')}</h1>
            <p className="text-muted-foreground">
              {t('admin.billing.plans.subtitle')}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-plan">
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.billing.plans.newPlan')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.billing.plans.createPlan')}</DialogTitle>
                <DialogDescription>
                  {t('admin.billing.plans.createDescription')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.billing.plans.form.planName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('admin.billing.plans.form.planNamePlaceholder')} {...field} data-testid="input-plan-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.billing.plans.form.type')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-plan-type">
                              <SelectValue placeholder={t('admin.billing.plans.form.selectType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">{t('admin.billing.billingCycle.monthly')}</SelectItem>
                            <SelectItem value="per_event">{t('admin.billing.billingCycle.perEvent')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.billing.plans.form.price')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-plan-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("type") === "monthly" && (
                    <FormField
                      control={form.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('admin.billing.plans.form.duration')}</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="30" {...field} data-testid="input-plan-duration" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("type") === "per_event" && (
                    <FormField
                      control={form.control}
                      name="eventsIncluded"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('admin.billing.plans.form.eventsIncluded')}</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10" {...field} data-testid="input-plan-events" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.billing.plans.form.description')}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t('admin.billing.plans.form.descriptionPlaceholder')} {...field} data-testid="textarea-plan-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {t('admin.billing.common.cancel')}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-plan">
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t('admin.billing.plans.createPlan')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.billing.plans.availablePlans')}</CardTitle>
            <CardDescription>{t('admin.billing.plans.availablePlansDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.billing.plans.tableHeaders.name')}</TableHead>
                  <TableHead>{t('admin.billing.plans.tableHeaders.type')}</TableHead>
                  <TableHead>{t('admin.billing.plans.tableHeaders.price')}</TableHead>
                  <TableHead>{t('admin.billing.plans.tableHeaders.details')}</TableHead>
                  <TableHead>{t('admin.billing.plans.tableHeaders.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.billing.common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      <Badge variant={plan.type === "monthly" ? "default" : "secondary"}>
                        {plan.type === "monthly" ? t('admin.billing.billingCycle.monthly') : t('admin.billing.billingCycle.perEvent')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(plan.price)}</TableCell>
                    <TableCell>
                      {plan.type === "monthly" && plan.durationDays && (
                        <span className="text-muted-foreground">{plan.durationDays} {t('admin.billing.plans.days')}</span>
                      )}
                      {plan.type === "per_event" && plan.eventsIncluded && (
                        <span className="text-muted-foreground">{plan.eventsIncluded} {t('admin.billing.plans.events')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('admin.billing.status.active')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          {t('admin.billing.status.deactivated')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(plan)}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {plan.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeactivatingPlan(plan)}
                            data-testid={`button-deactivate-plan-${plan.id}`}
                          >
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!plans || plans.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('admin.billing.plans.noPlans')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.billing.plans.editPlan')}</DialogTitle>
              <DialogDescription>
                {t('admin.billing.plans.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.billing.plans.form.planName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('admin.billing.plans.form.planNamePlaceholder')} {...field} data-testid="input-edit-plan-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.billing.plans.form.type')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-plan-type">
                            <SelectValue placeholder={t('admin.billing.plans.form.selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">{t('admin.billing.billingCycle.monthly')}</SelectItem>
                          <SelectItem value="per_event">{t('admin.billing.billingCycle.perEvent')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.billing.plans.form.price')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-edit-plan-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("type") === "monthly" && (
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.billing.plans.form.duration')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="30" {...field} data-testid="input-edit-plan-duration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {form.watch("type") === "per_event" && (
                  <FormField
                    control={form.control}
                    name="eventsIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.billing.plans.form.eventsIncluded')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} data-testid="input-edit-plan-events" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.billing.plans.form.description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('admin.billing.plans.form.descriptionPlaceholder')} {...field} data-testid="textarea-edit-plan-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                    {t('admin.billing.common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-plan">
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('admin.billing.common.saveChanges')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deactivatingPlan} onOpenChange={(open) => !open && setDeactivatingPlan(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.billing.plans.deactivatePlanTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.billing.plans.deactivatePlanMessage', { planName: deactivatingPlan?.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('admin.billing.common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deactivatingPlan && deactivateMutation.mutate(deactivatingPlan.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-deactivate"
              >
                {deactivateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('admin.billing.plans.deactivate')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title={t('admin.billing.plans.title')} showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6" data-testid="page-admin-billing-plans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestisci i piani di abbonamento per gli organizzatori
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-plan">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Piano
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Piano</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli del nuovo piano di abbonamento
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Piano</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Piano Base" {...field} data-testid="input-plan-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan-type">
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Mensile</SelectItem>
                          <SelectItem value="per_event">Per Evento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-plan-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("type") === "monthly" && (
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durata (giorni)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="30" {...field} data-testid="input-plan-duration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {form.watch("type") === "per_event" && (
                  <FormField
                    control={form.control}
                    name="eventsIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eventi Inclusi</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} data-testid="input-plan-events" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrizione del piano..." {...field} data-testid="textarea-plan-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-plan">
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crea Piano
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Piani Disponibili</CardTitle>
          <CardDescription>Elenco di tutti i piani di abbonamento configurati</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead className="hidden md:table-cell">Dettagli</TableHead>
                <TableHead className="hidden sm:table-cell">Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((plan) => (
                <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={plan.type === "monthly" ? "default" : "secondary"}>
                      {plan.type === "monthly" ? "Mensile" : "Per Evento"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPrice(plan.price)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {plan.type === "monthly" && plan.durationDays && (
                      <span className="text-muted-foreground">{plan.durationDays} giorni</span>
                    )}
                    {plan.type === "per_event" && plan.eventsIncluded && (
                      <span className="text-muted-foreground">{plan.eventsIncluded} eventi</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {plan.isActive ? (
                      <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Attivo
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Disattivato
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(plan)}
                        data-testid={`button-edit-plan-${plan.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {plan.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeactivatingPlan(plan)}
                          data-testid={`button-deactivate-plan-${plan.id}`}
                        >
                          <Ban className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!plans || plans.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nessun piano configurato. Crea il primo piano.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Piano</DialogTitle>
            <DialogDescription>
              Modifica i dettagli del piano di abbonamento
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Piano</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Piano Base" {...field} data-testid="input-edit-plan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-plan-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="per_event">Per Evento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-edit-plan-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("type") === "monthly" && (
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata (giorni)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} data-testid="input-edit-plan-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch("type") === "per_event" && (
                <FormField
                  control={form.control}
                  name="eventsIncluded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eventi Inclusi</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} data-testid="input-edit-plan-events" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrizione del piano..." {...field} data-testid="textarea-edit-plan-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-plan">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salva Modifiche
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivatingPlan} onOpenChange={(open) => !open && setDeactivatingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disattivare Piano?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler disattivare il piano "{deactivatingPlan?.name}"? 
              Gli abbonamenti esistenti non saranno influenzati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivatingPlan && deactivateMutation.mutate(deactivatingPlan.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-deactivate"
            >
              {deactivateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disattiva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </MobileAppLayout>
  );
}
