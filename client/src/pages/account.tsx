import { useEffect, useCallback } from "react";
import { Route, Switch, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient } from "@/lib/queryClient";
import AccountHome from "@/pages/account-home";
import AccountProfile from "@/pages/account-profile";
import AccountTickets from "@/pages/account-tickets";
import AccountTicketDetail from "@/pages/account-ticket-detail";
import AccountNameChange from "@/pages/account-name-change";
import AccountWallet from "@/pages/account-wallet";
import AccountResales from "@/pages/account-resales";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MobileAppLayout,
  MobileHeader,
  MobileBottomBar,
  MobileNavItem,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Loader2,
  User,
  Ticket,
  Wallet,
  RefreshCw,
  Home,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const getNavItems = (t: (key: string) => string) => [
  { href: "/account/home", label: t('account.nav.home'), icon: Home },
  { href: "/account/tickets", label: t('account.nav.ticketsSubscriptions'), icon: Ticket },
  { href: "/account/wallet", label: t('account.nav.wallet'), icon: Wallet },
  { href: "/account/resales", label: t('account.nav.resale'), icon: RefreshCw },
  { href: "/account/profile", label: t('account.nav.profile'), icon: User },
];

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: springTransition,
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: springTransition,
};

export default function AccountPage() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user && (user as any).role === 'scanner') {
      navigate("/scanner");
      return;
    }
  }, [user, navigate]);

  const isScanner = user && (user as any).role === 'scanner';

  const { data: customer, isLoading, isError } = useQuery<Customer>({
    queryKey: ["/api/public/customers/me"],
    enabled: !isScanner,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !isScanner && (isError || !customer)) {
      navigate("/login?redirect=" + encodeURIComponent(location));
    }
  }, [isLoading, isError, customer, navigate, location, isScanner]);

  useEffect(() => {
    if (location === "/account" || location === "/account/") {
      navigate("/account/home");
    }
  }, [location, navigate]);

  const handleLogout = useCallback(() => {
    triggerHaptic('medium');
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerData");
    queryClient.clear();
    window.location.href = "/api/logout";
  }, []);

  const getInitials = useCallback(() => {
    if (!customer) return "U";
    return `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase();
  }, [customer]);

  const getPageTitle = useCallback(() => {
    if (location.includes('/account/home')) return t('account.nav.home');
    if (location.includes('/account/profile')) return t('account.nav.profile');
    if (location.includes('/account/tickets')) return t('account.nav.ticketsSubscriptions');
    if (location.includes('/account/wallet')) return t('account.nav.wallet');
    if (location.includes('/account/resales')) return t('account.nav.resale');
    return t('account.title');
  }, [location, t]);

  const showBackButton = location.includes('/account/tickets/') && 
    (location.includes('/name-change') || /\/account\/tickets\/[^/]+$/.test(location));

  if (isLoading) {
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground text-lg">{t('account.loading')}</p>
          </div>
        </div>
      );
    }
    return (
      <MobileAppLayout className="bg-background">
        <motion.div 
          className="flex-1 flex items-center justify-center"
          {...scaleIn}
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-primary mx-auto" />
            </motion.div>
            <motion.p 
              className="text-muted-foreground text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
            >
              {t('account.loading')}
            </motion.p>
          </div>
        </motion.div>
      </MobileAppLayout>
    );
  }

  if (isError || !customer) {
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground text-lg">{t('account.redirectingToLogin')}</p>
          </div>
        </div>
      );
    }
    return (
      <MobileAppLayout className="bg-background">
        <motion.div 
          className="flex-1 flex items-center justify-center"
          {...scaleIn}
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-primary mx-auto" />
            </motion.div>
            <motion.p 
              className="text-muted-foreground text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
            >
              {t('account.redirectingToLogin')}
            </motion.p>
          </div>
        </motion.div>
      </MobileAppLayout>
    );
  }

  const headerContent = (
    <MobileHeader
      title={getPageTitle()}
      leftAction={
        showBackButton ? (
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={() => navigate('/account/tickets')}
            className="rounded-full"
            hapticType="light"
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </HapticButton>
        ) : (
          <Link href="/acquista" data-testid="link-logo">
            <BrandLogo variant="monogram" className="h-9 w-auto" />
          </Link>
        )
      }
      rightAction={
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/account/profile">
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={() => triggerHaptic('light')}
            >
              <Avatar 
                className="w-10 h-10 bg-primary/20 border-2 border-primary/30 cursor-pointer" 
                data-testid="button-avatar"
              >
                <AvatarFallback className="bg-transparent text-primary font-semibold text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          </Link>
        </div>
      }
      className="bg-card/95 backdrop-blur-xl border-b border-border"
    />
  );

  const footerContent = (
    <MobileBottomBar className="bg-card/95 backdrop-blur-xl border-t border-border">
      {getNavItems(t).map((item) => {
        const isActive = location === item.href || 
          (item.href !== "/account/home" && location.startsWith(item.href));
        return (
          <MobileNavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive}
            onClick={() => {
              triggerHaptic('light');
              navigate(item.href);
            }}
          />
        );
      })}
    </MobileBottomBar>
  );

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-account">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-xl">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/acquista" data-testid="link-logo">
                <BrandLogo variant="horizontal" className="h-10 w-auto" />
              </Link>
            </div>

            <nav className="flex items-center gap-1">
              {getNavItems(t).map((item) => {
                const isActive = location === item.href || 
                  (item.href !== "/account/home" && location.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.href)}
                    className="gap-2"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/account/profile">
                <Avatar 
                  className="w-10 h-10 bg-primary/20 border-2 border-primary/30 cursor-pointer" 
                  data-testid="button-avatar"
                >
                  <AvatarFallback className="bg-transparent text-primary font-semibold text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springTransition}
            >
              <Switch>
                <Route path="/account/home" component={AccountHome} />
                <Route path="/account/profile" component={AccountProfile} />
                <Route path="/account/tickets/:id/name-change" component={AccountNameChange} />
                <Route path="/account/tickets/:id" component={AccountTicketDetail} />
                <Route path="/account/tickets" component={AccountTickets} />
                <Route path="/account/wallet" component={AccountWallet} />
                <Route path="/account/resales" component={AccountResales} />
              </Switch>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={headerContent}
      footer={footerContent}
      className="bg-background"
      contentClassName="pb-24"
      noPadding
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={springTransition}
          className="flex-1"
        >
          <Switch>
            <Route path="/account/home" component={AccountHome} />
            <Route path="/account/profile" component={AccountProfile} />
            <Route path="/account/tickets/:id/name-change" component={AccountNameChange} />
            <Route path="/account/tickets/:id" component={AccountTicketDetail} />
            <Route path="/account/tickets" component={AccountTickets} />
            <Route path="/account/wallet" component={AccountWallet} />
            <Route path="/account/resales" component={AccountResales} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </MobileAppLayout>
  );
}
