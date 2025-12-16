import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  Send,
  Clock,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { SiaeCustomer } from "@shared/schema";

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

export default function SiaeCustomersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<SiaeCustomer | null>(null);
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const { data: customers = [], isLoading, refetch } = useQuery<SiaeCustomer[]>({
    queryKey: ["/api/siae/customers"],
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
      toast({
        title: "Cliente registrato",
        description: "Verifica il numero di telefono con il codice OTP",
      });
      setPendingCustomerId(customer.id);
      setIsDialogOpen(false);
      setIsOtpDialogOpen(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
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
      toast({
        title: "Telefono verificato",
        description: "Il cliente è ora attivo",
      });
      setIsOtpDialogOpen(false);
      setPendingCustomerId(null);
      otpForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
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
      toast({ title: "Stato aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
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
      toast({
        title: "Cliente verificato",
        description: "Il cliente è stato verificato manualmente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore verifica manuale",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/siae/customers/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato rimosso dal sistema",
      });
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/siae/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore eliminazione",
        description: error.message,
        variant: "destructive",
      });
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

  const getStatusBadge = (isActive: boolean, phoneVerified: boolean, blockedUntil: Date | null) => {
    if (blockedUntil && new Date(blockedUntil) > new Date()) {
      return <Badge variant="destructive" data-testid="badge-status-blocked"><XCircle className="w-3 h-3 mr-1" />Bloccato</Badge>;
    }
    if (isActive && phoneVerified) {
      return <Badge variant="default" className="bg-green-600" data-testid="badge-status-verified"><CheckCircle2 className="w-3 h-3 mr-1" />Verificato</Badge>;
    }
    if (isActive) {
      return <Badge variant="secondary" data-testid="badge-status-active">Attivo</Badge>;
    }
    if (!phoneVerified) {
      return <Badge variant="outline" data-testid="badge-status-pending"><Clock className="w-3 h-3 mr-1" />In attesa verifica</Badge>;
    }
    return <Badge variant="outline" data-testid="badge-status-inactive">Inattivo</Badge>;
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

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full pb-24 md:pb-8" data-testid="page-siae-customers">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="title-page">
            Clienti SIAE
          </h1>
          <p className="text-muted-foreground text-sm md:text-base" data-testid="description-page">
            Registro clienti con verifica telefonica OTP
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-customer">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-customer">
              <DialogHeader>
                <DialogTitle>Registrazione Nuovo Cliente</DialogTitle>
                <DialogDescription>
                  Inserisci i dati del cliente. Sarà richiesta verifica telefonica OTP.
                </DialogDescription>
              </DialogHeader>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
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
                          <FormLabel>Cognome</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Rossi" data-testid="input-last-name" />
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
                          <FormLabel>Telefono</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+39 333 1234567" data-testid="input-phone" />
                          </FormControl>
                          <FormDescription>Per verifica OTP</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data di Nascita</FormLabel>
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
                          <FormLabel>Luogo di Nascita</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Roma, IT" data-testid="input-birth-place" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                      Annulla
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Registrazione...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Registra Cliente
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-otp-verification">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Verifica Telefono
            </DialogTitle>
            <DialogDescription>
              Inserisci il codice OTP a 6 cifre inviato al telefono del cliente
            </DialogDescription>
          </DialogHeader>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6" data-testid="form-otp">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <InputOTP maxLength={6} {...field} data-testid="input-otp">
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
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
                      Reinvia tra {otpCooldown}s
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Reinvia OTP
                    </>
                  )}
                </Button>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOtpDialogOpen(false)} data-testid="button-cancel-otp">
                  Annulla
                </Button>
                <Button type="submit" disabled={verifyOtpMutation.isPending} data-testid="button-verify-otp">
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifica...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verifica OTP
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-delete-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il cliente{" "}
              <strong>{customerToDelete?.firstName} {customerToDelete?.lastName}</strong>?
              <br />
              Questa azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCustomerToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => customerToDelete && deleteMutation.mutate(customerToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="glass-card" data-testid="card-search">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca per nome, email, telefono o codice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card" data-testid="card-customers">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Registro Clienti
          </CardTitle>
          <CardDescription>
            {filteredCustomers.length} clienti registrati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessun cliente trovato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-customers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contatti</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Registrazione</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`cell-code-${customer.id}`}>
                        {customer.uniqueCode}
                      </TableCell>
                      <TableCell data-testid={`cell-name-${customer.id}`}>
                        <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      </TableCell>
                      <TableCell data-testid={`cell-contacts-${customer.id}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                            {customer.phoneVerified && (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${customer.id}`}>
                        {getStatusBadge(customer.isActive, customer.phoneVerified, customer.blockedUntil)}
                      </TableCell>
                      <TableCell data-testid={`cell-date-${customer.id}`}>
                        {customer.createdAt ? format(new Date(customer.createdAt), "dd MMM yyyy", { locale: it }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${customer.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-testid={`menu-${customer.id}`}>
                            {!customer.phoneVerified && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPendingCustomerId(customer.id);
                                  setIsOtpDialogOpen(true);
                                }}
                                data-testid={`menu-verify-${customer.id}`}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Verifica Telefono
                              </DropdownMenuItem>
                            )}
                            {!customer.phoneVerified && (
                              <DropdownMenuItem
                                onClick={() => manualVerifyMutation.mutate(customer.id)}
                                data-testid={`menu-verify-manual-${customer.id}`}
                              >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Verifica Manuale (Admin)
                              </DropdownMenuItem>
                            )}
                            {!customer.isActive && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: customer.id, status: "active" })}
                                data-testid={`menu-activate-${customer.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Attiva
                              </DropdownMenuItem>
                            )}
                            {customer.isActive && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: customer.id, status: "blocked" })}
                                className="text-destructive"
                                data-testid={`menu-block-${customer.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Blocca
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                              data-testid={`menu-delete-${customer.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
