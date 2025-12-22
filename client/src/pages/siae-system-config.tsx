import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronRight,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { 
  insertSiaeSystemConfigSchema, 
  type SiaeSystemConfig
} from "@shared/schema";
import { useLocation } from "wouter";

const springConfig = { stiffness: 400, damping: 30 };

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
  businessName: null,
  businessAddress: null,
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

interface ConfigSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  enabled?: boolean;
}

function ConfigSectionCard({ icon: Icon, title, description, isActive, onClick, enabled }: ConfigSectionProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={springConfig}
    >
      <Card 
        className={`cursor-pointer transition-all border-2 ${isActive ? 'border-primary bg-primary/5' : 'border-transparent'}`}
        onClick={() => {
          triggerHaptic('light');
          onClick();
        }}
        data-testid={`card-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{title}</h3>
              <p className="text-muted-foreground text-sm truncate">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              {enabled !== undefined && (
                <span className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ToggleFieldProps {
  icon?: React.ElementType;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
}

function MobileToggleField({ icon: Icon, label, description, checked, onCheckedChange, testId }: ToggleFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
    >
      <div className="flex items-center justify-between rounded-2xl bg-card border p-5 min-h-[72px]">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-base">{label}</p>
            {description && (
              <p className="text-muted-foreground text-sm truncate">{description}</p>
            )}
          </div>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={(val) => {
            triggerHaptic('light');
            onCheckedChange(val);
          }}
          className="shrink-0 ml-4"
          data-testid={testId}
        />
      </div>
    </motion.div>
  );
}

type SectionType = 'menu' | 'azienda' | 'captcha' | 'otp' | 'policy' | 'system';

export default function SiaeSystemConfigPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<SectionType>('menu');

  const configQueryKey = ["/api/siae/config"] as const;

  const { data: config, isLoading: configLoading } = useQuery<SiaeSystemConfig | null>({
    queryKey: configQueryKey,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (config) {
      form.reset({
        businessName: config.businessName,
        businessAddress: config.businessAddress,
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
    } else {
      form.reset(defaultFormValues);
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("PUT", "/api/siae/config", data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({
        title: "Configurazione salvata",
        description: "Le impostazioni del sistema SIAE sono state aggiornate",
      });
      queryClient.invalidateQueries({ queryKey: configQueryKey });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (activeSection === 'menu') {
      navigate('/settings');
    } else {
      setActiveSection('menu');
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'azienda': return 'Dati Azienda';
      case 'captcha': return 'CAPTCHA';
      case 'otp': return 'OTP';
      case 'policy': return 'Policy Biglietteria';
      case 'system': return 'Sistema SIAE';
      default: return 'Configurazione SIAE';
    }
  };

  const renderHeader = () => (
    <MobileHeader
      title={getSectionTitle()}
      showBackButton
      showUserMenu
      onBack={handleBack}
      rightAction={
        activeSection !== 'menu' ? (
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
            hapticType="medium"
            data-testid="button-save-header"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
          </HapticButton>
        ) : undefined
      }
    />
  );

  const renderFooter = () => {
    if (activeSection === 'menu') return null;
    
    return (
      <div className="p-4 bg-card/95 backdrop-blur-xl border-t border-border">
        <HapticButton
          onClick={form.handleSubmit(onSubmit)}
          disabled={saveMutation.isPending}
          className="w-full h-14 text-base font-semibold rounded-2xl"
          hapticType="success"
          data-testid="button-save-config"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salva Configurazione
            </>
          )}
        </HapticButton>
      </div>
    );
  };

  if (configLoading) {
    return (
      <MobileAppLayout header={renderHeader()}>
        <div className="flex items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout 
      header={renderHeader()}
      footer={renderFooter()}
      data-testid="page-siae-system-config"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="pb-24" data-testid="form-system-config">
          <AnimatePresence mode="wait">
            {activeSection === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={springConfig}
                className="space-y-4 py-4"
              >
                <div className="px-1 mb-6">
                  <h2 className="text-2xl font-bold" data-testid="title-page">Configurazione Sistema</h2>
                  <p className="text-muted-foreground" data-testid="description-page">Gestisci CAPTCHA, OTP e policy</p>
                </div>

                <div className="space-y-3">
                  <ConfigSectionCard
                    icon={Building2}
                    title="Dati Azienda"
                    description="Ragione sociale, P.IVA, PEC"
                    isActive={false}
                    onClick={() => setActiveSection('azienda')}
                  />
                  <ConfigSectionCard
                    icon={Image}
                    title="CAPTCHA"
                    description="Protezione anti-bot"
                    isActive={false}
                    onClick={() => setActiveSection('captcha')}
                    enabled={form.watch('captchaEnabled')}
                  />
                  <ConfigSectionCard
                    icon={Smartphone}
                    title="OTP"
                    description="Verifica telefonica"
                    isActive={false}
                    onClick={() => setActiveSection('otp')}
                    enabled={form.watch('otpEnabled')}
                  />
                  <ConfigSectionCard
                    icon={Shield}
                    title="Policy Biglietteria"
                    description="Limiti e regole vendita"
                    isActive={false}
                    onClick={() => setActiveSection('policy')}
                  />
                  <ConfigSectionCard
                    icon={Lock}
                    title="Sistema SIAE"
                    description="Credenziali e trasmissioni"
                    isActive={false}
                    onClick={() => setActiveSection('system')}
                  />
                </div>
              </motion.div>
            )}

            {activeSection === 'azienda' && (
              <motion.div
                key="azienda"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springConfig}
                className="space-y-4 py-4"
                data-testid="tabcontent-azienda"
              >
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-5">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Ragione Sociale</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Es: Event4U S.r.l."
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-business-name"
                            />
                          </FormControl>
                          <FormDescription>
                            Nome legale dell'azienda titolare
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="systemCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Codice Sistema SIAE</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Es: SYS00001"
                              maxLength={8}
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-system-code"
                            />
                          </FormControl>
                          <FormDescription>
                            Codice univoco assegnato da SIAE (8 caratteri)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Indirizzo Sede Legale</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Es: Via Roma 123, 20100 Milano (MI)"
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-business-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Codice Fiscale</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Es: 12345678901"
                              maxLength={16}
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-tax-id"
                            />
                          </FormControl>
                          <FormDescription>
                            Codice Fiscale del titolare (CFTitolare)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Partita IVA</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Es: IT12345678901"
                              maxLength={13}
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-vat-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <FormField
                      control={form.control}
                      name="pecEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Email PEC</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="azienda@pec.it"
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-pec-email"
                            />
                          </FormControl>
                          <FormDescription>
                            PEC per comunicazioni ufficiali SIAE
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siaeEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Email SIAE</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="utente@siae.it"
                              className="h-14 text-base rounded-xl"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-siae-email"
                            />
                          </FormControl>
                          <FormDescription>
                            Email registrata presso SIAE
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeSection === 'captcha' && (
              <motion.div
                key="captcha"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springConfig}
                className="space-y-4 py-4"
                data-testid="tabcontent-captcha"
              >
                <FormField
                  control={form.control}
                  name="captchaEnabled"
                  render={({ field }) => (
                    <MobileToggleField
                      icon={Image}
                      label="CAPTCHA Attivo"
                      description="Protezione anti-bot per acquisti"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      testId="switch-captcha-enabled"
                    />
                  )}
                />

                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-5">
                    <FormField
                      control={form.control}
                      name="captchaMinChars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Caratteri Minimi</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base">Livello Distorsione</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger className="h-14 text-base rounded-xl" data-testid="select-captcha-distortion">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="select-captcha-distortion-content">
                              <SelectItem value="low" className="min-h-[44px]" data-testid="select-captcha-distortion-low">
                                Basso - Facile da leggere
                              </SelectItem>
                              <SelectItem value="medium" className="min-h-[44px]" data-testid="select-captcha-distortion-medium">
                                Medio - Bilanciato
                              </SelectItem>
                              <SelectItem value="high" className="min-h-[44px]" data-testid="select-captcha-distortion-high">
                                Alto - Massima sicurezza
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <FormField
                      control={form.control}
                      name="captchaImageWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Larghezza Immagine (px)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base">Altezza Immagine (px)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
                              {...field}
                              data-testid="input-captcha-height"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="captchaAudioEnabled"
                  render={({ field }) => (
                    <MobileToggleField
                      icon={Volume2}
                      label="CAPTCHA Audio"
                      description="Versione audio per accessibilità"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      testId="switch-captcha-audio"
                    />
                  )}
                />
              </motion.div>
            )}

            {activeSection === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springConfig}
                className="space-y-4 py-4"
                data-testid="tabcontent-otp"
              >
                <FormField
                  control={form.control}
                  name="otpEnabled"
                  render={({ field }) => (
                    <MobileToggleField
                      icon={Smartphone}
                      label="OTP Attivo"
                      description="Verifica telefonica per clienti"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      testId="switch-otp-enabled"
                    />
                  )}
                />

                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-5">
                    <FormField
                      control={form.control}
                      name="otpDigits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            Cifre OTP
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Timeout (sec)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Tentativi Max
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
                              {...field}
                              data-testid="input-otp-max-attempts"
                            />
                          </FormControl>
                          <FormDescription>1-10 tentativi</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <FormField
                      control={form.control}
                      name="otpCooldownSeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Cooldown Reinvio (sec)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base">Provider SMS</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger className="h-14 text-base rounded-xl" data-testid="select-otp-provider">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="select-otp-provider-content">
                              <SelectItem value="twilio" className="min-h-[44px]" data-testid="select-otp-provider-twilio">
                                Twilio
                              </SelectItem>
                              <SelectItem value="nexmo" className="min-h-[44px]" data-testid="select-otp-provider-nexmo">
                                Nexmo (Vonage)
                              </SelectItem>
                              <SelectItem value="custom" className="min-h-[44px]" data-testid="select-otp-provider-custom">
                                Provider Personalizzato
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="otpVoiceEnabled"
                  render={({ field }) => (
                    <MobileToggleField
                      icon={Volume2}
                      label="OTP Vocale"
                      description="Invio OTP tramite chiamata vocale"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      testId="switch-otp-voice"
                    />
                  )}
                />
              </motion.div>
            )}

            {activeSection === 'policy' && (
              <motion.div
                key="policy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springConfig}
                className="space-y-4 py-4"
                data-testid="tabcontent-policy"
              >
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-5">
                    <FormField
                      control={form.control}
                      name="maxTicketsPerEvent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Max Biglietti per Evento</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base">Soglia Capienza</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-14 text-base rounded-xl"
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
                  </CardContent>
                </Card>

                <Separator className="my-2" />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="nominativeTicketsEnabled"
                    render={({ field }) => (
                      <MobileToggleField
                        icon={CheckCircle2}
                        label="Biglietti Nominativi"
                        description="Abilita vendita biglietti nominativi"
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        testId="switch-nominative-tickets"
                      />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="changeNameEnabled"
                    render={({ field }) => (
                      <MobileToggleField
                        icon={RefreshCw}
                        label="Cambio Nominativo"
                        description="Consenti cambio nome su biglietti"
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        testId="switch-change-name"
                      />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resaleEnabled"
                    render={({ field }) => (
                      <MobileToggleField
                        icon={Shield}
                        label="Rimessa in Vendita"
                        description="Consenti secondary ticketing"
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        testId="switch-resale"
                      />
                    )}
                  />
                </div>
              </motion.div>
            )}

            {activeSection === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springConfig}
                className="space-y-4 py-4"
                data-testid="tabcontent-system"
              >
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-5">
                    <FormField
                      control={form.control}
                      name="systemCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Codice Sistema SIAE</FormLabel>
                          <FormControl>
                            <Input
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base">Codice Fiscale Titolare</FormLabel>
                          <FormControl>
                            <Input
                              className="h-14 text-base rounded-xl"
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

                    <FormField
                      control={form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Partita IVA</FormLabel>
                          <FormControl>
                            <Input
                              className="h-14 text-base rounded-xl"
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
                          <FormLabel className="text-base">Email PEC</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              className="h-14 text-base rounded-xl"
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

                    <FormField
                      control={form.control}
                      name="siaeEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Email SIAE</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              className="h-14 text-base rounded-xl"
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

                    <Separator className="my-6" />

                    <FormField
                      control={form.control}
                      name="transmissionPecAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">PEC Agenzia Entrate</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              className="h-14 text-base rounded-xl"
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
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="autoTransmitDaily"
                  render={({ field }) => (
                    <MobileToggleField
                      icon={RefreshCw}
                      label="Trasmissione Automatica"
                      description="Invia report giornalieri automaticamente"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      testId="switch-auto-transmit"
                    />
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>
    </MobileAppLayout>
  );
}
