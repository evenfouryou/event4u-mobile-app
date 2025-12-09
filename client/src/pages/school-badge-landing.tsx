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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
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

const DEFAULT_TERMS_TEXT = `Accettando questi termini, l'utente dichiara di aver letto e compreso le condizioni di utilizzo del servizio di badge digitale. Il badge è personale e non cedibile. L'utente si impegna a fornire informazioni veritiere e aggiornate. L'organizzazione si riserva il diritto di revocare il badge in caso di uso improprio o violazione dei termini.`;

const DEFAULT_PRIVACY_TEXT = `I dati personali raccolti (nome, cognome, email e numero di telefono) saranno trattati in conformità con il Regolamento UE 2016/679 (GDPR). I dati saranno utilizzati esclusivamente per la generazione e gestione del badge digitale e per comunicazioni relative al servizio. I dati saranno conservati per il tempo necessario all'erogazione del servizio e potranno essere cancellati su richiesta dell'interessato.`;

const DEFAULT_MARKETING_TEXT = `Acconsento a ricevere comunicazioni promozionali e informative via email relative a eventi, iniziative e servizi offerti. Posso revocare questo consenso in qualsiasi momento cliccando sul link di disiscrizione presente in ogni comunicazione o contattando il servizio clienti.`;

const createRequestSchema = (requirePhone: boolean, requireTerms: boolean) => z.object({
  firstName: z.string().min(2, "Nome troppo corto (min 2 caratteri)"),
  lastName: z.string().min(2, "Cognome troppo corto (min 2 caratteri)"),
  email: z.string().email("Email non valida"),
  phonePrefix: z.string().default("+39"),
  phone: requirePhone 
    ? z.string().min(6, "Numero di telefono richiesto (min 6 cifre)") 
    : z.string().optional(),
  acceptedTerms: requireTerms 
    ? z.boolean().refine(val => val === true, "Devi accettare i termini e le condizioni")
    : z.boolean().optional(),
  acceptedMarketing: z.boolean().optional(),
});

type RequestFormData = z.infer<ReturnType<typeof createRequestSchema>>;

export default function SchoolBadgeLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);

  const { data: landing, isLoading, error } = useQuery<SchoolBadgeLanding>({
    queryKey: ["/api/school-badges/landing", slug],
  });

  const form = useForm<RequestFormData>({
    resolver: zodResolver(createRequestSchema(landing?.requirePhone ?? true, landing?.requireTerms ?? false)),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phonePrefix: "+39",
      phone: "",
      acceptedTerms: false,
      acceptedMarketing: false,
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
        acceptedTerms: data.acceptedTerms ?? false,
        acceptedMarketing: data.acceptedMarketing ?? false,
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

  const termsTextToShow = landing.termsText || DEFAULT_TERMS_TEXT;
  const privacyTextToShow = landing.privacyText || DEFAULT_PRIVACY_TEXT;
  const marketingTextToShow = landing.marketingText || DEFAULT_MARKETING_TEXT;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card" data-testid="card-badge-request">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img 
                src="/logo.png" 
                alt="Event4U" 
                className="h-8 w-auto"
                data-testid="img-event4u-logo"
              />
            </div>
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

                {landing.requireTerms && (
                  <div className="space-y-3 pt-2">
                    <FormField
                      control={form.control}
                      name="acceptedTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-terms"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              Accetto i <span className="text-primary underline cursor-pointer" onClick={(e) => { e.preventDefault(); setTermsOpen(!termsOpen); }}>termini e condizioni</span> e l'<span className="text-primary underline cursor-pointer" onClick={(e) => { e.preventDefault(); setPrivacyOpen(!privacyOpen); }}>informativa sulla privacy</span> *
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between p-2 h-auto text-muted-foreground hover:text-foreground"
                          type="button"
                          data-testid="button-toggle-terms"
                        >
                          <span className="text-xs">Termini e condizioni</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${termsOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-md mt-1" data-testid="text-terms-content">
                          {termsTextToShow}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between p-2 h-auto text-muted-foreground hover:text-foreground"
                          type="button"
                          data-testid="button-toggle-privacy"
                        >
                          <span className="text-xs">Informativa sulla privacy</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${privacyOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-md mt-1" data-testid="text-privacy-content">
                          {privacyTextToShow}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {landing.showMarketing && (
                  <div className="space-y-3 pt-2">
                    <FormField
                      control={form.control}
                      name="acceptedMarketing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-marketing"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              Acconsento a ricevere comunicazioni promozionali
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Collapsible open={marketingOpen} onOpenChange={setMarketingOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between p-2 h-auto text-muted-foreground hover:text-foreground"
                          type="button"
                          data-testid="button-toggle-marketing"
                        >
                          <span className="text-xs">Dettagli sul consenso marketing</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${marketingOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-md mt-1" data-testid="text-marketing-content">
                          {marketingTextToShow}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

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
