import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isPast } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarCheck,
  Calendar,
  ChevronRight,
  Loader2,
  CreditCard,
  MapPin,
  QrCode,
  Hash,
  User,
} from "lucide-react";
import { triggerHaptic } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";

interface SubscriptionItem {
  id: string;
  subscriptionCode: string;
  qrCode: string | null;
  holderFirstName: string;
  holderLastName: string;
  status: string;
  eventsCount: number;
  eventsUsed: number;
  validFrom: string;
  validTo: string;
  fiscalSealCode: string | null;
  subscriptionTypeName: string | null;
  eventName: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  locationName: string | null;
}

interface SubscriptionsResponse {
  upcoming: SubscriptionItem[];
  past: SubscriptionItem[];
  total: number;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  tap: { scale: 0.98 },
};

function getStatusVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "expired":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "active":
      return t('account.status.active');
    case "expired":
      return t('account.status.expired');
    case "cancelled":
      return t('account.status.cancelled');
    default:
      return status;
  }
}

function MobileSubscriptionCard({ subscription, index, onClick, t }: { subscription: SubscriptionItem; index: number; onClick: () => void; t: (key: string) => string }) {
  const validTo = subscription.validTo ? new Date(subscription.validTo) : null;
  const isExpired = validTo ? isPast(validTo) : false;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileTap="tap"
      transition={{ ...springTransition, delay: index * 0.05 }}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`min-h-[120px] bg-card border border-border rounded-2xl p-4 active:bg-card/80 cursor-pointer ${
        isExpired || subscription.status !== 'active' ? "opacity-60" : ""
      }`}
      data-testid={`card-subscription-${subscription.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant={getStatusVariant(subscription.status)} className="text-sm">
              {getStatusLabel(subscription.status, t)}
            </Badge>
            {subscription.qrCode && (
              <div className="flex items-center gap-1 text-primary">
                <QrCode className="w-4 h-4" />
              </div>
            )}
          </div>
          
          <h3 className="font-semibold text-foreground text-lg leading-tight mb-3" data-testid="text-subscription-name">
            {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
          </h3>
          
          <div className="flex flex-col gap-2 text-base text-muted-foreground">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 flex-shrink-0" />
              <span data-testid="text-holder-name">
                {subscription.holderFirstName} {subscription.holderLastName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 flex-shrink-0" />
              <span data-testid="text-events-used">
                {subscription.eventsUsed}/{subscription.eventsCount} {t('account.subscriptions.eventsUsed')}
              </span>
            </div>
            {validTo && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span data-testid="text-valid-to">
                  {t('account.subscriptions.validUntil')} {format(validTo, "d MMM yyyy", { locale: it })}
                </span>
              </div>
            )}
            {subscription.locationName && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{subscription.locationName}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/50">
          <ChevronRight className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ type, t }: { type: 'upcoming' | 'past'; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6"
      >
        <CreditCard className="w-12 h-12 text-muted-foreground" />
      </motion.div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {type === 'upcoming' ? t('account.subscriptions.noActiveSubscriptions') : t('account.subscriptions.noExpiredSubscriptions')}
      </h3>
      <p className="text-base text-muted-foreground text-center mb-6">
        {type === 'upcoming' 
          ? t('account.subscriptions.noActiveDescription')
          : t('account.subscriptions.noExpiredDescription')
        }
      </p>
      
      {type === 'upcoming' && (
        <Link href="/acquista">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerHaptic('medium')}
            className="min-h-[48px] px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-base"
          >
            {t('account.actions.discoverEvents')}
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  children,
  count,
  testId,
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  count: number;
  testId: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`flex-1 min-h-[52px] rounded-xl font-semibold text-lg transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/50 text-muted-foreground'
      }`}
      data-testid={testId}
    >
      {children} ({count})
    </motion.button>
  );
}

function SubscriptionDetailDialog({ subscription, open, onClose, t }: { subscription: SubscriptionItem | null; open: boolean; onClose: () => void; t: (key: string) => string }) {
  if (!subscription) return null;

  const validFrom = subscription.validFrom ? new Date(subscription.validFrom) : null;
  const validTo = subscription.validTo ? new Date(subscription.validTo) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-subscription-detail-title">
            {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
          </DialogTitle>
          <DialogDescription>
            {t('account.subscriptions.details')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <Badge variant={getStatusVariant(subscription.status)} className="text-base px-4 py-1">
              {getStatusLabel(subscription.status, t)}
            </Badge>
          </div>

          {subscription.qrCode && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(subscription.qrCode)}`}
                  alt="QR Code Abbonamento"
                  className="w-48 h-48"
                  data-testid="img-qr-code"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('account.subscriptions.holder')}</p>
                <p className="font-medium" data-testid="text-detail-holder">
                  {subscription.holderFirstName} {subscription.holderLastName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('account.subscriptions.subscriptionCode')}</p>
                <p className="font-mono font-medium" data-testid="text-detail-code">
                  {subscription.subscriptionCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('account.subscriptions.eventsUsedLabel')}</p>
                <p className="font-medium" data-testid="text-detail-events">
                  {subscription.eventsUsed} / {subscription.eventsCount}
                </p>
              </div>
            </div>

            {validFrom && validTo && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('account.subscriptions.validity')}</p>
                  <p className="font-medium" data-testid="text-detail-validity">
                    {format(validFrom, "d MMM yyyy", { locale: it })} - {format(validTo, "d MMM yyyy", { locale: it })}
                  </p>
                </div>
              </div>
            )}

            {subscription.locationName && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('account.subscriptions.location')}</p>
                  <p className="font-medium">{subscription.locationName}</p>
                </div>
              </div>
            )}

            {subscription.fiscalSealCode && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('account.subscriptions.fiscalSeal')}</p>
                  <p className="font-mono text-sm" data-testid="text-detail-seal">
                    {subscription.fiscalSealCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountSubscriptions() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionItem | null>(null);

  const { data, isLoading, error } = useQuery<SubscriptionsResponse>({
    queryKey: ["/api/public/account/subscriptions"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <p className="text-destructive text-center">
          {t('account.subscriptions.loadError')}
        </p>
      </div>
    );
  }

  const upcomingSubscriptions = data?.upcoming || [];
  const pastSubscriptions = data?.past || [];
  const activeSubscriptions = activeTab === 'upcoming' ? upcomingSubscriptions : pastSubscriptions;

  if (isMobile) {
    return (
      <div className="flex flex-col h-full" data-testid="page-subscriptions">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl px-4 py-4 border-b border-border">
          <div className="flex gap-3">
            <TabButton
              active={activeTab === 'upcoming'}
              onClick={() => setActiveTab('upcoming')}
              count={upcomingSubscriptions.length}
              testId="tab-upcoming"
            >
              {t('account.tickets.active')}
            </TabButton>
            <TabButton
              active={activeTab === 'past'}
              onClick={() => setActiveTab('past')}
              count={pastSubscriptions.length}
              testId="tab-past"
            >
              {t('account.tickets.past')}
            </TabButton>
          </div>
        </div>

        <div className="flex-1 px-4 py-4">
          <AnimatePresence mode="wait">
            {activeSubscriptions.length === 0 ? (
              <EmptyState type={activeTab} t={t} />
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: activeTab === 'upcoming' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeTab === 'upcoming' ? 20 : -20 }}
                transition={springTransition}
                className="space-y-4"
              >
                {activeSubscriptions.map((subscription, index) => (
                  <MobileSubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    index={index}
                    onClick={() => setSelectedSubscription(subscription)}
                    t={t}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <SubscriptionDetailDialog
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-subscriptions">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('account.subscriptions.title')}</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setActiveTab('upcoming')}
            data-testid="tab-upcoming-desktop"
          >
            {t('account.tickets.active')} ({upcomingSubscriptions.length})
          </Button>
          <Button
            variant={activeTab === 'past' ? 'default' : 'outline'}
            onClick={() => setActiveTab('past')}
            data-testid="tab-past-desktop"
          >
            {t('account.tickets.past')} ({pastSubscriptions.length})
          </Button>
        </div>
      </div>

      {activeSubscriptions.length === 0 ? (
        <EmptyState type={activeTab} t={t} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeSubscriptions.map((subscription, index) => (
            <Card
              key={subscription.id}
              className="cursor-pointer transition-all hover-elevate"
              onClick={() => setSelectedSubscription(subscription)}
              data-testid={`card-subscription-${subscription.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={getStatusVariant(subscription.status)}>
                    {getStatusLabel(subscription.status, t)}
                  </Badge>
                  {subscription.qrCode && <QrCode className="w-4 h-4 text-primary" />}
                </div>
                <CardTitle className="text-lg" data-testid="text-subscription-name">
                  {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{subscription.holderFirstName} {subscription.holderLastName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarCheck className="w-4 h-4" />
                  <span>{subscription.eventsUsed}/{subscription.eventsCount} {t('account.subscriptions.eventsUsed')}</span>
                </div>
                {subscription.validTo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{t('account.subscriptions.validUntil')} {format(new Date(subscription.validTo), "d MMM yyyy", { locale: it })}</span>
                  </div>
                )}
                {subscription.locationName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{subscription.locationName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SubscriptionDetailDialog
        subscription={selectedSubscription}
        open={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
        t={t}
      />
    </div>
  );
}
