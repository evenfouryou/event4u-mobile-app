import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Link non valido. Manca il token di reset.");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/verify-reset-token/${token}`);
        const data = await response.json();
        
        if (data.valid) {
          setIsValidToken(true);
          setUserEmail(data.email || "");
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

    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }

    setIsLoading(true);

    try {
      const response: any = await apiRequest('POST', '/api/reset-password', { 
        token, 
        password 
      });
      setSuccess(response.message || "Password reimpostata con successo!");
      
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Link href="/">
              <img 
                src="/logo.png" 
                alt="EventFourYou" 
                className="h-8 sm:h-10 w-auto cursor-pointer"
              />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4 text-sm sm:text-base">Verifica del link in corso...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/">
            <img 
              src="/logo.png" 
              alt="EventFourYou" 
              className="h-8 sm:h-10 w-auto cursor-pointer"
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">Reimposta Password</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isValidToken 
                ? `Inserisci una nuova password per ${userEmail}`
                : "Impossibile reimpostare la password"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {!isValidToken ? (
              <div className="space-y-4">
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button asChild variant="outline" data-testid="button-request-new">
                    <Link href="/forgot-password">Richiedi nuovo link</Link>
                  </Button>
                </div>
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
                  <Alert data-testid="alert-success" className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      {success}
                      <br />
                      <span className="text-sm">Reindirizzamento al login...</span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Nuova Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimo 8 caratteri"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading || !!success}
                      className="h-10 sm:h-11"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Conferma Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ripeti la password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading || !!success}
                    className="h-10 sm:h-11"
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !!success}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : "Reimposta Password"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                    Torna al Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
