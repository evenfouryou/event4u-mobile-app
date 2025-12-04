import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Smartphone,
  Settings,
  Lock,
  Image,
  Volume2,
  Clock,
  Hash,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react";
import { 
  insertSiaeSystemConfigSchema, 
  type Company, 
  type SiaeSystemConfig
} from "@shared/schema";

const formSchema = insertSiaeSystemConfigSchema.extend({
  captchaMinChars: z.coerce.number().min(4).max(8),
  captchaImageWidth: z.coerce.number().min(200).max(800),
  captchaImageHeight: z.coerce.number().min(100).max(400),
  otpDigits: z.coerce.number().min(4).max(8),
  otpTimeoutSeconds: z.coerce.number().min(60).max(600),
  otpMaxAttempts: z.coerce.number().min(1).max(10),
  otpCooldownSeconds: z.coerce.number().min(30).max(300),
  maxTicketsPerEvent: z.coerce.number().min(1).max(100),
  capacityThreshold: z.coerce.number().min(100).max(100000),
  spidLevel: z.coerce.number().min(1).max(3),
});

type FormData = z.infer<typeof formSchema>;

const defaultFormValues: Partial<FormData> = {
  companyId: "",
  systemCode: null,
  taxId: null,
  vatNumber: null,
  pecEmail: null,
  siaeEmail: null,
  captchaEnabled: true,
  captchaMinChars: 5,
  captchaImageWidth: 400,
  captchaImageHeight: 200,
  captchaFonts: ["Arial", "Verdana"],
  captchaDistortion: "medium",
  captchaAudioEnabled: true,
  otpEnabled: true,
  otpDigits: 6,
  otpTimeoutSeconds: 300,
  otpMaxAttempts: 3,
  otpCooldownSeconds: 60,
  otpProvider: "twilio",
  otpVoiceEnabled: true,
  spidEnabled: false,
  spidLevel: 2,
  spidProviders: ["poste", "aruba"],
  maxTicketsPerEvent: 10,
  capacityThreshold: 5000,
  nominativeTicketsEnabled: true,
  changeNameEnabled: true,
  resaleEnabled: true,
  ticketTemplatePdf: null,
  ticketTemplatePrint: null,
  autoTransmitDaily: false,
  transmissionPecAddress: "misuratorifiscali@pec.agenziaentrate.it",
};

