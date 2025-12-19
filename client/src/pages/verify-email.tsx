import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from URL query parameter
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token di verifica mancante. Controlla il link nella tua email.');
        return;
      }

      try {
        const response = await fetch(`/api/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          if (data.alreadyVerified) {
            setStatus('already-verified');
            setMessage(data.message || 'Email già verificata');
          } else {
            setStatus('success');
            setMessage(data.message || 'Email verificata con successo!');
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Verifica fallita. Il link potrebbe essere scaduto o non valido.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Errore durante la verifica. Riprova più tardi.');
      }
    };

    verifyEmail();
  }, []);

  const renderIcon = () => {
    if (status === 'loading') {
      return <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin" />;
    }
    if (status === 'success' || status === 'already-verified') {
      return <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-600" />;
    }
    return <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive" />;
  };

  const renderTitle = () => {
    if (status === 'loading') return 'Verifica in corso...';
    if (status === 'success') return 'Email Verificata!';
    if (status === 'already-verified') return 'Email già Verificata';
    return 'Verifica Fallita';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-gradient-to-br from-primary/5 to-background">
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="mx-auto mb-3 sm:mb-4 h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-background flex items-center justify-center">
            {renderIcon()}
          </div>
          <CardTitle className="text-xl sm:text-2xl" data-testid="text-verification-title">
            {renderTitle()}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base" data-testid="text-verification-message">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {(status === 'success' || status === 'already-verified') && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Ora puoi accedere alla piattaforma con le tue credenziali.
              </p>
              <Button 
                className="w-full" 
                asChild
                data-testid="button-go-to-login"
              >
                <Link href="/login">Vai al Login</Link>
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Se il problema persiste, contatta il supporto o richiedi un nuovo link di verifica.
              </p>
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  asChild
                  data-testid="button-back-to-register"
                >
                  <Link href="/register">Torna alla Registrazione</Link>
                </Button>
                <Button 
                  className="w-full" 
                  variant="ghost"
                  asChild
                  data-testid="button-go-to-login"
                >
                  <Link href="/login">Vai al Login</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
