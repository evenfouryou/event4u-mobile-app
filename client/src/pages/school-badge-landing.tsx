import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Mail,
  User,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import type { SchoolBadgeLanding } from "@shared/schema";

const PHONE_PREFIXES = [
  { code: "+39", country: "Italia" },
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "Regno Unito" },
  { code: "+49", country: "Germania" },
  { code: "+33", country: "Francia" },
  { code: "+34", country: "Spagna" },
  { code: "+41", country: "Svizzera" },
  { code: "+43", country: "Austria" },
  { code: "+32", country: "Belgio" },
  { code: "+31", country: "Paesi Bassi" },
  { code: "+351", country: "Portogallo" },
  { code: "+48", country: "Polonia" },
  { code: "+40", country: "Romania" },
  { code: "+30", country: "Grecia" },
  { code: "+385", country: "Croazia" },
  { code: "+386", country: "Slovenia" },
];

const createRequestSchema = (requirePhone: boolean) => z.object({
  firstName: z.string().min(2, "Nome troppo corto (min 2 caratteri)"),
  lastName: z.string().min(2, "Cognome troppo corto (min 2 caratteri)"),
  email: z.string().email("Email non valida"),
  phonePrefix: z.string().default("+39"),
  phone: requirePhone 
    ? z.string().min(6, "Numero di telefono richiesto (min 6 cifre)") 
    : z.string().optional(),
});

type RequestFormData = z.infer<ReturnType<typeof createRequestSchema>>;

export default function SchoolBadgeLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { data: landing, isLoading, error } = useQuery<SchoolBadgeLanding>({
    queryKey: ["/api/school-badges/landing", slug],
  });

  const form = useForm<RequestFormData>({
    resolver: zodResolver(createRequestSchema(landing?.requirePhone ?? true)),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phonePrefix: "+39",
      phone: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      const payload = {
        landingId: landing?.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ? `${data.phonePrefix} ${data.phone}` : undefined,
      };
      const response = await apiRequest("POST", `/api/school-badges/request`, payload);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Richiesta inviata", description: "Controlla la tua email per verificare il tuo indirizzo" });
    },
    onError: (error: Error) => {
      const message = error.message;
      if (message.includes("domain")) {
        toast({ title: "Dominio non autorizzato", description: "Il tuo indirizzo email non appartiene a un dominio autorizzato", variant: "destructive" });
      } else if (message.includes("already")) {
        toast({ title: "Email già registrata", description: "Questo indirizzo email ha già richiesto un badge", variant: "destructive" });
      } else {
        toast({ title: "Errore", description: message, variant: "destructive" });
      }
    },
  });

  const onSubmit = (data: RequestFormData) => {
    if (landing?.authorizedDomains && landing.authorizedDomains.length > 0) {
      const emailDomain = data.email.split("@")[1];
      if (!landing.authorizedDomains.includes(emailDomain)) {
        toast({ 
          title: "Dominio non autorizzato", 
          description: `L'email deve appartenere a uno dei seguenti domini: ${landing.authorizedDomains.join(", ")}`,
          variant: "destructive" 
        });
        return;
      }
    }
    submitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-xl mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !landing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Pagina non trovata</CardTitle>
              <CardDescription>
                Questa pagina di richiesta badge non esiste o non è più attiva.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!landing.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>Richieste chiuse</CardTitle>
              <CardDescription>
                Le richieste di badge per questa scuola non sono attualmente aperte.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: landing.primaryColor || "#3b82f6" }}
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle>Richiesta inviata</CardTitle>
              <CardDescription>
                {landing.customThankYouText || "Grazie per la tua richiesta! Controlla la tua email per verificare il tuo indirizzo e completare la procedura."}
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card" data-testid="card-badge-request">
          <CardHeader className="text-center">
            {landing.logoUrl ? (
              <img 
                src={landing.logoUrl} 
                alt={landing.schoolName} 
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4"
                data-testid="img-school-logo"
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: landing.primaryColor || "#3b82f6" }}
              >
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
            )}
            <CardTitle className="text-2xl" data-testid="text-school-name">{landing.schoolName}</CardTitle>
            <CardDescription>
              {landing.customWelcomeText || landing.description || "Richiedi il tuo badge digitale compilando il form sottostante."}
            </CardDescription>
            {landing.authorizedDomains && landing.authorizedDomains.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Email autorizzate: {landing.authorizedDomains.map(d => `@${d}`).join(", ")}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} className="pl-10" placeholder="Mario" data-testid="input-first-name" />
                        </div>
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
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} className="pl-10" placeholder="Rossi" data-testid="input-last-name" />
                        </div>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="email" className="pl-10" placeholder="mario.rossi@scuola.edu.it" data-testid="input-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Telefono {!landing.requirePhone && "(opzionale)"}</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="phonePrefix"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-28" data-testid="select-phone-prefix">
                              <SelectValue placeholder="+39" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PHONE_PREFIXES.map((prefix) => (
                              <SelectItem key={prefix.code} value={prefix.code}>
                                {prefix.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormControl>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="tel" className="pl-10" placeholder="123 456 7890" data-testid="input-phone" />
                          </div>
                        </FormControl>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={submitMutation.isPending}
                  style={{ backgroundColor: landing.primaryColor || undefined }}
                  data-testid="button-submit-request"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    "Richiedi Badge"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
