import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Ticket, Users, Sparkles, ArrowRight, MapPin, Music, User } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { triggerHaptic } from "@/components/mobile-primitives";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function Landing() {
  const { isAuthenticated } = useCustomerAuth();
  
  const features = [
    {
      icon: Calendar,
      title: "Eventi Esclusivi",
      description: "Scopri le serate più hot della tua città"
    },
    {
      icon: Ticket,
      title: "Biglietti Sicuri",
      description: "Acquista in pochi tap, senza code"
    },
    {
      icon: MapPin,
      title: "Locali Top",
      description: "I migliori club selezionati per te"
    },
    {
      icon: Users,
      title: "Lista VIP",
      description: "Accesso prioritario e tavoli riservati"
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
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30"
                whileTap={{ scale: 0.95 }}
                transition={springConfig}
              >
                <Sparkles className="h-7 w-7 text-black" />
              </motion.div>
              <span className="text-2xl font-bold">
                Event<span className="text-primary">4</span>U
              </span>
            </div>
            
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
                  <Link href="/login">Accedi</Link>
                </Button>
              </motion.div>
            )}
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
              <span className="text-base font-medium text-teal">Eventi live questa sera</span>
            </div>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-5xl font-bold leading-tight mb-6"
          >
            La tua notte
            <br />
            <span className="gradient-golden-text">inizia qui</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-xl text-muted-foreground mb-12 leading-relaxed"
          >
            Scopri i migliori eventi e club della città. Biglietti, liste VIP e tavoli in un tap.
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
                  Scopri Eventi
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
                  Esplora Locali
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
            Perché sceglierci
          </h2>
          <p className="text-lg text-muted-foreground">
            Tutto quello che ti serve per vivere la notte
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
            <motion.div 
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-500/30"
              whileTap={{ scale: 0.95 }}
              transition={springConfig}
            >
              <Sparkles className="h-10 w-10 text-black" />
            </motion.div>
            
            <h2 className="text-3xl font-bold mb-4">
              Pronto per la serata?
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Registrati gratis e scopri eventi esclusivi
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
                    Inizia Ora
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
                    Esplora Eventi
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <span className="text-lg font-semibold">Event<span className="text-primary">4</span>U</span>
          </div>
          
          <div className="flex items-center gap-8">
            <Link 
              href="/acquista" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-events"
              onClick={handleLinkPress}
            >
              Eventi
            </Link>
            <Link 
              href="/locali" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-venues"
              onClick={handleLinkPress}
            >
              Locali
            </Link>
            <Link 
              href="/login" 
              className="text-base text-muted-foreground min-h-[48px] min-w-[48px] flex items-center justify-center" 
              data-testid="link-footer-login"
              onClick={handleLinkPress}
            >
              Accedi
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Event Four You
            <br />
            Tutti i diritti riservati
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
