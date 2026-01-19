import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Ticket, Users, ArrowRight, MapPin, Music, User } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { triggerHaptic } from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from 'react-i18next';

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function Landing() {
  const { isAuthenticated } = useCustomerAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  const features = [
    {
      icon: Calendar,
      title: t('public.landing.features.exclusiveEvents'),
      description: t('public.landing.features.exclusiveEventsDesc')
    },
    {
      icon: Ticket,
      title: t('public.landing.features.safeTickets'),
      description: t('public.landing.features.safeTicketsDesc')
    },
    {
      icon: MapPin,
      title: t('public.landing.features.topVenues'),
      description: t('public.landing.features.topVenuesDesc')
    },
    {
      icon: Users,
      title: t('public.landing.features.vipList'),
      description: t('public.landing.features.vipListDesc')
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: springConfig
    }
  };

  const handleButtonPress = () => {
    triggerHaptic('medium');
  };

  const handleLinkPress = () => {
    triggerHaptic('light');
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-landing-desktop">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full opacity-40"
            style={{ 
              background: "radial-gradient(circle, rgba(255,215,0,0.25) 0%, transparent 70%)",
              filter: "blur(100px)"
            }}
            animate={{ 
              x: [0, 50, 0],
              y: [0, -40, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 left-20 w-[600px] h-[600px] rounded-full opacity-30"
            style={{ 
              background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)",
              filter: "blur(120px)"
            }}
            animate={{ 
              x: [0, -40, 0],
              y: [0, 50, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <header className="relative z-10 border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BrandLogo variant="horizontal" className="h-10 w-auto" />
              </div>
              
              <nav className="flex items-center gap-6">
                <Link href="/acquista" className="text-muted-foreground hover-elevate px-3 py-2 rounded-md" data-testid="link-nav-events">
                  {t('public.nav.events')}
                </Link>
                <Link href="/rivendite" className="text-muted-foreground hover-elevate px-3 py-2 rounded-md" data-testid="link-nav-resales">
                  {t('public.nav.resales')}
                </Link>
                <Link href="/locali" className="text-muted-foreground hover-elevate px-3 py-2 rounded-md" data-testid="link-nav-venues">
                  {t('public.nav.venues')}
                </Link>
                <ThemeToggle />
                {isAuthenticated ? (
                  <Link href="/account">
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/40" data-testid="avatar-user-desktop">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" asChild data-testid="button-login-desktop">
                      <Link href="/login">{t('auth.login')}</Link>
                    </Button>
                    <Button asChild className="gradient-golden text-black" data-testid="button-register-desktop">
                      <Link href="/register">{t('auth.register')}</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          <section className="container mx-auto px-6 py-24">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={springConfig}
              >
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass border border-primary/30 mb-8">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400"></span>
                  </span>
                  <span className="text-sm font-medium text-teal">{t('public.landing.liveEventsTonight')}</span>
                </div>
                
                <h1 className="text-6xl font-bold leading-tight mb-6">
                  {t('public.landing.heroTitle')}
                  <br />
                  <span className="gradient-golden-text">{t('public.landing.heroTitleHighlight')}</span>
                </h1>
                
                <p className="text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed">
                  {t('public.landing.heroDescription')}
                </p>
                
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="h-12 px-8 text-lg font-semibold gradient-golden text-black glow-golden rounded-xl"
                    data-testid="button-discover-events-desktop"
                  >
                    <Link href="/acquista">
                      <Music className="mr-2 h-5 w-5" />
                      {t('public.landing.discoverEvents')}
                    </Link>
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-12 px-8 text-lg font-medium border-white/20 rounded-xl"
                    data-testid="button-venues-desktop"
                  >
                    <Link href="/locali">
                      <MapPin className="mr-2 h-5 w-5" />
                      {t('public.landing.exploreVenues')}
                    </Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springConfig, delay: 0.2 }}
                className="hidden lg:block"
              >
                <Card className="glass-card p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-teal-500/10 pointer-events-none" />
                  <CardContent className="p-0 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springConfig, delay: 0.3 + index * 0.1 }}
                          className="p-4 rounded-xl bg-background/50 hover-elevate"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 to-amber-500/15 flex items-center justify-center mb-3">
                            <feature.icon className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="font-semibold mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          <section className="container mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={springConfig}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-4">{t('public.landing.whyChooseUs')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('public.landing.whyChooseUsDesc')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...springConfig, delay: index * 0.1 }}
                >
                  <Card className="h-full hover-elevate">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/25 to-amber-500/15 flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={springConfig}
            >
              <Card className="glass-card overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-teal-500/15 pointer-events-none" />
                <CardContent className="p-12 text-center relative z-10">
                  <BrandLogo variant="monogram" className="h-20 w-auto mx-auto mb-8" />
                  
                  <h2 className="text-4xl font-bold mb-4">{t('public.landing.readyForNight')}</h2>
                  <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                    {t('public.landing.readyForNightDesc')}
                  </p>
                  
                  {!isAuthenticated ? (
                    <Button
                      size="lg"
                      asChild
                      className="h-14 px-10 text-xl font-semibold gradient-golden text-black glow-golden rounded-xl"
                      data-testid="button-register-cta-desktop"
                    >
                      <Link href="/register">
                        {t('public.landing.startNow')}
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      asChild
                      className="h-14 px-10 text-xl font-semibold gradient-golden text-black glow-golden rounded-xl"
                      data-testid="button-explore-cta-desktop"
                    >
                      <Link href="/acquista">
                        {t('public.landing.exploreEvents')}
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-white/10 mt-12">
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <BrandLogo variant="horizontal" className="h-8 w-auto" />
              
              <div className="flex items-center gap-8">
                <Link href="/acquista" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-events-desktop">
                  {t('public.nav.events')}
                </Link>
                <Link href="/rivendite" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-resales-desktop">
                  {t('public.nav.resales')}
                </Link>
                <Link href="/locali" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-venues-desktop">
                  {t('public.nav.venues')}
                </Link>
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-login-desktop">
                  {t('auth.login')}
                </Link>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {t('public.footer.copyright', { year: new Date().getFullYear() })}
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Mobile version
  return (
    <div 
      className="min-h-screen bg-background flex flex-col overflow-x-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <section className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background"
            style={{ zIndex: 1 }}
          />
          <motion.div 
            className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-50"
            style={{ 
              background: "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
              filter: "blur(80px)"
            }}
            animate={{ 
              x: [0, 40, 0],
              y: [0, -30, 0],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-32 left-0 w-[28rem] h-[28rem] rounded-full opacity-40"
            style={{ 
              background: "radial-gradient(circle, rgba(0,206,209,0.25) 0%, transparent 70%)",
              filter: "blur(100px)"
            }}
            animate={{ 
              x: [0, -30, 0],
              y: [0, 40, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.header 
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springConfig}
          className="relative z-20 px-6 py-5"
        >
          <div className="flex items-center justify-between">
            <BrandLogo variant="horizontal" className="h-10 w-auto" />
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
                <Link href="/account" onClick={handleLinkPress}>
                  <motion.div whileTap={{ scale: 0.95 }} transition={springConfig}>
                    <Avatar className="h-14 w-14 cursor-pointer ring-2 ring-primary/40" data-testid="avatar-user">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                </Link>
              ) : (
                <motion.div whileTap={{ scale: 0.95 }} transition={springConfig}>
                  <Button
                    variant="ghost"
                    className="h-14 px-6 text-lg font-medium min-w-[80px]"
                    asChild
                    data-testid="button-login"
                    onClick={handleLinkPress}
                  >
                    <Link href="/login">{t('auth.login')}</Link>
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full glass border border-primary/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
              </span>
              <span className="text-base font-medium text-teal">{t('public.landing.liveEventsTonight')}</span>
            </div>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-5xl font-bold leading-tight mb-6"
          >
            {t('public.landing.heroTitle')}
            <br />
            <span className="gradient-golden-text">{t('public.landing.heroTitleHighlight')}</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-xl text-muted-foreground mb-12 leading-relaxed"
          >
            {t('public.landing.heroDescriptionMobile')}
          </motion.p>
          
          <motion.div variants={itemVariants} className="space-y-5">
            <motion.div whileTap={{ scale: 0.98 }} transition={springConfig}>
              <Button
                size="lg"
                asChild
                className="w-full h-16 text-xl font-semibold gradient-golden text-black glow-golden rounded-2xl"
                data-testid="button-discover-events"
                onClick={handleButtonPress}
              >
                <Link href="/acquista">
                  <Music className="mr-3 h-6 w-6" />
                  {t('public.landing.discoverEvents')}
                </Link>
              </Button>
            </motion.div>
            
            <motion.div whileTap={{ scale: 0.98 }} transition={springConfig}>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full h-16 text-xl font-medium border-white/20 rounded-2xl"
                data-testid="button-venues"
                onClick={handleButtonPress}
              >
                <Link href="/locali">
                  <MapPin className="mr-3 h-6 w-6" />
                  {t('public.landing.exploreVenues')}
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-8 h-12 rounded-full border-2 border-white/25 flex items-start justify-center p-2.5"
            >
              <motion.div className="w-2 h-2 rounded-full bg-primary" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springConfig}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">
            {t('public.landing.whyChooseUs')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('public.landing.whyChooseUsDescMobile')}
          </p>
        </motion.div>

        <div className="space-y-5">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ ...springConfig, delay: index * 0.08 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-6 flex items-center gap-6 rounded-2xl"
              onClick={() => triggerHaptic('light')}
            >
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary/25 to-amber-500/15 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-9 w-9 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springConfig}
          className="glass-card p-10 text-center relative overflow-hidden rounded-3xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-teal-500/15 pointer-events-none" />
          
          <div className="relative z-10">
            <BrandLogo variant="monogram" className="h-20 w-auto mx-auto mb-8" />
            
            <h2 className="text-3xl font-bold mb-4">
              {t('public.landing.readyForNight')}
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              {t('public.landing.readyForNightDescMobile')}
            </p>
            
            {!isAuthenticated && (
              <motion.div whileTap={{ scale: 0.98 }} transition={springConfig}>
                <Button
                  size="lg"
                  asChild
                  className="w-full h-16 text-xl font-semibold gradient-golden text-black glow-golden rounded-2xl"
                  data-testid="button-register-cta"
                  onClick={handleButtonPress}
                >
                  <Link href="/register">
                    {t('public.landing.startNow')}
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Link>
                </Button>
              </motion.div>
            )}
            
            {isAuthenticated && (
              <motion.div whileTap={{ scale: 0.98 }} transition={springConfig}>
                <Button
                  size="lg"
                  asChild
                  className="w-full h-16 text-xl font-semibold gradient-golden text-black glow-golden rounded-2xl"
                  data-testid="button-explore-cta"
                  onClick={handleButtonPress}
                >
                  <Link href="/acquista">
                    {t('public.landing.exploreEvents')}
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Link>
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-t border-white/10 px-6 py-10 mt-auto"
      >
        <div className="flex flex-col items-center gap-8">
          <BrandLogo variant="horizontal" className="h-8 w-auto" />
          
          <div className="flex items-center gap-6">
            <Link 
              href="/acquista" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-events"
              onClick={handleLinkPress}
            >
              {t('public.nav.events')}
            </Link>
            <Link 
              href="/rivendite" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-resales"
              onClick={handleLinkPress}
            >
              {t('public.nav.resales')}
            </Link>
            <Link 
              href="/locali" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-venues"
              onClick={handleLinkPress}
            >
              {t('public.nav.venues')}
            </Link>
            <Link 
              href="/login" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-login"
              onClick={handleLinkPress}
            >
              {t('auth.login')}
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            {t('public.footer.copyrightMobile', { year: new Date().getFullYear() })}
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
