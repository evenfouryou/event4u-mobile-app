import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Phone, Key, Lock, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  MobileAppLayout, 
  HapticButton, 
  triggerHaptic 
} from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

type ResetMode = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp' | 'success';

const phonePrefixes = [
  { code: "+39", country: "IT", label: "Italia (+39)" },
  { code: "+41", country: "CH", label: "Svizzera (+41)" },
  { code: "+33", country: "FR", label: "Francia (+33)" },
  { code: "+49", country: "DE", label: "Germania (+49)" },
  { code: "+43", country: "AT", label: "Austria (+43)" },
  { code: "+386", country: "SI", label: "Slovenia (+386)" },
  { code: "+385", country: "HR", label: "Croazia (+385)" },
  { code: "+377", country: "MC", label: "Monaco (+377)" },
  { code: "+378", country: "SM", label: "San Marino (+378)" },
  { code: "+379", country: "VA", label: "Vaticano (+379)" },
  { code: "+44", country: "UK", label: "Regno Unito (+44)" },
  { code: "+34", country: "ES", label: "Spagna (+34)" },
];

export default function ForgotPassword() {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<ResetMode>('email');
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+39");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const resetState = () => {
    setEmail("");
    setPhone("");
    setUserId(null);
    setOtpCode("");
    setPassword("");
    setPhoneStep('phone');
    setError("");
    setSuccess("");
  };

  const handleModeChange = (newMode: ResetMode) => {
    if (newMode !== mode) {
      resetState();
      setMode(newMode);
      triggerHaptic('light');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const response: any = await apiRequest('POST', '/api/forgot-password', { email });
      setSuccess(response.message || t('auth.resetLinkSent'));
      setEmail("");
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || t('auth.genericError'));
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const fullPhone = phonePrefix + phone.replace(/^0+/, '');
      const response: any = await apiRequest('POST', '/api/forgot-password-phone', { phone: fullPhone });
      
      if (response.userId) {
        setUserId(response.userId);
        setPhoneStep('otp');
        triggerHaptic('success');
      } else {
        setSuccess("Se il numero è registrato, riceverai un codice OTP. Verifica il tuo telefono.");
        triggerHaptic('medium');
      }
    } catch (err: any) {
      setError(err.message || "Errore nell'invio del codice OTP");
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri");
      triggerHaptic('error');
      return;
    }
    
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      await apiRequest('POST', '/api/reset-password-phone', {
        userId,
        otpCode,
        password
      });
      setPhoneStep('success');
      setSuccess("Password reimpostata con successo!");
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || "Errore nella reimpostazione della password");
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setIsResending(true);
    triggerHaptic('medium');

    try {
      await apiRequest('POST', '/api/resend-password-reset-otp', { userId });
      setSuccess("Codice OTP reinviato con successo!");
      triggerHaptic('success');
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Errore nel reinvio del codice OTP");
      triggerHaptic('error');
    } finally {
      setIsResending(false);
    }
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="page-forgot-password">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" data-testid="link-home">
              <BrandLogo variant="horizontal" className="h-16 w-auto" />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t('auth.forgotPasswordTitle')}</CardTitle>
              <CardDescription>
                {t('auth.forgotPasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mode selector tabs */}
              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  variant={mode === 'email' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleModeChange('email')}
                  data-testid="tab-email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={mode === 'phone' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleModeChange('phone')}
                  data-testid="tab-phone"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Telefono
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                    data-testid="alert-error"
                  >
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-destructive text-sm">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3"
                    data-testid="alert-success"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email mode */}
              {mode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email-desktop">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <Input
                        id="email-desktop"
                        type="email"
                        placeholder={t('auth.enterEmail')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pl-10"
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full"
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('auth.sending')}</span>
                      </span>
                    ) : (
                      <span>{t('auth.sendLink')}</span>
                    )}
                  </Button>
                </form>
              )}

              {/* Phone mode */}
              {mode === 'phone' && phoneStep === 'phone' && (
                <form onSubmit={handlePhoneSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone-desktop">Numero di telefono</Label>
                    <div className="flex gap-2">
                      <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                        <SelectTrigger className="w-[140px]" data-testid="select-phone-prefix">
                          <SelectValue placeholder="Prefisso" />
                        </SelectTrigger>
                        <SelectContent>
                          {phonePrefixes.map((p) => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.country} {p.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="phone-desktop"
                          type="tel"
                          placeholder="123 456 7890"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          required
                          disabled={isLoading}
                          className="pl-10"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !phone}
                    className="w-full"
                    data-testid="button-send-otp"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Invio in corso...</span>
                      </span>
                    ) : (
                      <span>Invia codice OTP</span>
                    )}
                  </Button>
                </form>
              )}

              {/* OTP verification step */}
              {mode === 'phone' && phoneStep === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Inserisci il codice OTP ricevuto via SMS e la nuova password
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Codice OTP</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <Input
                        id="otp-code"
                        type="text"
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        disabled={isLoading}
                        className="pl-10 text-center text-xl tracking-widest"
                        maxLength={6}
                        data-testid="input-otp"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nuova password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Minimo 8 caratteri"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pl-10"
                        data-testid="input-new-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6 || password.length < 8}
                    className="w-full"
                    data-testid="button-reset-password"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Reimpostazione...</span>
                      </span>
                    ) : (
                      <span>Reimposta password</span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="w-full"
                    data-testid="button-resend-otp"
                  >
                    {isResending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reinvia codice OTP
                  </Button>
                </form>
              )}

              {/* Success step */}
              {mode === 'phone' && phoneStep === 'success' && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <p className="text-lg font-medium">Password reimpostata!</p>
                  <p className="text-sm text-muted-foreground">
                    Ora puoi accedere con la tua nuova password.
                  </p>
                  <Link href="/login">
                    <Button className="w-full" data-testid="button-go-to-login">
                      Vai al login
                    </Button>
                  </Link>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-login"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('auth.backToLogin')}</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <MobileAppLayout
      noPadding
      contentClassName="flex flex-col items-center justify-center px-6 py-8"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, ...springConfig }}
          className="mb-10"
        >
          <Link 
            href="/"
            onClick={() => triggerHaptic('light')}
            className="block min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <BrandLogo variant="horizontal" className="h-20 w-auto" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, ...springConfig }}
          className="w-full text-center mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3">
            {t('auth.forgotPasswordTitle')}
          </h1>
          <p className="text-muted-foreground text-lg px-4">
            {t('auth.forgotPasswordDescription')}
          </p>
        </motion.div>

        {/* Mode selector tabs */}
        <div className="flex gap-2 w-full mb-6">
          <Button
            type="button"
            variant={mode === 'email' ? 'default' : 'outline'}
            className="flex-1 h-14"
            onClick={() => handleModeChange('email')}
            data-testid="tab-email-mobile"
          >
            <Mail className="h-5 w-5 mr-2" />
            Email
          </Button>
          <Button
            type="button"
            variant={mode === 'phone' ? 'default' : 'outline'}
            className="flex-1 h-14"
            onClick={() => handleModeChange('phone')}
            data-testid="tab-phone-mobile"
          >
            <Phone className="h-5 w-5 mr-2" />
            Telefono
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springConfig}
              className="w-full mb-6 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-4"
              data-testid="alert-error-mobile"
            >
              <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-base leading-relaxed">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springConfig}
              className="w-full mb-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-start gap-4"
              data-testid="alert-success-mobile"
            >
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              <p className="text-green-600 dark:text-green-400 text-base leading-relaxed">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email mode - mobile */}
        {mode === 'email' && (
          <motion.form 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springConfig }}
            onSubmit={handleEmailSubmit} 
            className="w-full space-y-8"
          >
            <div className="space-y-4">
              <Label htmlFor="email" className="text-lg font-medium">
                {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-16 pl-14 pr-5 text-lg rounded-2xl border-2 focus:border-primary"
                  data-testid="input-email-mobile"
                />
              </div>
            </div>

            <motion.div
              whileTap={{ scale: 0.98 }}
              transition={springConfig}
            >
              <HapticButton
                type="submit"
                disabled={isLoading}
                hapticType="medium"
                className="w-full h-16 text-lg font-semibold rounded-2xl"
                data-testid="button-submit-mobile"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>{t('auth.sending')}</span>
                  </span>
                ) : (
                  <span>{t('auth.sendLink')}</span>
                )}
              </HapticButton>
            </motion.div>
          </motion.form>
        )}

        {/* Phone mode - mobile */}
        {mode === 'phone' && phoneStep === 'phone' && (
          <motion.form 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springConfig }}
            onSubmit={handlePhoneSubmit} 
            className="w-full space-y-8"
          >
            <div className="space-y-4">
              <Label className="text-lg font-medium">Numero di telefono</Label>
              <div className="flex gap-2">
                <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                  <SelectTrigger className="w-[120px] h-16 rounded-2xl border-2" data-testid="select-phone-prefix-mobile">
                    <SelectValue placeholder="Prefisso" />
                  </SelectTrigger>
                  <SelectContent>
                    {phonePrefixes.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.country} {p.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />
                  <Input
                    type="tel"
                    placeholder="123 456 7890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isLoading}
                    className="h-16 pl-14 pr-5 text-lg rounded-2xl border-2 focus:border-primary"
                    data-testid="input-phone-mobile"
                  />
                </div>
              </div>
            </div>

            <HapticButton
              type="submit"
              disabled={isLoading || !phone}
              hapticType="medium"
              className="w-full h-16 text-lg font-semibold rounded-2xl"
              data-testid="button-send-otp-mobile"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Invio in corso...</span>
                </span>
              ) : (
                <span>Invia codice OTP</span>
              )}
            </HapticButton>
          </motion.form>
        )}

        {/* OTP verification - mobile */}
        {mode === 'phone' && phoneStep === 'otp' && (
          <motion.form 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springConfig }}
            onSubmit={handleOtpSubmit} 
            className="w-full space-y-6"
          >
            <div className="text-center mb-4">
              <p className="text-muted-foreground">
                Inserisci il codice OTP ricevuto via SMS
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-medium">Codice OTP</Label>
              <div className="relative">
                <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={isLoading}
                  className="h-16 pl-14 text-xl text-center tracking-widest rounded-2xl border-2 focus:border-primary"
                  maxLength={6}
                  data-testid="input-otp-mobile"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-medium">Nuova password</Label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  placeholder="Minimo 8 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-16 pl-14 pr-5 text-lg rounded-2xl border-2 focus:border-primary"
                  data-testid="input-new-password-mobile"
                />
              </div>
            </div>

            <HapticButton
              type="submit"
              disabled={isLoading || otpCode.length !== 6 || password.length < 8}
              hapticType="medium"
              className="w-full h-16 text-lg font-semibold rounded-2xl"
              data-testid="button-reset-password-mobile"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Reimpostazione...</span>
                </span>
              ) : (
                <span>Reimposta password</span>
              )}
            </HapticButton>

            <Button
              type="button"
              variant="ghost"
              onClick={handleResendOtp}
              disabled={isResending}
              className="w-full h-14"
              data-testid="button-resend-otp-mobile"
            >
              {isResending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-2" />
              )}
              Reinvia codice OTP
            </Button>
          </motion.form>
        )}

        {/* Success step - mobile */}
        {mode === 'phone' && phoneStep === 'success' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springConfig}
            className="w-full text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <p className="text-xl font-medium">Password reimpostata!</p>
            <p className="text-muted-foreground">
              Ora puoi accedere con la tua nuova password.
            </p>
            <Link href="/login">
              <HapticButton 
                hapticType="medium"
                className="w-full h-16 text-lg font-semibold rounded-2xl" 
                data-testid="button-go-to-login-mobile"
              >
                Vai al login
              </HapticButton>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, ...springConfig }}
          className="mt-10"
        >
          <Link 
            href="/login" 
            onClick={() => triggerHaptic('light')}
            className="flex items-center justify-center gap-3 text-muted-foreground min-h-[48px] min-w-[48px] px-6 py-3 rounded-xl active:bg-muted/50 transition-colors"
            data-testid="link-login-mobile"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="text-lg font-medium">{t('auth.backToLogin')}</span>
          </Link>
        </motion.div>
      </motion.div>
    </MobileAppLayout>
  );
}
