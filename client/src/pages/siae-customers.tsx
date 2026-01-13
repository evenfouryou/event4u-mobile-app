import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MobileAppLayout,
  MobileHeader,
  BottomSheet,
  HapticButton,
  FloatingActionButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  Send,
  Clock,
  Trash2,
  ShieldCheck,
  Shield,
  ChevronRight,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { SiaeCustomer } from "@shared/schema";

const springConfig = { stiffness: 400, damping: 30 };

const customerFormSchema = z.object({
  uniqueCode: z.string().min(1, "Codice cliente obbligatorio"),
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(10, "Numero telefono non valido"),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const otpFormSchema = z.object({
  otp: z.string().length(6, "Inserisci il codice OTP a 6 cifre"),
});

type OtpFormData = z.infer<typeof otpFormSchema>;

function CustomerCard({
  customer,
  onAction,
  index,
}: {
  customer: SiaeCustomer;
  onAction: (action: string, customer: SiaeCustomer) => void;
  index: number;
}) {
  const { t } = useTranslation();
  const initials = `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase();
  
  const getStatusBadge = () => {
    if (customer.blockedUntil && new Date(customer.blockedUntil) > new Date()) {
      return <Badge variant="destructive" data-testid={`badge-status-${customer.id}`}><XCircle className="w-3 h-3 mr-1" />{t('siae.customersPage.status.blocked')}</Badge>;
    }
    if (customer.isActive && customer.phoneVerified) {
      return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${customer.id}`}><CheckCircle2 className="w-3 h-3 mr-1" />{t('siae.customersPage.status.verified')}</Badge>;
    }
    if (customer.isActive) {
      return <Badge variant="secondary" data-testid={`badge-status-${customer.id}`}>{t('siae.customersPage.status.active')}</Badge>;
    }
    if (!customer.phoneVerified) {
      return <Badge variant="outline" data-testid={`badge-status-${customer.id}`}><Clock className="w-3 h-3 mr-1" />{t('siae.customersPage.status.pending')}</Badge>;
    }
    return <Badge variant="outline" data-testid={`badge-status-${customer.id}`}>{t('siae.customersPage.status.inactive')}</Badge>;
  };

  const getAvatarColor = () => {
    if (customer.blockedUntil && new Date(customer.blockedUntil) > new Date()) {
      return "bg-red-500/20 text-red-500";
    }
    if (customer.isActive && customer.phoneVerified) {
      return "bg-green-500/20 text-green-500";
    }
    return "bg-primary/20 text-primary";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springConfig, delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      className="bg-card rounded-2xl p-4 border border-border"
      onClick={() => {
        triggerHaptic("light");
        onAction("detail", customer);
      }}
      data-testid={`card-customer-${customer.id}`}
    >
      <div className="flex items-start gap-4">
        <Avatar className={`h-14 w-14 ${getAvatarColor()}`}>
          <AvatarFallback className="text-lg font-semibold bg-transparent">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate" data-testid={`text-name-${customer.id}`}>
                {customer.firstName} {customer.lastName}
              </h3>
              <p className="text-xs text-muted-foreground font-mono" data-testid={`text-code-${customer.id}`}>
                {customer.uniqueCode}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
          </div>
          
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate" data-testid={`text-email-${customer.id}`}>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              <span className="text-sm" data-testid={`text-phone-${customer.id}`}>{customer.phone}</span>
              {customer.phoneVerified && (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              )}
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            {getStatusBadge()}
            <span className="text-xs text-muted-foreground" data-testid={`text-date-${customer.id}`}>
              {customer.createdAt ? format(new Date(customer.createdAt), "dd MMM yyyy", { locale: it }) : "-"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SiaeCustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isOtpSheetOpen, setIsOtpSheetOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SiaeCustomer | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [canForceDelete, setCanForceDelete] = useState(false);
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<{ id: number; name: string; startDate: string }[]>({
    queryKey: ["/api/siae/ticketed-events"],
  });

  const customersQueryUrl = selectedEventId 
    ? `/api/siae/customers?eventId=${selectedEventId}` 
    : "/api/siae/customers";

  const { data: customers = [], isLoading, refetch } = useQuery<SiaeCustomer[]>({
    queryKey: ["/api/siae/customers", selectedEventId],
    queryFn: async () => {
      const response = await fetch(customersQueryUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      uniqueCode: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
      birthPlace: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/siae/customers", data);
      return response.json();
    },
    onSuccess: (customer) => {
      triggerHaptic("success");
      toast({
        title: "Cliente registrato",
        description: "Verifica il numero di telefono con il codice OTP",
      });
      setPendingCustomerId(customer.id);
      setIsAddSheetOpen(false);
      setIsAddDialogOpen(false);
      setIsOtpSheetOpen(true);
      setIsOtpDialogOpen(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiRequest("POST", `/api/siae/customers/${customerId}/send-otp`, {});
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic("success");
      toast({
        title: "OTP Inviato",
        description: "Controlla il tuo telefono per il codice",
      });
      setOtpCooldown(60);
      const interval = setInterval(() => {
        setOtpCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: Error) => {
      triggerHaptic("error");
      toast({
        title: "Errore invio OTP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ customerId, otp }: { customerId: string; otp: string }) => {
      const response = await apiRequest("POST", `/api/siae/customers/${customerId}/verify-otp`, { otp });
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic("success");
      toast({
        title: "Telefono verificato",
        description: "Il cliente è ora attivo",
      });
      setIsOtpSheetOpen(false);
      setIsOtpDialogOpen(false);
      setPendingCustomerId(null);
      otpForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      triggerHaptic("error");
      toast({
        title: "Errore verifica",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/siae/customers/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic("success");
      toast({ title: "Stato aggiornato" });
      setIsActionSheetOpen(false);
      setIsActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const manualVerifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/siae/customers/${id}/verify-manual`, {});
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic("success");
      toast({
        title: "Cliente verificato",
        description: "Il cliente è stato verificato manualmente",
      });
      setIsActionSheetOpen(false);
      setIsActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      triggerHaptic("error");
      toast({
        title: "Errore verifica manuale",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, force = false }: { id: string; force?: boolean }) => {
      const url = force ? `/api/siae/customers/${id}?force=true` : `/api/siae/customers/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.canForceDelete) {
          setDeleteErrorMessage(data.message);
          setCanForceDelete(true);
          throw new Error("SHOW_FORCE_DELETE");
        }
        throw new Error(data.message || "Errore durante l'eliminazione");
      }
      return data;
    },
    onSuccess: () => {
      triggerHaptic("success");
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato rimosso dal sistema",
      });
      setIsDeleteSheetOpen(false);
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
      setDeleteErrorMessage(null);
      setCanForceDelete(false);
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      if (error.message !== "SHOW_FORCE_DELETE") {
        triggerHaptic("error");
        toast({
          title: "Errore eliminazione",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createMutation.mutate(data);
  };

  const onVerifyOtp = (data: OtpFormData) => {
    if (pendingCustomerId) {
      verifyOtpMutation.mutate({ customerId: pendingCustomerId, otp: data.otp });
    }
  };

  const handleCustomerAction = (action: string, customer: SiaeCustomer) => {
    setSelectedCustomer(customer);
    if (action === "detail") {
      setIsActionSheetOpen(true);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(query) ||
      customer.lastName?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.uniqueCode?.toLowerCase().includes(query)
    );
  });

  const generateCustomerCode = () => {
    const prefix = "CLI";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const getStatusBadgeDesktop = (customer: SiaeCustomer) => {
    if (customer.blockedUntil && new Date(customer.blockedUntil) > new Date()) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('siae.customersPage.status.blocked')}</Badge>;
    }
    if (customer.isActive && customer.phoneVerified) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />{t('siae.customersPage.status.verified')}</Badge>;
    }
    if (customer.isActive) {
      return <Badge variant="secondary">{t('siae.customersPage.status.active')}</Badge>;
    }
    if (!customer.phoneVerified) {
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{t('siae.customersPage.status.pending')}</Badge>;
    }
    return <Badge variant="outline">{t('siae.customersPage.status.inactive')}</Badge>;
  };

  const stats = {
    total: customers.length,
    verified: customers.filter(c => c.phoneVerified).length,
    active: customers.filter(c => c.isActive).length,
    blocked: customers.filter(c => c.blockedUntil && new Date(c.blockedUntil) > new Date()).length,
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-customers">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('siae.customersPage.title')}</h1>
            <p className="text-muted-foreground">{t('siae.customersPage.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button onClick={() => {
              form.setValue("uniqueCode", generateCustomerCode());
              setIsAddDialogOpen(true);
            }} data-testid="button-add-customer">
              <Plus className="w-4 h-4 mr-2" />
              {t('siae.customersPage.newCustomer')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">{t('siae.customersPage.totalCustomers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.verified}</div>
              <p className="text-sm text-muted-foreground">{t('siae.customersPage.verified')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.active}</div>
              <p className="text-sm text-muted-foreground">{t('siae.customersPage.active')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{stats.blocked}</div>
              <p className="text-sm text-muted-foreground">{t('siae.customersPage.blocked')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{t('siae.customersPage.customerList')}</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={t('siae.customersPage.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <Select
                  value={selectedEventId}
                  onValueChange={(value) => setSelectedEventId(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="w-[220px]" data-testid="select-event-filter">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tutti gli eventi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="select-event-all">Tutti gli eventi</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={String(event.id)} data-testid={`select-event-${event.id}`}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="empty-state">
                <Users className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">{t('siae.customersPage.noCustomers')}</p>
                <p className="text-sm mt-1">{t('siae.customersPage.addFirstCustomer')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('siae.customersPage.customer')}</TableHead>
                    <TableHead>{t('siae.customersPage.code')}</TableHead>
                    <TableHead>{t('auth.email')}</TableHead>
                    <TableHead>{t('auth.phone')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('siae.customersPage.createdDate')}</TableHead>
                    <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const initials = `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase();
                    return (
                      <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 bg-primary/20">
                              <AvatarFallback className="text-sm font-semibold bg-transparent">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium" data-testid={`text-name-${customer.id}`}>
                              {customer.firstName} {customer.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm" data-testid={`text-code-${customer.id}`}>
                            {customer.uniqueCode}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`text-email-${customer.id}`}>{customer.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span data-testid={`text-phone-${customer.id}`}>{customer.phone}</span>
                            {customer.phoneVerified && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`badge-status-${customer.id}`}>
                          {getStatusBadgeDesktop(customer)}
                        </TableCell>
                        <TableCell data-testid={`text-date-${customer.id}`}>
                          {customer.createdAt ? format(new Date(customer.createdAt), "dd MMM yyyy", { locale: it }) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsActionDialogOpen(true);
                            }}
                            data-testid={`button-actions-${customer.id}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('siae.customersPage.newCustomer')}</DialogTitle>
              <DialogDescription>{t('siae.customersPage.subtitle')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-customer">
                <FormField
                  control={form.control}
                  name="uniqueCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('siae.customersPage.customerCode')}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="CLI..." data-testid="input-unique-code" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => form.setValue("uniqueCode", generateCustomerCode())}
                          data-testid="button-generate-code"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.firstName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Mario" data-testid="input-first-name" />
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
                        <FormLabel>{t('auth.lastName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Rossi" data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="mario.rossi@email.com" data-testid="input-email" />
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
                      <FormLabel>{t('auth.phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+39 333 1234567" data-testid="input-phone" />
                      </FormControl>
                      <FormDescription>{t('siae.customersPage.forOtpVerification')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('siae.customersPage.birthDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-birth-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthPlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('siae.customersPage.birthPlace')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Roma" data-testid="input-birth-place" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('siae.customersPage.registering')}
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        {t('siae.customersPage.registerCustomer')}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('siae.customersPage.verifyPhone')}</DialogTitle>
              <DialogDescription>{t('siae.customersPage.enterOtpCode')}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6" data-testid="form-otp">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormControl>
                        <InputOTP maxLength={6} {...field} data-testid="input-otp">
                          <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={0} className="w-10 h-12 text-xl" />
                            <InputOTPSlot index={1} className="w-10 h-12 text-xl" />
                            <InputOTPSlot index={2} className="w-10 h-12 text-xl" />
                            <InputOTPSlot index={3} className="w-10 h-12 text-xl" />
                            <InputOTPSlot index={4} className="w-10 h-12 text-xl" />
                            <InputOTPSlot index={5} className="w-10 h-12 text-xl" />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={otpCooldown > 0 || sendOtpMutation.isPending}
                    onClick={() => pendingCustomerId && sendOtpMutation.mutate(pendingCustomerId)}
                    data-testid="button-resend-otp"
                  >
                    {otpCooldown > 0 ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        {t('siae.customersPage.resendIn', { seconds: otpCooldown })}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t('siae.customersPage.resendOtp')}
                      </>
                    )}
                  </Button>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOtpDialogOpen(false)} data-testid="button-cancel-otp">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={verifyOtpMutation.isPending} data-testid="button-verify-otp">
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('siae.customersPage.verifying')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {t('siae.customersPage.verifyOtp')}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : t('siae.customersPage.customerDetails')}</DialogTitle>
              <DialogDescription>{t('siae.customersPage.manageCustomerActions')}</DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <Avatar className="h-16 w-16 bg-primary/20">
                    <AvatarFallback className="text-xl font-semibold text-primary bg-transparent">
                      {`${selectedCustomer.firstName?.[0] || ""}${selectedCustomer.lastName?.[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">{selectedCustomer.uniqueCode}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedCustomer.phone}</span>
                      {selectedCustomer.phoneVerified && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedCustomer.email}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {!selectedCustomer.phoneVerified && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setPendingCustomerId(selectedCustomer.id);
                          setIsActionDialogOpen(false);
                          setIsOtpDialogOpen(true);
                        }}
                        data-testid="action-verify"
                      >
                        <Shield className="w-4 h-4 mr-3" />
                        {t('siae.customersPage.verifyPhoneOtp')}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => manualVerifyMutation.mutate(selectedCustomer.id)}
                        disabled={manualVerifyMutation.isPending}
                        data-testid="action-verify-manual"
                      >
                        <ShieldCheck className="w-4 h-4 mr-3" />
                        {t('siae.customersPage.manualVerify')}
                      </Button>
                    </>
                  )}
                  {!selectedCustomer.isActive && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate({ id: selectedCustomer.id, status: "active" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="action-activate"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-3 text-green-500" />
                      {t('siae.customersPage.activateCustomer')}
                    </Button>
                  )}
                  {selectedCustomer.isActive && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-amber-500 hover:text-amber-500"
                      onClick={() => updateStatusMutation.mutate({ id: selectedCustomer.id, status: "blocked" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="action-block"
                    >
                      <XCircle className="w-4 h-4 mr-3" />
                      {t('siae.customersPage.blockCustomer')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      setIsActionDialogOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                    data-testid="action-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    {t('siae.customersPage.deleteCustomer')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteErrorMessage(null);
            setCanForceDelete(false);
          }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('siae.customersPage.confirmDeletion')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-center text-muted-foreground">
                {deleteErrorMessage ? (
                  <span className="text-amber-500">{deleteErrorMessage}</span>
                ) : (
                  <>
                    {t('siae.customersPage.areYouSureDelete')}{" "}
                    <strong className="text-foreground">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</strong>?
                    <br />
                    {t('siae.customersPage.actionIrreversible')}
                  </>
                )}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteErrorMessage(null);
                  setCanForceDelete(false);
                }}
                data-testid="button-cancel-delete"
              >
                {t('common.cancel')}
              </Button>
              {canForceDelete ? (
                <Button
                  variant="destructive"
                  onClick={() => selectedCustomer && deleteMutation.mutate({ id: selectedCustomer.id, force: true })}
                  disabled={deleteMutation.isPending}
                  data-testid="button-force-delete"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('siae.customersPage.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('siae.customersPage.deleteAnyway')}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => selectedCustomer && deleteMutation.mutate({ id: selectedCustomer.id })}
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('siae.customersPage.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common.delete')}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const headerContent = (
    <MobileHeader
      title="Clienti SIAE"
      subtitle={`${filteredCustomers.length} clienti`}
      showBackButton
      showUserMenu
      rightAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </HapticButton>
      }
    />
  );

  return (
    <MobileAppLayout
      header={headerContent}
      className="bg-background"
      data-testid="page-siae-customers"
    >
      <div className="pb-24 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="sticky top-0 z-20 py-3 bg-background/95 backdrop-blur-sm space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Cerca clienti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl bg-card border-border"
              data-testid="input-search"
            />
          </div>
          <Select
            value={selectedEventId}
            onValueChange={(value) => setSelectedEventId(value === "all" ? "" : value)}
          >
            <SelectTrigger className="h-12 text-base rounded-xl bg-card border-border" data-testid="select-event-filter-mobile">
              <Calendar className="w-5 h-5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Tutti gli eventi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli eventi</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={String(event.id)}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            data-testid="empty-state"
          >
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nessun cliente trovato</p>
            <p className="text-sm mt-1">Aggiungi il primo cliente</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer, index) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onAction={handleCustomerAction}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => {
          form.setValue("uniqueCode", generateCustomerCode());
          setIsAddSheetOpen(true);
        }}
        data-testid="button-add-customer"
      >
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      <BottomSheet
        open={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="Nuovo Cliente"
      >
        <div className="p-4 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-customer">
              <FormField
                control={form.control}
                name="uniqueCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Cliente</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="CLI..." 
                          className="h-12 text-base"
                          data-testid="input-unique-code" 
                        />
                      </FormControl>
                      <HapticButton
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                        onClick={() => form.setValue("uniqueCode", generateCustomerCode())}
                        data-testid="button-generate-code"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </HapticButton>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Mario" 
                          className="h-12 text-base"
                          data-testid="input-first-name" 
                        />
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
                        <Input 
                          {...field} 
                          placeholder="Rossi" 
                          className="h-12 text-base"
                          data-testid="input-last-name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        {...field} 
                        placeholder="mario.rossi@email.com" 
                        className="h-12 text-base"
                        data-testid="input-email" 
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
                        placeholder="+39 333 1234567" 
                        className="h-12 text-base"
                        data-testid="input-phone" 
                      />
                    </FormControl>
                    <FormDescription>Per verifica OTP</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Nascita</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="h-12 text-base"
                          data-testid="input-birth-date" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthPlace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Luogo Nascita</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Roma" 
                          className="h-12 text-base"
                          data-testid="input-birth-place" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 space-y-3">
                <HapticButton 
                  type="submit" 
                  className="w-full h-14 text-base"
                  disabled={createMutation.isPending}
                  hapticType="medium"
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registrazione...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5 mr-2" />
                      Registra Cliente
                    </>
                  )}
                </HapticButton>
                <HapticButton 
                  type="button" 
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => setIsAddSheetOpen(false)}
                  data-testid="button-cancel"
                >
                  Annulla
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isOtpSheetOpen}
        onClose={() => setIsOtpSheetOpen(false)}
        title="Verifica Telefono"
      >
        <div className="p-4 pb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-center text-muted-foreground mb-6">
            Inserisci il codice OTP a 6 cifre inviato al telefono del cliente
          </p>
          
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6" data-testid="form-otp">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <InputOTP maxLength={6} {...field} data-testid="input-otp">
                        <InputOTPGroup className="gap-2">
                          <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-center">
                <HapticButton
                  type="button"
                  variant="ghost"
                  className="h-12"
                  disabled={otpCooldown > 0 || sendOtpMutation.isPending}
                  onClick={() => pendingCustomerId && sendOtpMutation.mutate(pendingCustomerId)}
                  data-testid="button-resend-otp"
                >
                  {otpCooldown > 0 ? (
                    <>
                      <Clock className="w-5 h-5 mr-2" />
                      Reinvia tra {otpCooldown}s
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Reinvia OTP
                    </>
                  )}
                </HapticButton>
              </div>

              <div className="space-y-3 pt-4">
                <HapticButton 
                  type="submit" 
                  className="w-full h-14 text-base"
                  disabled={verifyOtpMutation.isPending}
                  hapticType="medium"
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifica...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Verifica OTP
                    </>
                  )}
                </HapticButton>
                <HapticButton 
                  type="button" 
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => setIsOtpSheetOpen(false)}
                  data-testid="button-cancel-otp"
                >
                  Annulla
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        title={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "Dettagli"}
      >
        {selectedCustomer && (
          <div className="p-4 pb-8 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <Avatar className="h-16 w-16 bg-primary/20">
                <AvatarFallback className="text-xl font-semibold text-primary bg-transparent">
                  {`${selectedCustomer.firstName?.[0] || ""}${selectedCustomer.lastName?.[0] || ""}`.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-mono text-sm text-muted-foreground">{selectedCustomer.uniqueCode}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCustomer.phone}</span>
                  {selectedCustomer.phoneVerified && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCustomer.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {!selectedCustomer.phoneVerified && (
                <>
                  <HapticButton
                    variant="outline"
                    className="w-full h-14 justify-start px-4"
                    onClick={() => {
                      setPendingCustomerId(selectedCustomer.id);
                      setIsActionSheetOpen(false);
                      setIsOtpSheetOpen(true);
                    }}
                    data-testid="action-verify"
                  >
                    <Shield className="w-5 h-5 mr-3" />
                    Verifica Telefono (OTP)
                  </HapticButton>
                  <HapticButton
                    variant="outline"
                    className="w-full h-14 justify-start px-4"
                    onClick={() => manualVerifyMutation.mutate(selectedCustomer.id)}
                    disabled={manualVerifyMutation.isPending}
                    data-testid="action-verify-manual"
                  >
                    <ShieldCheck className="w-5 h-5 mr-3" />
                    Verifica Manuale (Admin)
                  </HapticButton>
                </>
              )}
              
              {!selectedCustomer.isActive && (
                <HapticButton
                  variant="outline"
                  className="w-full h-14 justify-start px-4"
                  onClick={() => updateStatusMutation.mutate({ id: selectedCustomer.id, status: "active" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="action-activate"
                >
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
                  Attiva Cliente
                </HapticButton>
              )}
              
              {selectedCustomer.isActive && (
                <HapticButton
                  variant="outline"
                  className="w-full h-14 justify-start px-4 text-amber-500 hover:text-amber-500"
                  onClick={() => updateStatusMutation.mutate({ id: selectedCustomer.id, status: "blocked" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="action-block"
                >
                  <XCircle className="w-5 h-5 mr-3" />
                  Blocca Cliente
                </HapticButton>
              )}
              
              <HapticButton
                variant="outline"
                className="w-full h-14 justify-start px-4 text-destructive hover:text-destructive"
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsDeleteSheetOpen(true);
                }}
                data-testid="action-delete"
              >
                <Trash2 className="w-5 h-5 mr-3" />
                Elimina Cliente
              </HapticButton>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isDeleteSheetOpen}
        onClose={() => {
          setIsDeleteSheetOpen(false);
          setDeleteErrorMessage(null);
          setCanForceDelete(false);
        }}
        title="Conferma Eliminazione"
      >
        <div className="p-4 pb-8 space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
          </div>
          
          <p className="text-center text-muted-foreground">
            {deleteErrorMessage ? (
              <span className="text-amber-500">{deleteErrorMessage}</span>
            ) : (
              <>
                Sei sicuro di voler eliminare{" "}
                <strong className="text-foreground">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</strong>?
                <br />
                Questa azione è irreversibile.
              </>
            )}
          </p>

          <div className="space-y-3 pt-4">
            {canForceDelete ? (
              <HapticButton
                variant="destructive"
                className="w-full h-14 text-base"
                onClick={() => selectedCustomer && deleteMutation.mutate({ id: selectedCustomer.id, force: true })}
                disabled={deleteMutation.isPending}
                hapticType="heavy"
                data-testid="button-force-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2" />
                    Elimina comunque
                  </>
                )}
              </HapticButton>
            ) : (
              <HapticButton
                variant="destructive"
                className="w-full h-14 text-base"
                onClick={() => selectedCustomer && deleteMutation.mutate({ id: selectedCustomer.id })}
                disabled={deleteMutation.isPending}
                hapticType="heavy"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2" />
                    Elimina
                  </>
                )}
              </HapticButton>
            )}
            <HapticButton
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                setIsDeleteSheetOpen(false);
                setDeleteErrorMessage(null);
                setCanForceDelete(false);
              }}
              data-testid="button-cancel-delete"
            >
              Annulla
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
