import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from 'react-i18next';
import { 
  RefreshCw, 
  Calendar, 
  MapPin, 
  Search, 
  User, 
  ShoppingBag,
  Ticket,
  Tag,
  ArrowRight,
} from "lucide-react";

interface PublicResale {
  id: string;
  eventId: number;
  ticketedEventId: string;
  eventName: string;
  eventStart: string;
  eventImageUrl: string | null;
  locationName: string;
  sectorName: string;
  ticketType: string;
  originalPrice: string;
  resalePrice: string;
  listedAt: string;
}

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
};

function ResaleCard({ resale }: { resale: PublicResale }) {
  const { t } = useTranslation();
  const eventDate = new Date(resale.eventStart);
  const originalPrice = parseFloat(resale.originalPrice);
  const resalePrice = parseFloat(resale.resalePrice);
  const discount = originalPrice > 0 ? Math.round(((originalPrice - resalePrice) / originalPrice) * 100) : 0;
  const hasDiscount = discount > 0;

  return (
    <motion.div
      variants={cardVariants}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
    >
      <Link href={`/rivendita/${resale.id}`}>
        <Card
          className="relative overflow-hidden rounded-2xl border-0 cursor-pointer bg-card"
          data-testid={`card-resale-${resale.id}`}
        >
          <div className="relative aspect-video bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-pink-900/30">
            {resale.eventImageUrl ? (
              <img
                src={resale.eventImageUrl}
                alt={resale.eventName}
                className="absolute inset-0 w-full h-full object-cover"
                data-testid={`img-resale-${resale.id}`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <RefreshCw className="w-20 h-20 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
              <Badge className="bg-amber-500/90 text-white shadow-lg">
                <RefreshCw className="w-3 h-3 mr-1" />
                {t('public.resales.resaleBadge')}
              </Badge>
              {hasDiscount && (
                <Badge className="bg-green-500/90 text-white shadow-lg">
                  -{discount}%
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <h3
              className="text-xl font-bold text-foreground line-clamp-2"
              data-testid={`text-eventname-${resale.id}`}
            >
              {resale.eventName}
            </h3>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                <Ticket className="w-3 h-3 mr-1" />
                {resale.ticketType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {resale.sectorName}
              </Badge>
            </div>
            
            <div className="flex flex-col gap-2 text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground" data-testid={`text-date-${resale.id}`}>
                    {format(eventDate, "EEEE d MMMM", { locale: it })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('public.resales.time', { time: format(eventDate, "HH:mm") })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 flex-1" data-testid={`text-location-${resale.id}`}>
                  {resale.locationName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-border gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      €{originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-bold text-primary" data-testid={`text-price-${resale.id}`}>
                  €{resalePrice.toFixed(2)}
                </span>
              </div>
              <Button
                className="min-h-[48px] px-6 rounded-xl font-semibold"
                data-testid={`button-buy-${resale.id}`}
              >
                <Tag className="w-5 h-5 mr-2" />
                {t('public.resales.buy')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function ResaleCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-0">
      <Skeleton className="aspect-video" />
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex justify-between pt-3 border-t border-border">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-12 w-28 rounded-xl" />
        </div>
      </div>
    </Card>
  );
}

export default function PublicResalesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useCustomerAuth();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const { data: resales, isLoading, error } = useQuery<PublicResale[]>({
    queryKey: ["/api/public/resales"],
  });

  const filteredResales = resales?.filter((resale) =>
    resale.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resale.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resale.sectorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-public-resales-desktop">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-6">
              <Link href="/">
                <BrandLogo variant="horizontal" className="h-10 w-auto" />
              </Link>

              <nav className="flex items-center gap-6">
                <Link href="/acquista" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {t('public.nav.events')}
                </Link>
                <Link href="/rivendite" className="text-foreground font-medium">
                  {t('public.nav.resales')}
                </Link>
                <Link href="/locali" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {t('public.nav.venues')}
                </Link>
              </nav>

              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder={t('public.resales.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-base rounded-xl"
                    data-testid="input-search-desktop"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link href="/carrello">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-xl border-border"
                    data-testid="button-cart-desktop"
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </Button>
                </Link>
                {isAuthenticated ? (
                  <Link href="/account">
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20" data-testid="avatar-user-desktop">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button className="h-10 px-5 rounded-xl font-semibold" data-testid="button-login-desktop">
                      {t('auth.login')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">{t('public.resales.title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('public.resales.subtitle')}
            </p>
          </div>

          {error && (
            <Card className="p-6 text-center bg-red-500/10 border-red-500/20 rounded-2xl mb-6">
              <p className="text-red-400">{t('public.resales.loadError')}</p>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <ResaleCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredResales && filteredResales.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              data-testid="grid-resales-desktop"
            >
              {filteredResales.map((resale) => (
                <ResaleCard key={resale.id} resale={resale} />
              ))}
            </motion.div>
          ) : (
            <Card className="p-12 text-center rounded-2xl">
              <RefreshCw className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('public.resales.noResalesAvailable')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('public.resales.noResalesMessage')}
              </p>
              <Link href="/acquista">
                <Button className="rounded-xl">
                  <Ticket className="w-5 h-5 mr-2" />
                  {t('public.resales.goToEvents')}
                </Button>
              </Link>
            </Card>
          )}
        </main>

        <footer className="border-t border-border py-6 mt-12">
          <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
            <p>{t('public.footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="page-public-resales-mobile">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/">
              <BrandLogo variant="horizontal" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/carrello">
                <Button variant="ghost" size="icon" className="w-10 h-10" data-testid="button-cart-mobile">
                  <ShoppingBag className="w-5 h-5" />
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/account">
                  <Avatar className="h-9 w-9 cursor-pointer" data-testid="avatar-user-mobile">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="sm" className="h-9 px-4 rounded-lg" data-testid="button-login-mobile">
                    {t('auth.login')}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-4 mt-3 text-sm">
            <Link href="/acquista" className="text-muted-foreground">
              {t('public.nav.events')}
            </Link>
            <Link href="/rivendite" className="text-foreground font-medium border-b-2 border-primary pb-1">
              {t('public.nav.resales')}
            </Link>
            <Link href="/locali" className="text-muted-foreground">
              {t('public.nav.venues')}
            </Link>
          </nav>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('public.resales.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-muted/50 border-border text-foreground rounded-xl"
            data-testid="input-search-mobile"
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('public.resales.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('public.resales.subtitleMobile')}
          </p>
        </div>

        {error && (
          <Card className="p-4 text-center bg-red-500/10 border-red-500/20 rounded-xl mb-4">
            <p className="text-red-400 text-sm">{t('public.resales.loadErrorMobile')}</p>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <ResaleCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredResales && filteredResales.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
            data-testid="list-resales-mobile"
          >
            {filteredResales.map((resale) => (
              <ResaleCard key={resale.id} resale={resale} />
            ))}
          </motion.div>
        ) : (
          <Card className="p-8 text-center rounded-xl">
            <RefreshCw className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('public.resales.noResalesMobile')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('public.resales.noResalesMessageMobile')}
            </p>
            <Link href="/acquista">
              <Button size="sm" className="rounded-lg">
                <Ticket className="w-4 h-4 mr-2" />
                {t('public.resales.goToEvents')}
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
