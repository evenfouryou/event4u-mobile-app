import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Send, Phone, Key, Lock, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, HapticButton, MobileAppLayout } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";
import { useTranslation } from "react-i18next";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

type ResetMode = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp' | 'success';

export default function PublicForgotPassword() {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<ResetMode>('email');
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+39");
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [userType, setUserType] = useState<string>('customer');
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
    setCustomerId(null);
    setUserType('customer');
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
      const response: any = await apiRequest('POST', '/api/public/customers/forgot-password', { email });
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
      const response: any = await apiRequest('POST', '/api/public/customers/forgot-password-phone', { phone: fullPhone });
      
      // If customerId is returned, phone was found - proceed to OTP step
      if (response.customerId) {
        setCustomerId(response.customerId);
        setUserType(response.userType || 'customer');
        setPhoneStep('otp');
        triggerHaptic('success');
      } else {
        // Phone not found but we show generic message for security
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
      await apiRequest('POST', '/api/public/customers/reset-password-phone', {
        customerId,
        userType,
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
      await apiRequest('POST', '/api/public/customers/resend-password-reset-otp', { customerId });
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

  const ModeToggle = ({ className = "" }: { className?: string }) => (
    <div className={`flex bg-muted rounded-lg p-1 ${className}`} data-testid="mode-toggle">
      <button
        type="button"
        onClick={() => handleModeChange('email')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
          mode === 'email'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        data-testid="tab-email"
      >
        <Mail className="h-4 w-4" />
        Email
      </button>
      <button
        type="button"
        onClick={() => handleModeChange('phone')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
          mode === 'phone'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        data-testid="tab-phone"
      >
        <Phone className="h-4 w-4" />
        Telefono
      </button>
    </div>
  );

  const AlertMessages = ({ testIdPrefix = "" }: { testIdPrefix?: string }) => (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={springTransition}
        >
          <Alert variant="destructive" data-testid={`${testIdPrefix}alert-error`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {success && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={springTransition}
        >
          <Alert data-testid={`${testIdPrefix}alert-success`} className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const LoadingSpinner = ({ size = "h-4 w-4" }: { size?: string }) => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`${size} border-2 border-primary-foreground border-t-transparent rounded-full`}
    />
  );

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-public-forgot-password-desktop">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/">
              <BrandLogo variant="horizontal" className="h-12 w-auto cursor-pointer" />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                {mode === 'email' ? (
                  <Mail className="h-8 w-8 text-primary" />
                ) : (
                  <Phone className="h-8 w-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">{t('auth.forgotPasswordTitle')}</CardTitle>
              <CardDescription>
                {mode === 'email' 
                  ? t('auth.forgotPasswordDescription')
                  : "Inserisci il tuo numero di telefono per ricevere un codice OTP"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModeToggle className="mb-6" />
              
              <AnimatePresence mode="wait">
                {mode === 'email' ? (
                  <motion.form
                    key="email-form"
                    onSubmit={handleEmailSubmit}
                    className="space-y-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={springTransition}
                  >
                    <AlertMessages />

                    <div className="space-y-2">
                      <Label htmlFor="email-desktop">{t('auth.email')}</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          id="email-desktop"
                          type="email"
                          placeholder={t('auth.enterEmail')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                          data-testid="input-email"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full gap-2" 
                      disabled={isLoading}
                      data-testid="button-submit-email"
                    >
                      {isLoading ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {t('auth.sendResetLink')}
                        </>
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="phone-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={springTransition}
                  >
                    <AnimatePresence mode="wait">
                      {phoneStep === 'phone' && (
                        <motion.form
                          key="phone-step"
                          onSubmit={handlePhoneSubmit}
                          className="space-y-6"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={springTransition}
                        >
                          <AlertMessages />

                          <div className="space-y-2">
                            <Label htmlFor="phone-desktop">Numero di telefono</Label>
                            <div className="flex gap-2">
                              <select
                                value={phonePrefix}
                                onChange={(e) => setPhonePrefix(e.target.value)}
                                className="w-24 h-10 px-2 text-sm border rounded-md bg-background border-input"
                                data-testid="select-phone-prefix"
                                disabled={isLoading}
                              >
                                <option value="+39">+39 IT</option>
                                <option value="+41">+41 CH</option>
                                <option value="+33">+33 FR</option>
                                <option value="+49">+49 DE</option>
                                <option value="+44">+44 UK</option>
                                <option value="+1">+1 US</option>
                                <option value="+34">+34 ES</option>
                                <option value="+43">+43 AT</option>
                                <option value="+32">+32 BE</option>
                                <option value="+31">+31 NL</option>
                              </select>
                              <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                  id="phone-desktop"
                                  type="tel"
                                  placeholder="Inserisci il tuo numero"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  required
                                  disabled={isLoading}
                                  data-testid="input-phone"
                                  className="pl-10"
                                />
                              </div>
                            </div>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full gap-2" 
                            disabled={isLoading}
                            data-testid="button-submit-phone"
                          >
                            {isLoading ? (
                              <LoadingSpinner />
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Invia codice OTP
                              </>
                            )}
                          </Button>
                        </motion.form>
                      )}

                      {phoneStep === 'otp' && (
                        <motion.form
                          key="otp-step"
                          onSubmit={handleOtpSubmit}
                          className="space-y-6"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={springTransition}
                        >
                          <AlertMessages />

                          <div className="space-y-2">
                            <Label htmlFor="otp-desktop">Codice OTP</Label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Key className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                id="otp-desktop"
                                type="text"
                                placeholder="Inserisci il codice OTP"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                required
                                disabled={isLoading}
                                data-testid="input-otp"
                                className="pl-10"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password-desktop">Nuova password</Label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                id="password-desktop"
                                type="password"
                                placeholder="Minimo 8 caratteri"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isLoading}
                                data-testid="input-password"
                                className="pl-10"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              La password deve contenere almeno 8 caratteri
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleResendOtp}
                              disabled={isResending || isLoading}
                              data-testid="button-resend-otp"
                              className="gap-2"
                            >
                              {isResending ? (
                                <LoadingSpinner />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Reinvia OTP
                            </Button>
                            <Button 
                              type="submit" 
                              className="flex-1 gap-2" 
                              disabled={isLoading}
                              data-testid="button-submit-otp"
                            >
                              {isLoading ? (
                                <LoadingSpinner />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Reimposta password
                                </>
                              )}
                            </Button>
                          </div>
                        </motion.form>
                      )}

                      {phoneStep === 'success' && (
                        <motion.div
                          key="success-step"
                          className="text-center py-6"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={springTransition}
                        >
                          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2" data-testid="text-success-title">
                            Password reimpostata!
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4" data-testid="text-success-message">
                            La tua password è stata reimpostata con successo.
                          </p>
                          <Button asChild className="gap-2" data-testid="button-goto-login">
                            <Link href="/login">
                              Vai al login
                            </Link>
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {phoneStep !== 'success' && (
                <div className="text-center mt-6">
                  <p className="text-muted-foreground text-sm">
                    {t('auth.rememberPassword')}{" "}
                    <Link 
                      href="/login" 
                      className="text-primary font-medium hover:underline" 
                      data-testid="link-login"
                    >
                      {t('auth.login')}
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button variant="ghost" size="sm" asChild data-testid="button-back-home">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('auth.backToHome')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
      <Link href="/">
        <BrandLogo variant="horizontal" className="h-10 w-auto cursor-pointer" />
      </Link>
      <HapticButton 
        variant="ghost" 
        size="icon"
        asChild 
        data-testid="button-back-login"
        className="h-11 w-11"
        hapticType="light"
      >
        <Link href="/login">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </HapticButton>
    </div>
  );

  return (
    <MobileAppLayout header={header} contentClassName="flex flex-col justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="w-full"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
        >
          {mode === 'email' ? (
            <Mail className="h-10 w-10 text-primary" />
          ) : (
            <Phone className="h-10 w-10 text-primary" />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('auth.forgotPasswordTitle')}</h1>
          <p className="text-muted-foreground text-base">
            {mode === 'email' 
              ? t('auth.forgotPasswordDescription')
              : "Inserisci il tuo numero di telefono per ricevere un codice OTP"
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.18 }}
          className="mb-6"
        >
          <ModeToggle />
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'email' ? (
            <motion.form 
              key="email-form-mobile"
              onSubmit={handleEmailSubmit} 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springTransition}
            >
              <AlertMessages testIdPrefix="mobile-" />

              <div className="space-y-3">
                <Label htmlFor="email" className="text-muted-foreground text-base font-medium">
                  {t('auth.email')}
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-email-mobile"
                    className="h-14 pl-12 pr-4 text-base bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                  />
                </div>
              </div>

              <HapticButton 
                type="submit" 
                className="w-full h-14 text-base font-semibold rounded-xl gap-2" 
                disabled={isLoading}
                data-testid="button-submit-email-mobile"
                hapticType="medium"
              >
                {isLoading ? (
                  <LoadingSpinner size="h-5 w-5" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {t('auth.sendResetLink')}
                  </>
                )}
              </HapticButton>
            </motion.form>
          ) : (
            <motion.div
              key="phone-form-mobile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
            >
              <AnimatePresence mode="wait">
                {phoneStep === 'phone' && (
                  <motion.form
                    key="phone-step-mobile"
                    onSubmit={handlePhoneSubmit}
                    className="space-y-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={springTransition}
                  >
                    <AlertMessages testIdPrefix="mobile-" />

                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-muted-foreground text-base font-medium">
                        Numero di telefono
                      </Label>
                      <div className="flex gap-2">
                        <select
                          value={phonePrefix}
                          onChange={(e) => setPhonePrefix(e.target.value)}
                          className="w-24 h-14 px-3 text-base border rounded-xl bg-muted/50 border-border text-foreground"
                          data-testid="select-phone-prefix-mobile"
                          disabled={isLoading}
                        >
                          <option value="+39">+39 IT</option>
                          <option value="+41">+41 CH</option>
                          <option value="+33">+33 FR</option>
                          <option value="+49">+49 DE</option>
                          <option value="+44">+44 UK</option>
                          <option value="+1">+1 US</option>
                          <option value="+34">+34 ES</option>
                          <option value="+43">+43 AT</option>
                          <option value="+32">+32 BE</option>
                          <option value="+31">+31 NL</option>
                        </select>
                        <div className="relative flex-1">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="Inserisci il tuo numero"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            disabled={isLoading}
                            data-testid="input-phone-mobile"
                            className="h-14 pl-12 pr-4 text-base bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    <HapticButton 
                      type="submit" 
                      className="w-full h-14 text-base font-semibold rounded-xl gap-2" 
                      disabled={isLoading}
                      data-testid="button-submit-phone-mobile"
                      hapticType="medium"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="h-5 w-5" />
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Invia codice OTP
                        </>
                      )}
                    </HapticButton>
                  </motion.form>
                )}

                {phoneStep === 'otp' && (
                  <motion.form
                    key="otp-step-mobile"
                    onSubmit={handleOtpSubmit}
                    className="space-y-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={springTransition}
                  >
                    <AlertMessages testIdPrefix="mobile-" />

                    <div className="space-y-3">
                      <Label htmlFor="otp" className="text-muted-foreground text-base font-medium">
                        Codice OTP
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Key className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Inserisci il codice OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          required
                          disabled={isLoading}
                          data-testid="input-otp-mobile"
                          className="h-14 pl-12 pr-4 text-base bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-muted-foreground text-base font-medium">
                        Nuova password
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Minimo 8 caratteri"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          disabled={isLoading}
                          data-testid="input-password-mobile"
                          className="h-14 pl-12 pr-4 text-base bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        La password deve contenere almeno 8 caratteri
                      </p>
                    </div>

                    <HapticButton
                      type="button"
                      variant="outline"
                      onClick={handleResendOtp}
                      disabled={isResending || isLoading}
                      data-testid="button-resend-otp-mobile"
                      className="w-full h-12 text-base rounded-xl gap-2"
                      hapticType="light"
                    >
                      {isResending ? (
                        <LoadingSpinner size="h-5 w-5" />
                      ) : (
                        <RefreshCw className="h-5 w-5" />
                      )}
                      Reinvia OTP
                    </HapticButton>

                    <HapticButton 
                      type="submit" 
                      className="w-full h-14 text-base font-semibold rounded-xl gap-2" 
                      disabled={isLoading}
                      data-testid="button-submit-otp-mobile"
                      hapticType="medium"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="h-5 w-5" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Reimposta password
                        </>
                      )}
                    </HapticButton>
                  </motion.form>
                )}

                {phoneStep === 'success' && (
                  <motion.div
                    key="success-step-mobile"
                    className="text-center py-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springTransition}
                  >
                    <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2" data-testid="text-success-title-mobile">
                      Password reimpostata!
                    </h3>
                    <p className="text-muted-foreground text-base mb-6" data-testid="text-success-message-mobile">
                      La tua password è stata reimpostata con successo.
                    </p>
                    <HapticButton 
                      asChild 
                      className="w-full h-14 text-base font-semibold rounded-xl gap-2" 
                      data-testid="button-goto-login-mobile"
                      hapticType="medium"
                    >
                      <Link href="/login">
                        Vai al login
                      </Link>
                    </HapticButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {phoneStep !== 'success' && (
          <motion.div 
            className="text-center pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...springTransition, delay: 0.3 }}
          >
            <p className="text-muted-foreground text-base">
              {t('auth.rememberPassword')}{" "}
              <Link 
                href="/login" 
                className="text-primary font-semibold active:opacity-70 transition-opacity" 
                data-testid="link-login-mobile"
                onClick={() => triggerHaptic('light')}
              >
                {t('auth.login')}
              </Link>
            </p>
          </motion.div>
        )}
      </motion.div>
    </MobileAppLayout>
  );
}
