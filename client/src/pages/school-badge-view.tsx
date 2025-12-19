import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

interface BadgeData {
  id: string;
  uniqueCode: string;
  qrCodeUrl?: string;
  badgeImageUrl?: string;
  isActive: boolean;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
  request: {
    firstName: string;
    lastName: string;
    email: string;
    landing: {
      schoolName: string;
      logoUrl?: string;
      primaryColor?: string;
    };
  };
}

export default function SchoolBadgeView() {
  const { code } = useParams<{ code: string }>();

  const { data: badge, isLoading, error } = useQuery<BadgeData>({
    queryKey: ["/api/school-badges/badge", code],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl mx-auto mb-3 sm:mb-4" />
            <Skeleton className="h-6 sm:h-8 w-40 sm:w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-56 sm:w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <Skeleton className="h-20 sm:h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !badge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md text-center" data-testid="card-badge-not-found">
            <CardHeader>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
              </div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl">Badge non trovato</CardTitle>
              <CardDescription>
                Questo badge non esiste o non è più valido.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  const primaryColor = badge.request.landing.primaryColor || "#3b82f6";
  const isRevoked = !badge.isActive || !!badge.revokedAt;

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card overflow-hidden" data-testid="card-badge-view">
          <div 
            className="h-2" 
            style={{ backgroundColor: isRevoked ? "rgb(239 68 68)" : primaryColor }}
          />
          <CardHeader className="text-center">
            {badge.request.landing.logoUrl ? (
              <img 
                src={badge.request.landing.logoUrl} 
                alt={badge.request.landing.schoolName} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover mx-auto mb-3 sm:mb-4"
                data-testid="img-school-logo"
              />
            ) : (
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            )}
            <CardTitle className="text-xl sm:text-2xl" data-testid="text-school-name">
              {badge.request.landing.schoolName}
            </CardTitle>
            <CardDescription>Badge Digitale Verificato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex justify-center">
              {isRevoked ? (
                <Badge variant="destructive" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 gap-2">
                  <XCircle className="h-4 w-4" />
                  Badge Revocato
                </Badge>
              ) : (
                <Badge 
                  className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 gap-2 text-white"
                  style={{ backgroundColor: primaryColor }}
                  data-testid="badge-verified"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Verificato
                </Badge>
              )}
            </div>

            {badge.badgeImageUrl && (
              <div className="flex justify-center">
                <img 
                  src={badge.badgeImageUrl} 
                  alt="Badge" 
                  className="w-40 sm:w-48 h-auto rounded-xl shadow-lg"
                  data-testid="img-badge"
                />
              </div>
            )}

            <div className="p-3 sm:p-4 rounded-xl bg-muted/50 space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Titolare</p>
                <p className="text-lg sm:text-xl font-semibold flex items-center gap-2" data-testid="text-holder-name">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: primaryColor }} />
                  {badge.request.firstName} {badge.request.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Data di emissione</p>
                <p className="text-sm sm:text-base font-medium flex items-center gap-2" data-testid="text-issue-date">
                  <Calendar className="h-4 w-4" />
                  {badge.createdAt && format(new Date(badge.createdAt), "dd MMMM yyyy", { locale: it })}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Codice Badge</p>
                <p className="font-mono text-xs sm:text-sm" data-testid="text-badge-code">{badge.uniqueCode}</p>
              </div>
            </div>

            {isRevoked && badge.revokedReason && (
              <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-xs sm:text-sm text-destructive font-medium mb-1">Motivo revoca</p>
                <p className="text-xs sm:text-sm" data-testid="text-revoke-reason">{badge.revokedReason}</p>
              </div>
            )}

            {badge.qrCodeUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Scansiona per verificare</p>
                <img 
                  src={badge.qrCodeUrl} 
                  alt="QR Code" 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg"
                  data-testid="img-qr-code"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
