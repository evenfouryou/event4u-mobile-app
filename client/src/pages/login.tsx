import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail, Phone, User, AtSign } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearch } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { triggerHaptic, HapticButton, SafeArea } from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";
import { useTranslation } from "react-i18next";

// Login method types
type LoginMethod = 'email' | 'username' | 'phone';

// Common international phone prefixes
const PHONE_PREFIXES = [
  { value: '+39', label: '+39 (IT)' },
  { value: '+1', label: '+1 (US)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+33', label: '+33 (FR)' },
  { value: '+49', label: '+49 (DE)' },
  { value: '+34', label: '+34 (ES)' },
  { value: '+41', label: '+41 (CH)' },
];

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function Login() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectTo = params.get("redirect");
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+39");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowResendVerification(false);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      // Route to appropriate login method based on selected tab
      if (loginMethod === 'phone') {
        // Phone login - supports both customers and PR users
        const fullPhone = `${phonePrefix}${phoneNumber}`;
        const response: any = await apiRequest('POST', '/api/auth/login', { 
          phone: fullPhone,
          password 
        });
        triggerHaptic('success');
        
        // Route based on role
        if (response.user?.role === 'cliente') {
          queryClient.invalidateQueries({ queryKey: ["/api/public/customers/me"] });
          window.location.href = redirectTo || '/account';
        } else if (response.user?.role === 'pr') {
          queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
          window.location.href = '/pr-app';
        } else {
          window.location.href = redirectTo || '/';
        }
        return;
      } else if (loginMethod === 'username') {
        // Username login - try SIAE cashier endpoint first, then fallback to auth/login
        try {
          // Try SIAE cashier login (uses siaeCashiers table)
          const cashierResponse: any = await apiRequest('POST', '/api/cashiers/login', { username, password });
          triggerHaptic('success');
          window.location.href = '/cashier/dashboard';
          return;
        } catch (cashierError: any) {
          // If cashier login fails, try regular auth with username
          const response: any = await apiRequest('POST', '/api/auth/login', { email: username, password });
          triggerHaptic('success');
          
          if (response.user?.role === 'scanner') {
            window.location.href = '/scanner';
          } else if (response.user?.role === 'cassiere') {
            window.location.href = '/cashier/dashboard';
          } else if (response.user?.role === 'bartender' || response.user?.role === 'warehouse') {
            window.location.href = '/staff';
          } else {
            window.location.href = redirectTo || '/';
          }
          return;
        }
      } else {
        // Email login (default)
        const response: any = await apiRequest('POST', '/api/auth/login', { email, password });
        
        triggerHaptic('success');
        if (response.user?.role === 'cliente') {
          window.location.href = redirectTo || '/account';
        } else if (response.user?.role === 'scanner') {
          window.location.href = '/scanner';
        } else {
          window.location.href = redirectTo || '/';
        }
        return;
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.message || t('auth.invalidCredentials'));
      if (err.message && err.message.includes("non verificata")) {
        setShowResendVerification(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    triggerHaptic('medium');
    try {
      const response: any = await apiRequest('POST', '/api/resend-verification', { email });
      triggerHaptic('success');
      toast({
        title: t('auth.emailSent'),
        description: response.message || t('auth.checkInbox'),
      });
      setShowResendVerification(false);
    } catch (err: any) {
      triggerHaptic('error');
      toast({
        title: t('auth.error'),
        description: err.message || t('auth.errorSendingEmail'),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" data-testid="page-login">
        <motion.div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[700px] h-[700px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="text-center space-y-4">
            <Link href="/" className="flex flex-col items-center gap-3">
              <BrandLogo variant="vertical" className="h-24 w-auto" />
            </Link>
            <div>
              <CardTitle className="text-2xl">{t('auth.login')}</CardTitle>
              <CardDescription>{t('auth.noAccount')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showResendVerification && (
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>{t('auth.emailNotVerified')}</p>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="w-full"
                        data-testid="button-resend-verification"
                      >
                        {isResending ? t('auth.resendingEmail') : t('auth.resendVerification')}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as LoginMethod)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="email" className="flex items-center gap-1.5" data-testid="tab-email">
                    <AtSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="username" className="flex items-center gap-1.5" data-testid="tab-username">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Username</span>
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="flex items-center gap-1.5" data-testid="tab-phone">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('auth.phone')}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {loginMethod === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
              )}

              {loginMethod === 'username' && (
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('auth.enterUsername')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-username"
                  />
                </div>
              )}

              {loginMethod === 'phone' && (
                <div className="space-y-2">
                  <Label>{t('auth.phoneLabel')}</Label>
                  <div className="flex gap-2">
                    <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                      <SelectTrigger className="w-[120px]" data-testid="select-phone-prefix">
                        <SelectValue placeholder="+39" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHONE_PREFIXES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t('auth.enterPhone')}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      required
                      className="flex-1"
                      data-testid="input-phone"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.staffAndPromoterAccess')}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.enterPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>

              <div className="flex justify-end">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary font-medium hover:underline"
                  data-testid="link-forgot-password"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full gradient-golden text-black font-semibold"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? t('common.loading') : t('auth.login')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.noAccount')}{" "}
                <Link 
                  href="/register" 
                  className="text-primary font-semibold hover:underline" 
                  data-testid="link-register"
                >
                  {t('auth.register')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <footer className="absolute bottom-4 text-center text-sm text-muted-foreground w-full">
          © {new Date().getFullYear()} Event Four You
        </footer>
      </div>
    );
  }

  // Mobile version
  return (
    <SafeArea 
      className="min-h-screen bg-background flex flex-col relative overflow-hidden"
      top={true}
      bottom={true}
      left={true}
      right={true}
    >
      <motion.div 
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="flex flex-col items-center mb-10"
        >
          <Link href="/" className="flex flex-col items-center gap-3 min-h-[44px]">
            <BrandLogo variant="vertical" className="h-28 w-auto" />
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{t('auth.login')}</h1>
            <p className="text-muted-foreground text-base">
              {t('auth.noAccount')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
              >
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {showResendVerification && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
              >
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <p className="text-base">{t('auth.emailNotVerified')}</p>
                      <HapticButton 
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="w-full h-14 border-primary/30 text-base rounded-xl"
                        hapticType="medium"
                        data-testid="button-resend-verification"
                      >
                        {isResending ? t('auth.resendingEmail') : t('auth.resendVerification')}
                      </HapticButton>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.15 }}
            >
              <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as LoginMethod)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12 mb-4">
                  <TabsTrigger value="email" className="flex items-center justify-center gap-1.5 h-10" data-testid="tab-email-mobile">
                    <AtSign className="h-4 w-4" />
                    <span className="text-xs">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="username" className="flex items-center justify-center gap-1.5 h-10" data-testid="tab-username-mobile">
                    <User className="h-4 w-4" />
                    <span className="text-xs">Username</span>
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="flex items-center justify-center gap-1.5 h-10" data-testid="tab-phone-mobile">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs">{t('auth.phone')}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </motion.div>

            {loginMethod === 'email' && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springConfig, delay: 0.18 }}
              >
                <Label htmlFor="email-mobile" className="text-base font-medium">{t('auth.email')}</Label>
                <Input
                  id="email-mobile"
                  type="email"
                  placeholder={t('auth.enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                  data-testid="input-email-mobile"
                />
              </motion.div>
            )}

            {loginMethod === 'username' && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springConfig, delay: 0.18 }}
              >
                <Label htmlFor="username-mobile" className="text-base font-medium">{t('auth.username')}</Label>
                <Input
                  id="username-mobile"
                  type="text"
                  placeholder={t('auth.enterUsername')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                  data-testid="input-username-mobile"
                />
              </motion.div>
            )}

            {loginMethod === 'phone' && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springConfig, delay: 0.18 }}
              >
                <Label className="text-base font-medium">{t('auth.phoneLabel')}</Label>
                <div className="flex gap-2">
                  <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                    <SelectTrigger className="w-[120px] h-14 bg-background/50 border-white/10 rounded-xl" data-testid="select-phone-prefix-mobile">
                      <SelectValue placeholder="+39" />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_PREFIXES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone-mobile"
                    type="tel"
                    placeholder={t('auth.enterPhone')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    className="flex-1 h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                    data-testid="input-phone-mobile"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('auth.staffAndPromoterAccess')}
                </p>
              </motion.div>
            )}

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.2 }}
            >
              <Label htmlFor="password" className="text-base font-medium">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                data-testid="input-password"
              />
            </motion.div>

            <motion.div 
              className="flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springConfig, delay: 0.25 }}
            >
              <Link 
                href="/forgot-password" 
                className="text-base text-primary font-medium min-h-[44px] flex items-center px-2"
                data-testid="link-forgot-password"
              >
                {t('auth.forgotPassword')}
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.3 }}
              whileTap={{ scale: 0.98 }}
            >
              <HapticButton
                type="submit"
                className="w-full h-14 gradient-golden text-black font-semibold text-lg rounded-xl"
                disabled={isLoading}
                hapticType="medium"
                data-testid="button-submit"
              >
                {isLoading ? t('common.loading') : t('auth.login')}
              </HapticButton>
            </motion.div>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springConfig, delay: 0.45 }}
          className="mt-10 text-center"
        >
          <p className="text-base text-muted-foreground">
            {t('auth.noAccount')}{" "}
            <Link 
              href="/register" 
              className="text-primary font-semibold min-h-[44px] inline-flex items-center px-1" 
              data-testid="link-register"
            >
              {t('auth.register')}
            </Link>
          </p>
        </motion.div>
      </div>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springConfig, delay: 0.5 }}
        className="py-6 text-center text-sm text-muted-foreground"
      >
        © {new Date().getFullYear()} Event Four You
      </motion.footer>
    </SafeArea>
  );
}
