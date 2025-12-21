import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { MobileAppLayout, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import type { SchoolBadgeLanding } from "@shared/schema";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

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
      triggerHaptic('success');
      toast({ title: "Richiesta inviata", description: "Controlla la tua email per verificare il tuo indirizzo" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
    triggerHaptic('medium');
    if (landing?.authorizedDomains && landing.authorizedDomains.length > 0) {
      const emailDomain = data.email.split("@")[1];
      if (!landing.authorizedDomains.includes(emailDomain)) {
        triggerHaptic('error');
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
      <MobileAppLayout className="bg-background">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springConfig}
            className="w-full"
          >
            <div className="flex flex-col items-center mb-8">
              <Skeleton className="h-24 w-24 rounded-3xl mb-6" />
              <Skeleton className="h-8 w-48 mb-3" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="space-y-5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
              <Skeleton className="h-14 w-full rounded-xl mt-6" />
            </div>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (error || !landing) {
    return (
      <MobileAppLayout className="bg-background">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={springConfig}
            className="w-full text-center"
          >
            <motion.div 
              className="w-24 h-24 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springConfig, delay: 0.1 }}
            >
              <AlertCircle className="h-12 w-12 text-destructive" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Pagina non trovata</h1>
            <p className="text-base text-muted-foreground leading-relaxed px-4">
              Questa pagina di richiesta badge non esiste o non è più attiva.
            </p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (!landing.isActive) {
    return (
      <MobileAppLayout className="bg-background">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={springConfig}
            className="w-full text-center"
          >
            <motion.div 
              className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springConfig, delay: 0.1 }}
            >
              <GraduationCap className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Richieste chiuse</h1>
            <p className="text-base text-muted-foreground leading-relaxed px-4">
              Le richieste di badge per questa scuola non sono attualmente aperte.
            </p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (submitted) {
    return (
      <MobileAppLayout className="bg-background">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={springConfig}
            className="w-full text-center"
          >
            <motion.div 
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: landing.primaryColor || "#3b82f6" }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springConfig, delay: 0.1 }}
            >
              <CheckCircle2 className="h-12 w-12 text-white" />
            </motion.div>
            <motion.h1 
              className="text-2xl font-bold text-foreground mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.2 }}
            >
              Richiesta inviata
            </motion.h1>
            <motion.p 
              className="text-base text-muted-foreground leading-relaxed px-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.3 }}
            >
              {landing.customThankYouText || "Grazie per la tua richiesta! Controlla la tua email per verificare il tuo indirizzo e completare la procedura."}
            </motion.p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  const termsTextToShow = landing.termsText || DEFAULT_TERMS_TEXT;
  const privacyTextToShow = landing.privacyText || DEFAULT_PRIVACY_TEXT;
  const marketingTextToShow = landing.marketingText || DEFAULT_MARKETING_TEXT;

  return (
    <MobileAppLayout 
      className="bg-background"
      contentClassName="pb-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig}
        className="w-full px-5 py-6"
        data-testid="card-badge-request"
      >
        <motion.div 
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.1 }}
        >
          <img 
            src="/logo.png" 
            alt="Event4U" 
            className="h-10 w-auto mb-6"
            data-testid="img-event4u-logo"
          />
          
          {landing.logoUrl ? (
            <motion.img 
              src={landing.logoUrl} 
              alt={landing.schoolName} 
              className="w-24 h-24 rounded-3xl object-cover mb-5"
              data-testid="img-school-logo"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springConfig, delay: 0.15 }}
            />
          ) : (
            <motion.div 
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
              style={{ backgroundColor: landing.primaryColor || "#3b82f6" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springConfig, delay: 0.15 }}
            >
              <GraduationCap className="h-12 w-12 text-white" />
            </motion.div>
          )}
          
          <h1 className="text-2xl font-bold text-foreground text-center mb-2" data-testid="text-school-name">
            {landing.schoolName}
          </h1>
          <p className="text-base text-muted-foreground text-center leading-relaxed px-2">
            {landing.customWelcomeText || landing.description || "Richiedi il tuo badge digitale compilando il form sottostante."}
          </p>
          
          {landing.authorizedDomains && landing.authorizedDomains.length > 0 && (
            <p className="text-sm text-muted-foreground/70 mt-3 text-center">
              Email autorizzate: {landing.authorizedDomains.map(d => `@${d}`).join(", ")}
            </p>
          )}
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.2 }}
            >
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nome</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          {...field} 
                          className="h-14 pl-12 text-base rounded-xl" 
                          placeholder="Mario" 
                          data-testid="input-first-name"
                          onFocus={() => triggerHaptic('light')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.25 }}
            >
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Cognome</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          {...field} 
                          className="h-14 pl-12 text-base rounded-xl" 
                          placeholder="Rossi" 
                          data-testid="input-last-name"
                          onFocus={() => triggerHaptic('light')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.3 }}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          {...field} 
                          type="email" 
                          className="h-14 pl-12 text-base rounded-xl" 
                          placeholder="mario.rossi@scuola.edu.it" 
                          data-testid="input-email"
                          onFocus={() => triggerHaptic('light')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.35 }}
            >
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Telefono {!landing.requirePhone && "(opzionale)"}
                </FormLabel>
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="phonePrefix"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            className="w-24 h-14 text-base rounded-xl" 
                            data-testid="select-phone-prefix"
                            onClick={() => triggerHaptic('light')}
                          >
                            <SelectValue placeholder="+39" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PHONE_PREFIXES.map((prefix) => (
                            <SelectItem 
                              key={prefix.code} 
                              value={prefix.code}
                              className="min-h-[44px] text-base"
                            >
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
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type="tel" 
                            className="h-14 pl-12 text-base rounded-xl" 
                            placeholder="123 456 7890" 
                            data-testid="input-phone"
                            onFocus={() => triggerHaptic('light')}
                          />
                        </div>
                      </FormControl>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>
            </motion.div>

            {landing.requireTerms && (
              <motion.div 
                className="space-y-4 pt-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: 0.4 }}
              >
                <FormField
                  control={form.control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0 p-4 bg-muted/30 rounded-xl">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="h-6 w-6 mt-0.5"
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-relaxed flex-1">
                        <FormLabel className="text-base font-normal cursor-pointer">
                          Accetto i{" "}
                          <span 
                            className="text-primary underline" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              triggerHaptic('light');
                              setTermsOpen(!termsOpen); 
                            }}
                          >
                            termini e condizioni
                          </span>{" "}
                          e l'{" "}
                          <span 
                            className="text-primary underline" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              triggerHaptic('light');
                              setPrivacyOpen(!privacyOpen); 
                            }}
                          >
                            informativa sulla privacy
                          </span>{" "}*
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full flex items-center justify-between min-h-[44px] px-4 py-3 text-muted-foreground rounded-xl bg-muted/20 active:bg-muted/40"
                      type="button"
                      onClick={() => triggerHaptic('light')}
                      data-testid="button-toggle-terms"
                    >
                      <span className="text-sm font-medium">Termini e condizioni</span>
                      <motion.div
                        animate={{ rotate: termsOpen ? 180 : 0 }}
                        transition={springConfig}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div 
                      className="p-4 text-sm text-muted-foreground bg-muted/30 rounded-xl mt-2 leading-relaxed"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      data-testid="text-terms-content"
                    >
                      {termsTextToShow}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full flex items-center justify-between min-h-[44px] px-4 py-3 text-muted-foreground rounded-xl bg-muted/20 active:bg-muted/40"
                      type="button"
                      onClick={() => triggerHaptic('light')}
                      data-testid="button-toggle-privacy"
                    >
                      <span className="text-sm font-medium">Informativa sulla privacy</span>
                      <motion.div
                        animate={{ rotate: privacyOpen ? 180 : 0 }}
                        transition={springConfig}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div 
                      className="p-4 text-sm text-muted-foreground bg-muted/30 rounded-xl mt-2 leading-relaxed"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      data-testid="text-privacy-content"
                    >
                      {privacyTextToShow}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}

            {landing.showMarketing && (
              <motion.div 
                className="space-y-4 pt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: 0.45 }}
              >
                <FormField
                  control={form.control}
                  name="acceptedMarketing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0 p-4 bg-muted/30 rounded-xl">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="h-6 w-6 mt-0.5"
                          data-testid="checkbox-marketing"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-relaxed flex-1">
                        <FormLabel className="text-base font-normal cursor-pointer">
                          Acconsento a ricevere comunicazioni promozionali
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Collapsible open={marketingOpen} onOpenChange={setMarketingOpen}>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full flex items-center justify-between min-h-[44px] px-4 py-3 text-muted-foreground rounded-xl bg-muted/20 active:bg-muted/40"
                      type="button"
                      onClick={() => triggerHaptic('light')}
                      data-testid="button-toggle-marketing"
                    >
                      <span className="text-sm font-medium">Dettagli sul consenso marketing</span>
                      <motion.div
                        animate={{ rotate: marketingOpen ? 180 : 0 }}
                        transition={springConfig}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div 
                      className="p-4 text-sm text-muted-foreground bg-muted/30 rounded-xl mt-2 leading-relaxed"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      data-testid="text-marketing-content"
                    >
                      {marketingTextToShow}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.5 }}
              className="pt-4"
            >
              <HapticButton 
                type="submit" 
                className="w-full h-14 text-lg font-semibold rounded-xl"
                disabled={submitMutation.isPending}
                style={{ backgroundColor: landing.primaryColor || undefined }}
                hapticType="medium"
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  "Richiedi Badge"
                )}
              </HapticButton>
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </MobileAppLayout>
  );
}
