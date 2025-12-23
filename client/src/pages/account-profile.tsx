import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
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
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { User, Mail, Phone, Save, Loader2, LogOut } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "Il nome è obbligatorio"),
  lastName: z.string().min(1, "Il cognome è obbligatorio"),
  phone: z.string().min(1, "Il telefono è obbligatorio"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

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
        title: "Profilo aggiornato",
        description: "Le tue informazioni sono state salvate.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il profilo.",
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
          <h1 className="text-3xl font-bold">Il Mio Profilo</h1>
          <p className="text-muted-foreground">Gestisci le tue informazioni personali</p>
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
                    Dati Personali
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Il tuo nome"
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
                          <FormLabel>Cognome</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Il tuo cognome"
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
                    Contatti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-foreground truncate">{customer?.email}</p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <Input
                              {...field}
                              className="pl-16"
                              placeholder="+39 333 1234567"
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  Esci dal tuo account
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
                  Salva Modifiche
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
            <p className="text-muted-foreground text-lg mt-2">Il Mio Profilo</p>
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
                <h2 className="text-xl font-semibold text-foreground">Dati Personali</h2>
              </div>

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-base">Nome</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-14 text-lg bg-muted border-border text-foreground rounded-xl px-5"
                        placeholder="Il tuo nome"
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
                    <FormLabel className="text-muted-foreground text-base">Cognome</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-14 text-lg bg-muted border-border text-foreground rounded-xl px-5"
                        placeholder="Il tuo cognome"
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
                <h2 className="text-xl font-semibold text-foreground">Contatti</h2>
              </div>

              <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg text-foreground truncate" data-testid="text-email">
                      {customer?.email}
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-base">Telefono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Phone className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <Input
                          {...field}
                          className="h-14 text-lg pl-20 bg-muted border-border text-foreground rounded-xl"
                          placeholder="+39 333 1234567"
                          data-testid="input-phone"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div 
              className="bg-card rounded-3xl p-6"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Account</h2>
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
                Esci dal tuo account
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
              Salva Modifiche
            </>
          )}
        </HapticButton>
      </motion.div>
    </div>
  );
}
