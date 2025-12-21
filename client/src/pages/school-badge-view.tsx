import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  GraduationCap,
  AlertCircle,
  Share2,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { useLocation } from "wouter";

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

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function SchoolBadgeView() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  const { data: badge, isLoading, error } = useQuery<BadgeData>({
    queryKey: ["/api/school-badges/badge", code],
  });

  const handleShare = async () => {
    triggerHaptic('medium');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Badge - ${badge?.request.firstName} ${badge?.request.lastName}`,
          text: `Badge digitale verificato da ${badge?.request.landing.schoolName}`,
          url: window.location.href,
        });
        triggerHaptic('success');
      } catch {
        triggerHaptic('error');
      }
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    setLocation('/');
  };

  if (isLoading) {
    return (
      <MobileAppLayout
        className="bg-background"
        header={
          <MobileHeader
            title="Caricamento..."
            transparent
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-full py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springTransition}
            className="w-full px-4"
          >
            <div className="bg-card rounded-3xl p-6 space-y-6">
              <div className="flex flex-col items-center">
                <Skeleton className="h-20 w-20 rounded-2xl mb-4" />
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-12 w-32 mx-auto rounded-full" />
              <Skeleton className="h-48 w-48 mx-auto rounded-2xl" />
              <div className="space-y-4 p-4 rounded-2xl bg-muted/30">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <Skeleton className="h-32 w-32 mx-auto rounded-xl" />
            </div>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (error || !badge) {
    return (
      <MobileAppLayout
        className="bg-background"
        header={
          <MobileHeader
            title=""
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-11 w-11 rounded-full"
                hapticType="light"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
            transparent
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="w-full"
          >
            <div className="bg-card rounded-3xl p-8 text-center" data-testid="card-badge-not-found">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springTransition, delay: 0.1 }}
                className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6"
              >
                <AlertCircle className="h-10 w-10 text-destructive" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.2 }}
                className="text-2xl font-bold mb-3"
              >
                Badge non trovato
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.3 }}
                className="text-muted-foreground text-base"
              >
                Questo badge non esiste o non è più valido.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  const primaryColor = badge.request.landing.primaryColor || "#3b82f6";
  const isRevoked = !badge.isActive || !!badge.revokedAt;

  return (
    <MobileAppLayout
      className="bg-background"
      noPadding
      header={
        <MobileHeader
          title=""
          leftAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-11 w-11 rounded-full"
              hapticType="light"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </HapticButton>
          }
          rightAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-11 w-11 rounded-full"
              hapticType="medium"
              data-testid="button-share"
            >
              <Share2 className="h-5 w-5" />
            </HapticButton>
          }
          transparent
        />
      }
    >
      <div className="flex flex-col min-h-full py-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="w-full"
        >
          <div 
            className="bg-card rounded-3xl overflow-hidden shadow-xl"
            data-testid="card-badge-view"
          >
            <motion.div 
              className="h-2" 
              style={{ backgroundColor: isRevoked ? "rgb(239 68 68)" : primaryColor }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ ...springTransition, delay: 0.1 }}
            />
            
            <div className="p-6 space-y-6">
              <motion.div 
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.15 }}
              >
                {badge.request.landing.logoUrl ? (
                  <motion.img 
                    src={badge.request.landing.logoUrl} 
                    alt={badge.request.landing.schoolName} 
                    className="w-24 h-24 rounded-2xl object-cover mb-4 shadow-lg"
                    data-testid="img-school-logo"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...springTransition, delay: 0.2 }}
                  />
                ) : (
                  <motion.div 
                    className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...springTransition, delay: 0.2 }}
                  >
                    <GraduationCap className="h-12 w-12 text-white" />
                  </motion.div>
                )}
                <h1 
                  className="text-2xl font-bold text-center"
                  data-testid="text-school-name"
                >
                  {badge.request.landing.schoolName}
                </h1>
                <p className="text-muted-foreground text-base mt-1">
                  Badge Digitale Verificato
                </p>
              </motion.div>

              <motion.div 
                className="flex justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springTransition, delay: 0.25 }}
              >
                {isRevoked ? (
                  <Badge 
                    variant="destructive" 
                    className="text-base px-5 py-2.5 gap-2 min-h-[44px]"
                  >
                    <XCircle className="h-5 w-5" />
                    Badge Revocato
                  </Badge>
                ) : (
                  <Badge 
                    className="text-base px-5 py-2.5 gap-2 text-white min-h-[44px]"
                    style={{ backgroundColor: primaryColor }}
                    data-testid="badge-verified"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Verificato
                  </Badge>
                )}
              </motion.div>

              {badge.badgeImageUrl && (
                <motion.div 
                  className="flex justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.3 }}
                >
                  <img 
                    src={badge.badgeImageUrl} 
                    alt="Badge" 
                    className="w-56 h-auto rounded-2xl shadow-2xl"
                    data-testid="img-badge"
                  />
                </motion.div>
              )}

              <motion.div 
                className="p-5 rounded-2xl bg-muted/30 space-y-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.35 }}
              >
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Titolare</p>
                  <p 
                    className="text-xl font-semibold flex items-center gap-3"
                    data-testid="text-holder-name"
                  >
                    <Award className="h-6 w-6 shrink-0" style={{ color: primaryColor }} />
                    {badge.request.firstName} {badge.request.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Data di emissione</p>
                  <p 
                    className="text-base font-medium flex items-center gap-3"
                    data-testid="text-issue-date"
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    {badge.createdAt && format(new Date(badge.createdAt), "dd MMMM yyyy", { locale: it })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Codice Badge</p>
                  <p 
                    className="font-mono text-sm bg-background/50 px-3 py-2 rounded-lg inline-block"
                    data-testid="text-badge-code"
                  >
                    {badge.uniqueCode}
                  </p>
                </div>
              </motion.div>

              {isRevoked && badge.revokedReason && (
                <motion.div 
                  className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.4 }}
                >
                  <p className="text-sm text-destructive font-medium mb-2">Motivo revoca</p>
                  <p className="text-base" data-testid="text-revoke-reason">{badge.revokedReason}</p>
                </motion.div>
              )}

              {badge.qrCodeUrl && (
                <motion.div 
                  className="flex flex-col items-center gap-3 pt-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springTransition, delay: 0.45 }}
                >
                  <p className="text-sm text-muted-foreground">Scansiona per verificare</p>
                  <img 
                    src={badge.qrCodeUrl} 
                    alt="QR Code" 
                    className="w-36 h-36 rounded-xl shadow-lg"
                    data-testid="img-qr-code"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
        
        <div className="h-8" />
      </div>
    </MobileAppLayout>
  );
}