export default function SiaeSystemConfigPage() {
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const configQueryKey = ["/api/siae/companies", selectedCompany, "config"] as const;

  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery<SiaeSystemConfig | null>({
    queryKey: configQueryKey,
    enabled: !!selectedCompany,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (config) {
      form.reset({
        companyId: config.companyId,
        systemCode: config.systemCode,
        taxId: config.taxId,
        vatNumber: config.vatNumber,
        pecEmail: config.pecEmail,
        siaeEmail: config.siaeEmail,
        captchaEnabled: config.captchaEnabled ?? true,
        captchaMinChars: config.captchaMinChars ?? 5,
        captchaImageWidth: config.captchaImageWidth ?? 400,
        captchaImageHeight: config.captchaImageHeight ?? 200,
        captchaFonts: config.captchaFonts ?? ["Arial", "Verdana"],
        captchaDistortion: (config.captchaDistortion as "low" | "medium" | "high") ?? "medium",
        captchaAudioEnabled: config.captchaAudioEnabled ?? true,
        otpEnabled: config.otpEnabled ?? true,
        otpDigits: config.otpDigits ?? 6,
        otpTimeoutSeconds: config.otpTimeoutSeconds ?? 300,
        otpMaxAttempts: config.otpMaxAttempts ?? 3,
        otpCooldownSeconds: config.otpCooldownSeconds ?? 60,
        otpProvider: (config.otpProvider as "twilio" | "nexmo" | "custom") ?? "twilio",
        otpVoiceEnabled: config.otpVoiceEnabled ?? true,
        spidEnabled: config.spidEnabled ?? false,
        spidLevel: config.spidLevel ?? 2,
        spidProviders: config.spidProviders ?? ["poste", "aruba"],
        maxTicketsPerEvent: config.maxTicketsPerEvent ?? 10,
        capacityThreshold: config.capacityThreshold ?? 5000,
        nominativeTicketsEnabled: config.nominativeTicketsEnabled ?? true,
        changeNameEnabled: config.changeNameEnabled ?? true,
        resaleEnabled: config.resaleEnabled ?? true,
        ticketTemplatePdf: config.ticketTemplatePdf,
        ticketTemplatePrint: config.ticketTemplatePrint,
        autoTransmitDaily: config.autoTransmitDaily ?? false,
        transmissionPecAddress: config.transmissionPecAddress ?? "misuratorifiscali@pec.agenziaentrate.it",
      });
    } else if (selectedCompany) {
      form.reset({ ...defaultFormValues, companyId: selectedCompany });
    }
  }, [config, selectedCompany, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        companyId: selectedCompany,
      };
      const response = await apiRequest("PUT", `/api/siae/companies/${selectedCompany}/config`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurazione salvata",
        description: "Le impostazioni sono state aggiornate con successo",
      });
      queryClient.invalidateQueries({ queryKey: configQueryKey });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
  };

  const onSubmit = (data: FormData) => {
    if (!selectedCompany) {
      toast({
        title: "Errore",
        description: "Seleziona un'azienda prima di salvare",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full pb-24 md:pb-8" data-testid="page-siae-system-config">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="title-page">
          Configurazione Sistema SIAE
        </h1>
        <p className="text-muted-foreground text-sm md:text-base" data-testid="description-page">
          Impostazioni CAPTCHA, OTP e policy biglietteria
        </p>
      </div>

      <Card className="glass-card" data-testid="card-company-selector">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Seleziona Azienda
          </CardTitle>
          <CardDescription>
            Scegli l'azienda per configurare il sistema biglietteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select value={selectedCompany} onValueChange={handleCompanyChange}>
                <SelectTrigger data-testid="select-company">
                  <SelectValue placeholder="Seleziona un'azienda" />
                </SelectTrigger>
                <SelectContent data-testid="select-company-content">
                  {companies.map((company) => (
                    <SelectItem 
                      key={company.id} 
                      value={company.id}
                      data-testid={`select-company-option-${company.id}`}
                    >
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCompany && (
              <Button
                variant="outline"
                onClick={() => refetchConfig()}
                disabled={configLoading}
                data-testid="button-refresh-config"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${configLoading ? "animate-spin" : ""}`} />
                Ricarica
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCompany ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} data-testid="form-system-config">
            <Tabs defaultValue="captcha" className="w-full" data-testid="tabs-config">
              <TabsList className="grid w-full grid-cols-4 mb-6" data-testid="tabs-list">
                <TabsTrigger value="captcha" className="flex items-center gap-2" data-testid="tab-captcha">
                  <Image className="w-4 h-4" />
                  <span className="hidden md:inline">CAPTCHA</span>
                </TabsTrigger>
                <TabsTrigger value="otp" className="flex items-center gap-2" data-testid="tab-otp">
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden md:inline">OTP</span>
                </TabsTrigger>
                <TabsTrigger value="policy" className="flex items-center gap-2" data-testid="tab-policy">
                  <Shield className="w-4 h-4" />
                  <span className="hidden md:inline">Policy</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2" data-testid="tab-system">
                  <Lock className="w-4 h-4" />
                  <span className="hidden md:inline">Sistema</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="captcha" data-testid="tabcontent-captcha">
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Image className="w-5 h-5 text-primary" />
                          Configurazione CAPTCHA
                        </CardTitle>
                        <CardDescription>
                          Protezione anti-bot per acquisti biglietti
                        </CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="captchaEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel className="text-sm">Attivo</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-captcha-enabled"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="captchaMinChars"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Caratteri Minimi</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-captcha-min-chars"
                              />
                            </FormControl>
                            <FormDescription>
                              Numero di caratteri nel CAPTCHA (4-8)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="captchaDistortion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Livello Distorsione</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-captcha-distortion">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent data-testid="select-captcha-distortion-content">
                                <SelectItem value="low" data-testid="select-captcha-distortion-low">
                                  Basso - Facile da leggere
                                </SelectItem>
                                <SelectItem value="medium" data-testid="select-captcha-distortion-medium">
                                  Medio - Bilanciato
                                </SelectItem>
                                <SelectItem value="high" data-testid="select-captcha-distortion-high">
                                  Alto - Massima sicurezza
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="captchaImageWidth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Larghezza Immagine (px)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-captcha-width"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="captchaImageHeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Altezza Immagine (px)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-captcha-height"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="captchaAudioEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4" />
                              CAPTCHA Audio
                            </FormLabel>
                            <FormDescription>
                              Abilita versione audio per accessibilità
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-captcha-audio"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="otp" data-testid="tabcontent-otp">
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-primary" />
                          Configurazione OTP
                        </CardTitle>
                        <CardDescription>
                          Verifica telefonica per registrazione clienti
                        </CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="otpEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel className="text-sm">Attivo</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-otp-enabled"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="otpDigits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Hash className="w-4 h-4" />
                              Cifre OTP
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-otp-digits"
                              />
                            </FormControl>
                            <FormDescription>4-8 cifre</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="otpTimeoutSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Timeout (sec)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-otp-timeout"
                              />
                            </FormControl>
                            <FormDescription>60-600 secondi</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="otpMaxAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Tentativi Max
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-otp-max-attempts"
                              />
                            </FormControl>
                            <FormDescription>1-10 tentativi</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="otpCooldownSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cooldown Reinvio (sec)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-otp-cooldown"
                              />
                            </FormControl>
                            <FormDescription>
                              Attesa prima di poter richiedere nuovo OTP
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="otpProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider SMS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-otp-provider">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent data-testid="select-otp-provider-content">
                                <SelectItem value="twilio" data-testid="select-otp-provider-twilio">
                                  Twilio
                                </SelectItem>
                                <SelectItem value="nexmo" data-testid="select-otp-provider-nexmo">
                                  Nexmo (Vonage)
                                </SelectItem>
                                <SelectItem value="custom" data-testid="select-otp-provider-custom">
                                  Provider Personalizzato
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="otpVoiceEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4" />
                              OTP Vocale
                            </FormLabel>
                            <FormDescription>
                              Abilita invio OTP tramite chiamata vocale
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-otp-voice"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policy" data-testid="tabcontent-policy">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Policy Biglietteria
                    </CardTitle>
                    <CardDescription>
                      Limiti e regole per vendita biglietti
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxTicketsPerEvent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Biglietti per Evento</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-max-tickets"
                              />
                            </FormControl>
                            <FormDescription>
                              Limite acquisto per singolo utente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capacityThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Soglia Capienza</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-capacity-threshold"
                              />
                            </FormControl>
                            <FormDescription>
                              Oltre questa soglia: biglietti nominativi obbligatori
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="nominativeTicketsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Biglietti Nominativi
                              </FormLabel>
                              <FormDescription>
                                Abilita vendita biglietti nominativi
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-nominative-tickets"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="changeNameEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Cambio Nominativo
                              </FormLabel>
                              <FormDescription>
                                Consenti cambio nome su biglietti nominativi
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-change-name"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="resaleEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Rimessa in Vendita
                              </FormLabel>
                              <FormDescription>
                                Consenti secondary ticketing (rivendita)
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-resale"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" data-testid="tabcontent-system">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" />
                      Dati Sistema SIAE
                    </CardTitle>
                    <CardDescription>
                      Credenziali e configurazione trasmissioni
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="systemCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codice Sistema SIAE</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="ES: 12345678"
                                data-testid="input-system-code"
                              />
                            </FormControl>
                            <FormDescription>
                              Codice assegnato da SIAE
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codice Fiscale Titolare</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="RSSMRA80A01H501X"
                                data-testid="input-tax-id"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vatNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Partita IVA</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="12345678901"
                                data-testid="input-vat-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pecEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email PEC</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                value={field.value || ""}
                                placeholder="azienda@pec.it"
                                data-testid="input-pec-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="siaeEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email SIAE</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              {...field}
                              value={field.value || ""}
                              placeholder="Email assegnata da SIAE"
                              data-testid="input-siae-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="autoTransmitDaily"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Trasmissione Automatica
                              </FormLabel>
                              <FormDescription>
                                Invia automaticamente report giornalieri
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-auto-transmit"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transmissionPecAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PEC Agenzia Entrate</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-transmission-pec"
                              />
                            </FormControl>
                            <FormDescription>
                              Indirizzo PEC per invio report XML
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={saveMutation.isPending || !selectedCompany}
                className="min-w-[200px]"
                data-testid="button-save-config"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salva Configurazione
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Card className="glass-card" data-testid="card-no-company">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Seleziona un'azienda per visualizzare e modificare la configurazione
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
