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

export default function PublicResetPassword() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

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
        setError("Link non valido. Richiedi un nuovo reset password.");
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
          setError(data.message || "Link non valido o scaduto.");
        }
      } catch (err) {
        setError("Errore durante la verifica del link.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Le password non corrispondono.");
      return;
    }

    setIsLoading(true);

    try {
      const response: any = await apiRequest('POST', '/api/public/customers/reset-password', { 
        token, 
        password 
      });
      setSuccess(response.message || "Password reimpostata con successo!");
      
      setTimeout(() => {
        navigate("/accedi");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifica del link in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/">
            <img 
              src="/logo.png" 
              alt="Event4U" 
              className="h-10 w-auto cursor-pointer"
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-card/80 backdrop-blur-md border-border">
            <CardHeader className="text-center p-4 sm:p-6">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <CardTitle className="text-foreground text-xl sm:text-2xl">Reimposta Password</CardTitle>
              {isValid && email && (
                <CardDescription className="text-muted-foreground">
                  Imposta una nuova password per {email}
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
                      Richiedi Nuovo Link
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
                    <Label htmlFor="password" className="text-muted-foreground">Nuova Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimo 8 caratteri"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading || !!success}
                      data-testid="input-password"
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-muted-foreground">Conferma Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Ripeti la password"
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
                    {isLoading ? "Salvataggio..." : "Salva Nuova Password"}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    <Link href="/accedi" className="text-primary hover:underline" data-testid="link-login">
                      Torna al Login
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
