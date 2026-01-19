import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { it, enUS, fr, de } from "date-fns/locale";
import { motion } from "framer-motion";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

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
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'it': return it;
      case 'fr': return fr;
      case 'de': return de;
      default: return enUS;
    }
  };

  const { data: badge, isLoading, error } = useQuery<BadgeData>({
    queryKey: ["/api/school-badges/badge", code],
  });

  const handleShare = async () => {
    triggerHaptic('medium');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Badge - ${badge?.request.firstName} ${badge?.request.lastName}`,
          text: t('schoolBadgesView.shareText', { schoolName: badge?.request.landing.schoolName }),
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

  const handleShareDesktop = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Badge - ${badge?.request.firstName} ${badge?.request.lastName}`,
          text: t('schoolBadgesView.shareText', { schoolName: badge?.request.landing.schoolName }),
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Desktop version
  if (!isMobile) {
    const primaryColor = badge?.request.landing.primaryColor || "#3b82f6";
    const isRevoked = badge ? (!badge.isActive || !!badge.revokedAt) : false;

    if (isLoading) {
      return (
        <div className="container mx-auto py-12 px-6 max-w-2xl" data-testid="page-school-badge-view-loading">
          <Card className="overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-2xl mb-4" />
                <Skeleton className="h-8 w-56 mb-2" />
                <Skeleton className="h-5 w-44" />
              </div>
              <Skeleton className="h-10 w-32 mx-auto rounded-full" />
              <Skeleton className="h-56 w-56 mx-auto rounded-2xl" />
              <div className="space-y-4 p-6 rounded-xl bg-muted/30">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <Skeleton className="h-36 w-36 mx-auto rounded-xl" />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (error || !badge) {
      return (
        <div className="container mx-auto py-12 px-6 max-w-2xl" data-testid="page-school-badge-view-error">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')} 
            className="mb-6"
            data-testid="button-back-desktop"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('schoolBadgesView.goBack')}
          </Button>
          <Card className="text-center" data-testid="card-badge-not-found-desktop">
            <CardContent className="p-12">
              <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-3">{t('schoolBadgesView.badgeNotFound')}</h1>
              <p className="text-muted-foreground">
                {t('schoolBadgesView.badgeNotFoundDescription')}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto py-12 px-6 max-w-2xl" data-testid="page-school-badge-view">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            data-testid="button-back-desktop"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('schoolBadgesView.goBack')}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleShareDesktop}
            data-testid="button-share-desktop"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {t('schoolBadgesView.share')}
          </Button>
        </div>

        <Card className="overflow-hidden" data-testid="card-badge-view-desktop">
          <div 
            className="h-2" 
            style={{ backgroundColor: isRevoked ? "rgb(239 68 68)" : primaryColor }}
          />
          
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col items-center">
              {badge.request.landing.logoUrl ? (
                <img 
                  src={badge.request.landing.logoUrl} 
                  alt={badge.request.landing.schoolName} 
                  className="w-28 h-28 rounded-2xl object-cover mb-4 shadow-lg"
                  data-testid="img-school-logo-desktop"
                />
              ) : (
                <div 
                  className="w-28 h-28 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <GraduationCap className="h-14 w-14 text-white" />
                </div>
              )}
              <h1 
                className="text-3xl font-bold text-center"
                data-testid="text-school-name-desktop"
              >
                {badge.request.landing.schoolName}
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                {t('schoolBadgesView.verifiedDigitalBadge')}
              </p>
            </div>

            <div className="flex justify-center">
              {isRevoked ? (
                <Badge 
                  variant="destructive" 
                  className="text-base px-5 py-2.5 gap-2"
                >
                  <XCircle className="h-5 w-5" />
                  {t('schoolBadgesView.badgeRevoked')}
                </Badge>
              ) : (
                <Badge 
                  className="text-base px-5 py-2.5 gap-2 text-white"
                  style={{ backgroundColor: primaryColor }}
                  data-testid="badge-verified-desktop"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {t('schoolBadgesView.verified')}
                </Badge>
              )}
            </div>

            {badge.badgeImageUrl && (
              <div className="flex justify-center">
                <img 
                  src={badge.badgeImageUrl} 
                  alt="Badge" 
                  className="w-64 h-auto rounded-2xl shadow-2xl"
                  data-testid="img-badge-desktop"
                />
              </div>
            )}

            <div className="p-6 rounded-xl bg-muted/30 space-y-5">
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">{t('schoolBadgesView.holder')}</p>
                <p 
                  className="text-xl font-semibold flex items-center gap-3"
                  data-testid="text-holder-name-desktop"
                >
                  <Award className="h-6 w-6 shrink-0" style={{ color: primaryColor }} />
                  {badge.request.firstName} {badge.request.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">{t('schoolBadgesView.issueDate')}</p>
                <p 
                  className="text-base font-medium flex items-center gap-3"
                  data-testid="text-issue-date-desktop"
                >
                  <Calendar className="h-5 w-5 shrink-0" />
                  {badge.createdAt && format(new Date(badge.createdAt), "dd MMMM yyyy", { locale: getDateLocale() })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">{t('schoolBadgesView.badgeCode')}</p>
                <p 
                  className="font-mono text-sm bg-background/50 px-3 py-2 rounded-lg inline-block"
                  data-testid="text-badge-code-desktop"
                >
                  {badge.uniqueCode}
                </p>
              </div>
            </div>

            {isRevoked && badge.revokedReason && (
              <div className="p-5 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium mb-2">{t('schoolBadgesView.revokeReason')}</p>
                <p className="text-base" data-testid="text-revoke-reason-desktop">{badge.revokedReason}</p>
              </div>
            )}

            {badge.qrCodeUrl && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <p className="text-sm text-muted-foreground">{t('schoolBadgesView.scanToVerify')}</p>
                <img 
                  src={badge.qrCodeUrl} 
                  alt="QR Code" 
                  className="w-40 h-40 rounded-xl shadow-lg"
                  data-testid="img-qr-code-desktop"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile version
  if (isLoading) {
    return (
      <MobileAppLayout
        className="bg-background"
        header={
          <MobileHeader
            title={t('common.loading')}
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
                {t('schoolBadgesView.badgeNotFound')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.3 }}
                className="text-muted-foreground text-base"
              >
                {t('schoolBadgesView.badgeNotFoundDescription')}
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
                  {t('schoolBadgesView.verifiedDigitalBadge')}
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
                    {t('schoolBadgesView.badgeRevoked')}
                  </Badge>
                ) : (
                  <Badge 
                    className="text-base px-5 py-2.5 gap-2 text-white min-h-[44px]"
                    style={{ backgroundColor: primaryColor }}
                    data-testid="badge-verified"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {t('schoolBadgesView.verified')}
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
                  <p className="text-sm text-muted-foreground mb-1.5">{t('schoolBadgesView.holder')}</p>
                  <p 
                    className="text-xl font-semibold flex items-center gap-3"
                    data-testid="text-holder-name"
                  >
                    <Award className="h-6 w-6 shrink-0" style={{ color: primaryColor }} />
                    {badge.request.firstName} {badge.request.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">{t('schoolBadgesView.issueDate')}</p>
                  <p 
                    className="text-base font-medium flex items-center gap-3"
                    data-testid="text-issue-date"
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    {badge.createdAt && format(new Date(badge.createdAt), "dd MMMM yyyy", { locale: getDateLocale() })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">{t('schoolBadgesView.badgeCode')}</p>
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
                  <p className="text-sm text-destructive font-medium mb-2">{t('schoolBadgesView.revokeReason')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('schoolBadgesView.scanToVerify')}</p>
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
