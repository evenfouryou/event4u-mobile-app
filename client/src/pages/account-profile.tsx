import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { User, Mail, Phone, Save, Loader2, LogOut, Edit2 } from "lucide-react";

const PHONE_PREFIXES = [
  { value: "+39", label: "+39 IT" },
  { value: "+41", label: "+41 CH" },
  { value: "+33", label: "+33 FR" },
  { value: "+49", label: "+49 DE" },
  { value: "+44", label: "+44 UK" },
  { value: "+1", label: "+1 US" },
];

const phoneChangeSchema = z.object({
  newPhone: z.string().min(9, "Min 9 cifre"),
  newPhonePrefix: z.string().default('+39'),
  otp: z.string().optional(),
});

const createProfileSchema = (t: (key: string) => string) => z.object({
  firstName: z.string().min(1, t("account.profilePage.validation.firstNameRequired")),
  lastName: z.string().min(1, t("account.profilePage.validation.lastNameRequired")),
  phone: z.string().min(1, t("account.profilePage.validation.phoneRequired")),
});

type ProfileFormData = {
  firstName: string;
  lastName: string;
  phone: string;
};

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

export default function AccountProfile() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const profileSchema = createProfileSchema(t);

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/public/customers/me"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [newPhonePrefix, setNewPhonePrefix] = useState('+39');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const requestPhoneOtp = async () => {
    if (!newPhoneNumber || newPhoneNumber.length < 9) {
      toast({ title: "Errore", description: "Inserisci un numero valido (min 9 cifre)", variant: "destructive" });
      return;
    }
    
    setIsRequestingOtp(true);
    try {
      const res = await fetch("/api/public/customers/phone/request-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newPhone: newPhoneNumber,
          newPhonePrefix: newPhonePrefix,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore nell'invio OTP");
      }
      
      toast({ title: "OTP Inviato", description: "Controlla il tuo nuovo numero per il codice" });
      setPhoneStep('otp');
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast({ title: "Errore", description: "Inserisci il codice OTP", variant: "destructive" });
      return;
    }
    
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/public/customers/phone/verify-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: otpCode }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Codice OTP non valido");
      }
      
      toast({ title: "Numero aggiornato!", description: "Il tuo numero di telefono è stato verificato" });
      setShowPhoneDialog(false);
      setPhoneStep('input');
      setNewPhoneNumber('');
      setOtpCode('');
      queryClient.invalidateQueries({ queryKey: ["/api/public/customers/me"] });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        phone: customer.phone || "",
      });
    }
  }, [customer, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/public/account/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/customers/me"] });
      triggerHaptic('success');
      toast({
        title: t("account.profilePage.profileUpdated"),
        description: t("account.profilePage.profileUpdatedDesc"),
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: t("account.profilePage.error"),
        description: error.message || t("account.profilePage.updateError"),
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    triggerHaptic('medium');
    try {
      await fetch("/api/logout", { method: "GET", credentials: "include" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerData");
    queryClient.clear();
    window.location.href = "/acquista";
  };

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  const getInitials = () => {
    if (!customer) return "?";
    const first = customer.firstName?.[0] || "";
    const last = customer.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl" data-testid="page-account-profile">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("account.profilePage.title")}</h1>
          <p className="text-muted-foreground">{t("account.profilePage.subtitle")}</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl" data-testid="text-page-title">
                    {customer?.firstName} {customer?.lastName}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1" data-testid="text-email">{customer?.email}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    {t("account.profilePage.personalData")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("account.profilePage.firstName")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("account.profilePage.firstNamePlaceholder")}
                              data-testid="input-firstname"
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
                          <FormLabel>{t("account.profilePage.lastName")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("account.profilePage.lastNamePlaceholder")}
                              data-testid="input-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/15 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-teal-500" />
                    </div>
                    {t("account.profilePage.contacts")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t("account.profilePage.email")}</p>
                        <p className="text-foreground truncate">{customer?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">{t("account.profilePage.phone")}</p>
                          <p className="text-foreground truncate" data-testid="text-phone">{customer?.phone || "Non impostato"}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPhoneDialog(true)}
                        data-testid="button-edit-phone"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("account.profilePage.logout")}
                </Button>

                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t("account.profilePage.saveChanges")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40">
      <motion.div
        className="px-4 py-6"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="bg-card rounded-3xl p-6 mb-6"
          variants={fadeInUp}
        >
          <div className="flex flex-col items-center">
            <Avatar className="w-28 h-28 mb-5 border-4 border-primary/20">
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <h1 
              className="text-2xl font-bold text-foreground text-center" 
              data-testid="text-page-title"
            >
              {customer?.firstName} {customer?.lastName}
            </h1>
            <p className="text-muted-foreground text-lg mt-2">{t("account.profilePage.title")}</p>
          </div>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <motion.div 
              className="bg-card rounded-3xl p-6 space-y-5"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{t("account.profilePage.personalData")}</h2>
              </div>

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-base">{t("account.profilePage.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-14 text-lg bg-muted border-border text-foreground rounded-xl px-5"
                        placeholder={t("account.profilePage.firstNamePlaceholder")}
                        data-testid="input-firstname"
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
                    <FormLabel className="text-muted-foreground text-base">{t("account.profilePage.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-14 text-lg bg-muted border-border text-foreground rounded-xl px-5"
                        placeholder={t("account.profilePage.lastNamePlaceholder")}
                        data-testid="input-lastname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div 
              className="bg-card rounded-3xl p-6 space-y-5"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-teal-500/15 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-teal-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{t("account.profilePage.contacts")}</h2>
              </div>

              <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{t("account.profilePage.email")}</p>
                    <p className="text-lg text-foreground truncate" data-testid="text-email">
                      {customer?.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-base">{t("account.profilePage.phone")}</p>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center">
                      <Phone className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-lg text-foreground" data-testid="text-phone-mobile">
                      {customer?.phone || "Non impostato"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhoneDialog(true)}
                    data-testid="button-edit-phone-mobile"
                  >
                    <Edit2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-card rounded-3xl p-6"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{t("account.profilePage.accountSection")}</h2>
              </div>

              <HapticButton
                type="button"
                variant="outline"
                className="w-full min-h-[52px] text-base font-medium text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                hapticType="medium"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 mr-2" />
                {t("account.profilePage.logout")}
              </HapticButton>
            </motion.div>
          </form>
        </Form>
      </motion.div>

      <motion.div 
        className="fixed left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-30"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springTransition, delay: 0.3 }}
      >
        <HapticButton
          type="submit"
          disabled={updateMutation.isPending}
          onClick={form.handleSubmit(onSubmit)}
          className="w-full min-h-[56px] text-lg font-semibold rounded-2xl"
          hapticType="medium"
          data-testid="button-save"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Save className="w-6 h-6 mr-2" />
              {t("account.profilePage.saveChanges")}
            </>
          )}
        </HapticButton>
      </motion.div>

      {/* Change Phone Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={(open) => {
        setShowPhoneDialog(open);
        if (!open) {
          setPhoneStep('input');
          setNewPhoneNumber('');
          setOtpCode('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Numero di Telefono</DialogTitle>
            <DialogDescription>
              {phoneStep === 'input' 
                ? "Inserisci il nuovo numero. Ti invieremo un codice OTP per verificarlo."
                : "Inserisci il codice OTP ricevuto sul nuovo numero"
              }
            </DialogDescription>
          </DialogHeader>
          
          {phoneStep === 'input' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={newPhonePrefix}
                  onValueChange={setNewPhonePrefix}
                >
                  <SelectTrigger className="w-32" data-testid="select-phone-prefix">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_PREFIXES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Numero (es. 3381234567)"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  data-testid="input-new-phone"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowPhoneDialog(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={requestPhoneOtp} 
                  disabled={isRequestingOtp}
                  data-testid="button-request-otp"
                >
                  {isRequestingOtp ? "Invio..." : "Invia Codice OTP"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Codice inviato a:</p>
                <p className="font-medium">{newPhonePrefix}{newPhoneNumber}</p>
              </div>
              <Input
                placeholder="Inserisci codice OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                data-testid="input-otp"
              />
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setPhoneStep('input')}>
                  Indietro
                </Button>
                <Button 
                  onClick={verifyPhoneOtp} 
                  disabled={isVerifyingOtp}
                  data-testid="button-verify-otp"
                >
                  {isVerifyingOtp ? "Verifica..." : "Verifica e Salva"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
