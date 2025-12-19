import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

interface VerificationResult {
  success: boolean;
  badge?: {
    uniqueCode: string;
    qrCodeUrl?: string;
    badgeImageUrl?: string;
    request?: {
      firstName: string;
      lastName: string;
      landing?: {
        schoolName: string;
        primaryColor?: string;
      };
    };
  };
  message?: string;
}

export default function SchoolBadgeVerify() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setResult({ success: false, message: "Token non valido" });
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest("POST", `/api/school-badges/verify`, { token });
        const data = await response.json();
        setResult({ success: true, badge: data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore durante la verifica";
        setResult({ success: false, message });
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary animate-spin" />
              </div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl">Verifica in corso...</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Stiamo verificando il tuo indirizzo email
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md text-center" data-testid="card-verify-error">
            <CardHeader>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <XCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
              </div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl">Verifica fallita</CardTitle>
              <CardDescription className="text-sm sm:text-base" data-testid="text-error-message">
                {result?.message || "Il link di verifica non è valido o è scaduto."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setLocation("/")}>
                Torna alla home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const badge = result.badge;
  const primaryColor = badge?.request?.landing?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card text-center" data-testid="card-verify-success">
          <CardHeader>
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: primaryColor }}
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Email verificata</CardTitle>
            <CardDescription>
              Il tuo badge è stato generato con successo!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {badge?.badgeImageUrl && (
              <div className="flex justify-center">
                <img 
                  src={badge.badgeImageUrl} 
                  alt="Badge" 
                  className="w-48 h-auto rounded-xl shadow-lg"
                  data-testid="img-badge-preview"
                />
              </div>
            )}
            
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Titolare del badge</p>
              <p className="text-lg font-semibold" data-testid="text-badge-holder">
                {badge?.request?.firstName} {badge?.request?.lastName}
              </p>
              {badge?.request?.landing?.schoolName && (
                <>
                  <p className="text-sm text-muted-foreground mt-3 mb-1">Scuola</p>
                  <p className="font-medium" data-testid="text-school-name">
                    {badge.request.landing.schoolName}
                  </p>
                </>
              )}
            </div>

            {badge?.qrCodeUrl && (
              <div className="flex justify-center">
                <img 
                  src={badge.qrCodeUrl} 
                  alt="QR Code" 
                  className="w-32 h-32 rounded-lg"
                  data-testid="img-qr-code"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setLocation(`/badge/view/${badge?.uniqueCode}`)}
                style={{ backgroundColor: primaryColor }}
                data-testid="button-view-badge"
              >
                <Award className="h-4 w-4 mr-2" />
                Visualizza Badge
              </Button>
              {badge?.uniqueCode && (
                <Button 
                  variant="outline"
                  onClick={() => window.open(`/badge/view/${badge.uniqueCode}`, "_blank")}
                  data-testid="button-open-badge"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apri in nuova finestra
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
