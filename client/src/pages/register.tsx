import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  Phone,
  ArrowRight,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Building2,
  Ticket,
  MapPin,
  Calendar,
  Globe,
  Globe2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { triggerHaptic } from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";

type AccountType = "cliente" | "gestore" | null;

type TFunction = (key: string) => string;

const createGestoreRegisterSchema = (t: TFunction) => z.object({
  email: z.string().email(t('auth.validation.invalidEmail')),
  password: z.string().min(8, t('auth.validation.passwordMinLength')),
  confirmPassword: z.string(),
  firstName: z.string().min(1, t('auth.validation.firstNameRequired')),
  lastName: z.string().min(1, t('auth.validation.lastNameRequired')),
  operatingMode: z.enum(['italy_only', 'international_only', 'hybrid']).default('italy_only'),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: t('auth.validation.acceptTermsRequired')
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: t('auth.validation.acceptPrivacyRequired')
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.validation.passwordsDoNotMatch'),
  path: ["confirmPassword"],
});

const createClienteRegisterSchema = (t: TFunction) => z.object({
  firstName: z.string().min(1, t('auth.validation.firstNameRequired')),
  lastName: z.string().min(1, t('auth.validation.lastNameRequired')),
  email: z.string().email(t('auth.validation.invalidEmail')),
  phone: z.string().min(10, t('auth.validation.invalidPhone')),
  password: z.string().min(8, t('auth.validation.passwordMinLength')),
  birthDate: z.string().optional(),
  gender: z.enum(['M', 'F']).optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  province: z.string().max(2).optional(),
  postalCode: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: t('auth.validation.acceptTermsRequired')
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: t('auth.validation.acceptPrivacyRequired')
  }),
});

type GestoreFormValues = z.infer<ReturnType<typeof createGestoreRegisterSchema>>;
type ClienteFormValues = z.infer<ReturnType<typeof createClienteRegisterSchema>>;

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

