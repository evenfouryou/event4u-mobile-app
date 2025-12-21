import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, Phone, Save, Loader2 } from "lucide-react";

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
  type: "spring",
  stiffness: 300,
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
      toast({
        title: "Profilo aggiornato",
        description: "Le tue informazioni sono state salvate.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il profilo.",
        variant: "destructive",
      });
    },
  });

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
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <motion.div
        className="flex-1 px-5 pt-6 pb-24"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="flex flex-col items-center mb-8"
          variants={fadeInUp}
        >
          <Avatar className="w-24 h-24 mb-4 border-4 border-primary/20">
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <h1 
            className="text-2xl font-bold text-foreground text-center" 
            data-testid="text-page-title"
          >
            {customer?.firstName} {customer?.lastName}
          </h1>
          <p className="text-muted-foreground text-base mt-1">Il Mio Profilo</p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <motion.div 
              className="space-y-5"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Dati Personali</h2>
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
                        className="h-14 text-base bg-muted border-border text-foreground rounded-xl px-4"
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
                        className="h-14 text-base bg-muted border-border text-foreground rounded-xl px-4"
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
              className="space-y-5"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-teal-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Contatti</h2>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-base text-foreground truncate" data-testid="text-email">
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
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Phone className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <Input
                          {...field}
                          className="h-14 text-base pl-16 bg-muted border-border text-foreground rounded-xl"
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
          </form>
        </Form>
      </motion.div>

      <motion.div 
        className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springTransition, delay: 0.3 }}
      >
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          onClick={form.handleSubmit(onSubmit)}
          className="w-full h-14 text-base font-semibold bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl"
          data-testid="button-save"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salva Modifiche
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
