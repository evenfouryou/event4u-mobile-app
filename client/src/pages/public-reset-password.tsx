import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
} from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";
import { useTranslation } from "react-i18next";

export default function PublicResetPassword() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError(t('auth.invalidLinkMissingToken'));
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/public/customers/verify-reset-token/${token}`);
        const data = await response.json();

        if (data.valid) {
          setIsValid(true);
          setEmail(data.email);
        } else {
          setError(data.message || t('auth.invalidOrExpiredLink'));
        }
      } catch (err) {
        setError(t('auth.linkVerificationError'));
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t('auth.validation.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.validation.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const response: any = await apiRequest('POST', '/api/public/customers/reset-password', { 
        token, 
        password 
      });
      setSuccess(response.message || t('auth.passwordResetSuccess'));
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('auth.verifyingLink')}</p>
        </div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-public-reset-password">
        <header className="border-b border-border">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/">
              <BrandLogo variant="horizontal" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="bg-card/80 backdrop-blur-md border-border">
              <CardHeader className="text-center p-6">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-foreground text-2xl">{t('auth.resetPasswordTitle')}</CardTitle>
                {isValid && email && (
                  <CardDescription className="text-muted-foreground">
                    {t('auth.setNewPasswordFor', { email })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!isValid ? (
                  <div className="space-y-4">
                    <Alert variant="destructive" data-testid="alert-error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button asChild className="w-full">
                      <Link href="/public/forgot-password">
                        {t('auth.requestNewLink')}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive" data-testid="alert-error">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert data-testid="alert-success" className="border-green-500 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-muted-foreground">{t('auth.newPassword')}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t('auth.newPasswordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading || !!success}
                        data-testid="input-password"
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-muted-foreground">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading || !!success}
                        data-testid="input-confirm-password"
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !!success}
                      data-testid="button-submit"
                    >
                      {isLoading ? t('auth.saving') : t('auth.saveNewPassword')}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                      <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                        {t('auth.backToLogin')}
                      </Link>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={t('auth.resetPasswordTitle')}
          showBackButton
          onBack={() => navigate("/")}
        />
      }
    >
      <div className="py-6" data-testid="page-public-reset-password-mobile">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            {isValid && email && (
              <p className="text-sm text-muted-foreground">
                {t('auth.setNewPasswordFor', { email })}
              </p>
            )}
          </div>

          {!isValid ? (
            <div className="space-y-4">
              <Alert variant="destructive" data-testid="alert-error-mobile">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <HapticButton asChild className="w-full" hapticType="medium">
                <Link href="/public/forgot-password">
                  {t('auth.requestNewLink')}
                </Link>
              </HapticButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="alert-error-mobile">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert data-testid="alert-success-mobile" className="border-green-500 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-400">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password-mobile" className="text-muted-foreground">{t('auth.newPassword')}</Label>
                <Input
                  id="password-mobile"
                  type="password"
                  placeholder={t('auth.newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !!success}
                  data-testid="input-password-mobile"
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword-mobile" className="text-muted-foreground">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword-mobile"
                  type="password"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !!success}
                  data-testid="input-confirm-password-mobile"
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-12"
                />
              </div>

              <HapticButton 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !!success}
                data-testid="button-submit-mobile"
                hapticType="success"
              >
                {isLoading ? t('auth.saving') : t('auth.saveNewPassword')}
              </HapticButton>

              <div className="text-center text-sm text-muted-foreground pt-4">
                <Link href="/login" className="text-primary hover:underline" data-testid="link-login-mobile">
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </MobileAppLayout>
  );
}