export default function Register() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [gestoreSuccess, setGestoreSuccess] = useState(false);
  const [clienteOtpStep, setClienteOtpStep] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const { data: gestoreRegEnabled, isLoading: checkingGestore } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/public/registration-enabled'],
  });

  const { data: clienteRegEnabled, isLoading: checkingCliente } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/public/customer-registration-enabled'],
  });

  const gestoreRegisterSchema = createGestoreRegisterSchema(t);
  const clienteRegisterSchema = createClienteRegisterSchema(t);

  const gestoreForm = useForm<GestoreFormValues>({
    resolver: zodResolver(gestoreRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      operatingMode: "italy_only",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const clienteForm = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteRegisterSchema),
    defaultValues: {
      email: "",
      phone: "",
      firstName: "",
      lastName: "",
      password: "",
      birthDate: "",
      gender: undefined,
      street: "",
      city: "",
      province: "",
      postalCode: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const gestoreMutation = useMutation({
    mutationFn: async (data: GestoreFormValues) => {
      const { confirmPassword, acceptTerms, acceptPrivacy, operatingMode, ...registerData } = data;
      return await apiRequest('POST', '/api/register', { ...registerData, role: 'gestore', operatingMode });
    },
    onSuccess: () => {
      triggerHaptic('success');
      setGestoreSuccess(true);
      toast({
        title: t('auth.registrationCompletedTitle'),
        description: t('auth.checkEmailWelcome'),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: t('auth.error'),
        description: error.message || t('auth.registrationFailed'),
        variant: "destructive",
      });
    },
  });

  const handleClienteRegister = async (data: ClienteFormValues) => {
    triggerHaptic('medium');
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/public/customers/register", {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        birthDate: data.birthDate || undefined,
        gender: data.gender || undefined,
        street: data.street || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        postalCode: data.postalCode || undefined,
      });
      const result = await res.json();
      setCustomerId(result.customerId);
      setClienteOtpStep(true);
      triggerHaptic('success');
      toast({
        title: t('auth.registrationStarted'),
        description: t('auth.otpSentToPhone'),
      });
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: t('auth.registrationError'),
        description: error.message || t('auth.registrationFailedMessage'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6 || !customerId) return;
    triggerHaptic('medium');
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/public/customers/verify-otp", {
        customerId,
        otpCode: otpValue,
      });
      triggerHaptic('success');
      toast({
        title: t('auth.verificationCompleted'),
        description: t('auth.accountActivated'),
      });
      navigate("/login");
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: t('auth.verificationError'),
        description: error.message || t('auth.invalidOTPCode'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingGestore || checkingCliente) {
    return (
      <div 
        className="fixed inset-0 bg-background flex items-center justify-center"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('auth.loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (gestoreSuccess) {
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-register-success">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">{t('auth.registrationCompletedTitle')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('auth.checkEmailVerification')}
              </p>
              <Link href="/login">
                <Button className="w-full" size="lg" data-testid="button-go-login">
                  {t('auth.goToLogin')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div 
        className="fixed inset-0 bg-background flex items-center justify-center px-6"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.3) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="glass-card p-8 max-w-md w-full text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-black" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-3">{t('auth.registrationCompletedTitle')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('auth.checkEmailVerification')}
          </p>
          <Link href="/login">
            <button
              onClick={() => triggerHaptic('medium')}
              className="w-full h-14 rounded-xl gradient-golden text-black font-semibold text-lg active:scale-[0.98] transition-transform"
              data-testid="button-go-login"
            >
              {t('auth.goToLogin')}
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (clienteOtpStep) {
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-register-otp">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                <Shield className="h-8 w-8 text-black" />
              </div>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('auth.verifyOTP')}</h1>
                <p className="text-muted-foreground">
                  {t('auth.enterOTPCode')}
                </p>
              </div>
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => setOtpValue(value)}
                  data-testid="input-otp"
                >
                  <InputOTPGroup className="gap-2">
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-12 w-10 text-lg border-border bg-muted/30 text-foreground rounded-md"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleVerifyOTP}
                  disabled={otpValue.length !== 6 || isLoading}
                  className="w-full"
                  size="lg"
                  data-testid="button-verify"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {t('auth.verify')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setClienteOtpStep(false);
                    setOtpValue("");
                  }}
                  className="w-full"
                  data-testid="button-back-to-form"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div 
        className="fixed inset-0 bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.4) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="mx-auto mb-8 h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center"
              >
                <Shield className="h-10 w-10 text-black" />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('auth.verifyOTP')}</h1>
                <p className="text-muted-foreground">
                  {t('auth.enterOTPCode')}
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mb-8"
              >
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    if (value.length === 6) triggerHaptic('light');
                  }}
                  data-testid="input-otp"
                >
                  <InputOTPGroup className="gap-2">
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-14 w-12 text-xl border-border bg-muted/30 text-foreground rounded-xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <button
                  onClick={handleVerifyOTP}
                  disabled={otpValue.length !== 6 || isLoading}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                  data-testid="button-verify"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t('auth.verify')}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setClienteOtpStep(false);
                    setOtpValue("");
                  }}
                  className="w-full h-14 rounded-xl border border-border text-muted-foreground font-medium flex items-center justify-center gap-2 active:bg-muted/20 transition-colors"
                  data-testid="button-back-to-form"
                >
                  <ArrowLeft className="w-5 h-5" />
                  {t('common.back')}
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (accountType === null) {
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-register-select">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-2">
              <BrandLogo variant="vertical" className="h-20 w-auto mx-auto mb-4" />
              <CardTitle className="text-2xl">{t('auth.createAccount')}</CardTitle>
              <CardDescription>{t('auth.selectAccountType')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => {
                  if (clienteRegEnabled?.enabled === false) {
                    toast({
                      title: t('auth.customerRegistrationSuspended'),
                      description: t('auth.customerRegistrationDisabled'),
                      variant: "destructive"
                    });
                    return;
                  }
                  setAccountType("cliente");
                }}
                className="w-full p-4 rounded-lg border border-border hover-elevate flex items-center gap-4 text-left transition-colors"
                data-testid="button-select-cliente"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
                  <Ticket className="w-6 h-6 text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{t('auth.customer')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('auth.customerDescription')}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              <button
                onClick={() => {
                  if (gestoreRegEnabled?.enabled === false) {
                    toast({
                      title: t('auth.organizerRegistrationSuspended'),
                      description: t('auth.organizerRegistrationDisabled'),
                      variant: "destructive"
                    });
                    return;
                  }
                  setAccountType("gestore");
                }}
                className={`w-full p-4 rounded-lg border border-border hover-elevate flex items-center gap-4 text-left transition-colors ${gestoreRegEnabled?.enabled === false ? 'opacity-50' : ''}`}
                data-testid="button-select-gestore"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{t('auth.organizer')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('auth.organizerDescription')}
                  </p>
                  {gestoreRegEnabled?.enabled === false && (
                    <p className="text-red-400 text-xs mt-1">{t('common.suspended')}</p>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              <div className="text-center pt-4">
                <p className="text-muted-foreground">
                  {t('auth.hasAccount')}{" "}
                  <Link href="/login" className="text-primary font-semibold">
                    {t('auth.login')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div 
        className="fixed inset-0 bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
            animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between px-4 py-3"
        >
          <Link href="/">
            <button 
              onClick={() => triggerHaptic('light')}
              className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/20 transition-colors"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
        </motion.div>

        <div className="flex-1 flex flex-col px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center mb-10"
          >
            <BrandLogo variant="vertical" className="h-24 w-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">{t('auth.createAccount')}</h1>
            <p className="text-muted-foreground text-center mt-2">
              {t('auth.selectAccountType')}
            </p>
          </motion.div>

          <div className="flex-1 flex flex-col justify-center gap-4 max-w-md mx-auto w-full">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, ...springTransition }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic('medium');
                if (clienteRegEnabled?.enabled === false) {
                  toast({
                    title: t('auth.customerRegistrationSuspended'),
                    description: t('auth.customerRegistrationDisabled'),
                    variant: "destructive"
                  });
                  return;
                }
                setAccountType("cliente");
              }}
              className="glass-card p-6 rounded-2xl flex items-center gap-5 text-left active:scale-[0.98] transition-transform"
              data-testid="button-select-cliente"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
                <Ticket className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">{t('auth.customer')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('auth.customerDescription')}
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground shrink-0" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, ...springTransition }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic('medium');
                if (gestoreRegEnabled?.enabled === false) {
                  toast({
                    title: t('auth.organizerRegistrationSuspended'),
                    description: t('auth.organizerRegistrationDisabled'),
                    variant: "destructive"
                  });
                  return;
                }
                setAccountType("gestore");
              }}
              className={`glass-card p-6 rounded-2xl flex items-center gap-5 text-left active:scale-[0.98] transition-transform ${gestoreRegEnabled?.enabled === false ? 'opacity-50' : ''}`}
              data-testid="button-select-gestore"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">{t('auth.organizer')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('auth.organizerDescription')}
                </p>
                {gestoreRegEnabled?.enabled === false && (
                  <p className="text-red-400 text-xs mt-1">{t('common.suspended')}</p>
                )}
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground shrink-0" />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-muted-foreground">
              {t('auth.hasAccount')}{" "}
              <Link href="/login" className="text-primary font-semibold">
                {t('auth.login')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (accountType === "gestore") {
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-register-gestore">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAccountType(null)}
                className="absolute left-4 top-4"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3">
                <Building2 className="h-7 w-7 text-black" />
              </div>
              <CardTitle className="text-xl">{t('auth.registerAsOrganizer')}</CardTitle>
              <CardDescription>{t('auth.createManagerAccount')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...gestoreForm}>
                <form onSubmit={gestoreForm.handleSubmit((data) => gestoreMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={gestoreForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.firstName')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input {...field} placeholder={t('auth.placeholders.firstName')} className="pl-10" data-testid="input-firstname" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={gestoreForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.lastName')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('auth.placeholders.lastName')} data-testid="input-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={gestoreForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.email')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input {...field} type="email" placeholder={t('auth.placeholders.email')} className="pl-10" data-testid="input-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gestoreForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.password')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-10 pr-10"
                              data-testid="input-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gestoreForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-10 pr-10"
                              data-testid="input-confirm-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gestoreForm.control}
                    name="operatingMode"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          Modalità Operativa
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-2"
                            data-testid="radio-group-operating-mode"
                          >
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                              <RadioGroupItem value="italy_only" id="italy_only" data-testid="radio-italy-only" />
                              <div className="flex-1">
                                <label htmlFor="italy_only" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                                  <span>🇮🇹</span> Solo Italia
                                </label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Gestione eventi in Italia con integrazione SIAE obbligatoria
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                              <RadioGroupItem value="international_only" id="international_only" data-testid="radio-international-only" />
                              <div className="flex-1">
                                <label htmlFor="international_only" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                                  <span>🌍</span> Solo Estero
                                </label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Gestione eventi internazionali, senza requisiti SIAE
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                              <RadioGroupItem value="hybrid" id="hybrid" data-testid="radio-hybrid" />
                              <div className="flex-1">
                                <label htmlFor="hybrid" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                                  <span>🌐</span> Italia + Estero
                                </label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Gestione mista, scegli per ogni evento se applicare SIAE
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3 pt-2">
                    <FormField
                      control={gestoreForm.control}
                      name="acceptTerms"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                              data-testid="checkbox-terms"
                            />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-sm font-normal">
                              {t('auth.acceptTerms')}{" - "}
                              <Link href="/terms" className="text-primary underline">Terms</Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={gestoreForm.control}
                      name="acceptPrivacy"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                              data-testid="checkbox-privacy"
                            />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-sm font-normal">
                              {t('auth.acceptPrivacy')}{" - "}
                              <Link href="/privacy" className="text-primary underline">Policy</Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={gestoreMutation.isPending}
                    className="w-full"
                    size="lg"
                    data-testid="button-register"
                  >
                    {gestoreMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {t('auth.register')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <div className="text-center pt-2">
                    <p className="text-muted-foreground text-sm">
                      {t('auth.hasAccount')}{" "}
                      <Link href="/login" className="text-primary font-semibold">{t('auth.login')}</Link>
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div 
        className="fixed inset-0 bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(255,165,0,0.2) 0%, transparent 70%)" }}
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between px-4 py-3"
          >
            <button 
              onClick={() => {
                triggerHaptic('light');
                setAccountType(null);
              }}
              className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/20 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </motion.div>

          <div className="flex-1 flex flex-col px-6 pb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                <Building2 className="h-8 w-8 text-black" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{t('auth.registerAsOrganizer')}</h1>
              <p className="text-muted-foreground text-center mt-1">
                {t('auth.createManagerAccount')}
              </p>
            </motion.div>

            <Form {...gestoreForm}>
              <form onSubmit={gestoreForm.handleSubmit((data) => gestoreMutation.mutate(data))} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <FormField
                    control={gestoreForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.firstName')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder={t('auth.placeholders.firstName')}
                              className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-firstname"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gestoreForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.lastName')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('auth.placeholders.lastName')}
                            className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.email')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder={t('auth.placeholders.email')}
                              className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.password')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-password"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setShowPassword(!showPassword);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.confirmPassword')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-confirm-password"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setShowConfirmPassword(!showConfirmPassword);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="operatingMode"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                          <Globe className="h-4 w-4 text-primary" />
                          {t('auth.operatingMode')}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              triggerHaptic('light');
                              field.onChange(value);
                            }}
                            defaultValue={field.value}
                            className="space-y-2"
                            data-testid="radio-group-operating-mode-mobile"
                          >
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                              <RadioGroupItem value="italy_only" id="italy_only_mobile" className="mt-0.5" data-testid="radio-italy-only-mobile" />
                              <div className="flex-1">
                                <label htmlFor="italy_only_mobile" className="text-sm font-medium cursor-pointer flex items-center gap-2 text-foreground">
                                  <span>🇮🇹</span> {t('auth.operatingModes.italyOnly')}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('auth.operatingModes.italyOnlyDesc')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                              <RadioGroupItem value="international_only" id="international_only_mobile" className="mt-0.5" data-testid="radio-international-only-mobile" />
                              <div className="flex-1">
                                <label htmlFor="international_only_mobile" className="text-sm font-medium cursor-pointer flex items-center gap-2 text-foreground">
                                  <span>🌍</span> {t('auth.operatingModes.internationalOnly')}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('auth.operatingModes.internationalOnlyDesc')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                              <RadioGroupItem value="hybrid" id="hybrid_mobile" className="mt-0.5" data-testid="radio-hybrid-mobile" />
                              <div className="flex-1">
                                <label htmlFor="hybrid_mobile" className="text-sm font-medium cursor-pointer flex items-center gap-2 text-foreground">
                                  <span>🌐</span> {t('auth.operatingModes.hybrid')}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('auth.operatingModes.hybridDesc')}
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4 pt-2"
                >
                  <FormField
                    control={gestoreForm.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              triggerHaptic('light');
                              field.onChange(checked);
                            }}
                            className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            data-testid="checkbox-terms"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                            {t('auth.acceptTerms')}{" - "}
                            <Link href="/terms" className="text-primary underline">
                              Terms
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gestoreForm.control}
                    name="acceptPrivacy"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              triggerHaptic('light');
                              field.onChange(checked);
                            }}
                            className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            data-testid="checkbox-privacy"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                            {t('auth.acceptPrivacy')}{" - "}
                            <Link href="/privacy" className="text-primary underline">
                              Policy
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="pt-4"
                >
                  <button
                    type="submit"
                    disabled={gestoreMutation.isPending}
                    onClick={() => triggerHaptic('medium')}
                    className="w-full h-14 rounded-xl gradient-golden text-black font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                    data-testid="button-register"
                  >
                    {gestoreMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t('auth.register')}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.div>
              </form>
            </Form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-8"
            >
              <p className="text-muted-foreground">
                {t('auth.hasAccount')}{" "}
                <Link href="/login" className="text-primary font-semibold">
                  {t('auth.login')}
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-register-cliente">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAccountType(null)}
              className="absolute left-4 top-4"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-3">
              <Ticket className="h-7 w-7 text-black" />
            </div>
            <CardTitle className="text-xl">{t('auth.registerAsCustomer')}</CardTitle>
            <CardDescription>{t('auth.register')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...clienteForm}>
              <form onSubmit={clienteForm.handleSubmit(handleClienteRegister)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={clienteForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.firstName')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input {...field} placeholder={t('auth.placeholders.firstName')} className="pl-10" data-testid="input-firstname" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clienteForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.lastName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('auth.placeholders.lastName')} data-testid="input-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={clienteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="email" placeholder={t('auth.placeholders.email')} className="pl-10" data-testid="input-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clienteForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.phone')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="tel" placeholder={t('auth.placeholders.phone')} className="pl-10" data-testid="input-phone" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clienteForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={clienteForm.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.birthDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-birth-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clienteForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.gender.label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M">{t('auth.gender.male')}</SelectItem>
                            <SelectItem value="F">{t('auth.gender.female')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={clienteForm.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.street')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder={t('auth.placeholders.street')} {...field} className="pl-10" data-testid="input-street" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={clienteForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.city')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.placeholders.city')} {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clienteForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.postalCode')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.placeholders.postalCode')} maxLength={5} {...field} data-testid="input-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={clienteForm.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.province')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('auth.placeholders.province')} maxLength={2} {...field} className="uppercase" data-testid="input-province" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-3 pt-2">
                  <FormField
                    control={clienteForm.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                            data-testid="checkbox-terms"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-sm font-normal">
                            {t('auth.acceptTerms')}{" - "}
                            <Link href="/terms" className="text-primary underline">Terms</Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clienteForm.control}
                    name="acceptPrivacy"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                            data-testid="checkbox-privacy"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-sm font-normal">
                            {t('auth.acceptPrivacy')}{" - "}
                            <Link href="/privacy" className="text-primary underline">Policy</Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {t('auth.register')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <div className="text-center pt-2">
                  <p className="text-muted-foreground text-sm">
                    {t('auth.hasAccount')}{" "}
                    <Link href="/login" className="text-primary font-semibold">{t('auth.login')}</Link>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-background flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between px-4 py-3"
        >
          <button 
            onClick={() => {
              triggerHaptic('light');
              setAccountType(null);
            }}
            className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/20 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </motion.div>

        <div className="flex-1 flex flex-col px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
              <Ticket className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t('auth.registerAsCustomer')}</h1>
            <p className="text-muted-foreground text-center mt-1">
              {t('auth.register')}
            </p>
          </motion.div>

          <Form {...clienteForm}>
            <form onSubmit={clienteForm.handleSubmit(handleClienteRegister)} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <FormField
                  control={clienteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.firstName')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Mario"
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-firstname"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clienteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.lastName')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('auth.placeholders.lastName')}
                          className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.email')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder={t('auth.placeholders.email')}
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.phone')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder={t('auth.placeholders.phone')}
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-14 pl-12 pr-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setShowPassword(!showPassword);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.37 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <FormField
                  control={clienteForm.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.birthDate')}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                          data-testid="input-birth-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clienteForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.gender.label')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl" data-testid="select-gender">
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">{t('auth.gender.male')}</SelectItem>
                          <SelectItem value="F">{t('auth.gender.female')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.street')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder={t('auth.placeholders.street')}
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-street"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.39 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <FormField
                  control={clienteForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.city')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('auth.placeholders.city')}
                          className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clienteForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.postalCode')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('auth.placeholders.postalCode')}
                          maxLength={5}
                          className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                          data-testid="input-postal-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.395 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">{t('auth.province')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('auth.placeholders.province')}
                          maxLength={2}
                          className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl uppercase"
                          data-testid="input-province"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 pt-2"
              >
                <FormField
                  control={clienteForm.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                          {t('auth.acceptTerms')}{" - "}
                          <Link href="/terms" className="text-primary underline">
                            Terms
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={clienteForm.control}
                  name="acceptPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          data-testid="checkbox-privacy"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                          {t('auth.acceptPrivacy')}{" - "}
                          <Link href="/privacy" className="text-primary underline">
                            Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="pt-4"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={() => triggerHaptic('medium')}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t('auth.register')}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </Form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-muted-foreground">
              {t('auth.hasAccount')}{" "}
              <Link href="/login" className="text-primary font-semibold">
                {t('auth.login')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
