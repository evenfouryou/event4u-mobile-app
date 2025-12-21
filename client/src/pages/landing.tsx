import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Ticket, Users, Sparkles, ArrowRight, MapPin, Music, User } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

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
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Hero Section - Full Height */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background"
            style={{ zIndex: 1 }}
          />
          <motion.div 
            className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-40"
            style={{ 
              background: "radial-gradient(circle, rgba(255,215,0,0.25) 0%, transparent 70%)",
              filter: "blur(60px)"
            }}
            animate={{ 
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-40 left-0 w-96 h-96 rounded-full opacity-30"
            style={{ 
              background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)",
              filter: "blur(80px)"
            }}
            animate={{ 
              x: [0, -20, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-20 px-5 py-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-bold">
                Event<span className="text-primary">4</span>U
              </span>
            </div>
            
            {isAuthenticated ? (
              <Link href="/account">
                <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-primary/30 hover:ring-primary/60 transition-all" data-testid="avatar-user">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Button
                variant="ghost"
                className="h-11 px-5 text-base font-medium"
                asChild
                data-testid="button-login"
              >
                <Link href="/login">Accedi</Link>
              </Button>
            )}
          </div>
        </motion.header>

        {/* Hero Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-8"
        >
          {/* Live Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full glass border border-primary/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400"></span>
              </span>
              <span className="text-sm font-medium text-teal">Eventi live questa sera</span>
            </div>
          </motion.div>
          
          {/* Main Heading */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl font-bold leading-tight mb-5"
          >
            La tua notte
            <br />
            <span className="gradient-golden-text">inizia qui</span>
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-lg text-muted-foreground mb-10 leading-relaxed"
          >
            Scopri i migliori eventi e club della città. Biglietti, liste VIP e tavoli in un tap.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="space-y-4">
            <Button
              size="lg"
              asChild
              className="w-full h-14 text-lg font-semibold gradient-golden text-black glow-golden"
              data-testid="button-discover-events"
            >
              <Link href="/acquista">
                <Music className="mr-2 h-5 w-5" />
                Scopri Eventi
              </Link>
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full h-14 text-lg font-medium border-white/20 hover:bg-white/5"
              data-testid="button-venues"
            >
              <Link href="/locali">
                <MapPin className="mr-2 h-5 w-5" />
                Esplora Locali
              </Link>
            </Button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
            >
              <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-2xl font-bold mb-3">
            Perché sceglierci
          </h2>
          <p className="text-muted-foreground">
            Tutto quello che ti serve per vivere la notte
          </p>
        </motion.div>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-5 flex items-center gap-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-6 py-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="glass-card p-8 text-center relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-teal-500/10 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
              <Sparkles className="h-8 w-8 text-black" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3">
              Pronto per la serata?
            </h2>
            <p className="text-muted-foreground mb-8">
              Registrati gratis e scopri eventi esclusivi
            </p>
            
            {!isAuthenticated && (
              <Button
                size="lg"
                asChild
                className="w-full h-14 text-lg font-semibold gradient-golden text-black glow-golden"
                data-testid="button-register-cta"
              >
                <Link href="/register">
                  Inizia Ora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
            
            {isAuthenticated && (
              <Button
                size="lg"
                asChild
                className="w-full h-14 text-lg font-semibold gradient-golden text-black glow-golden"
                data-testid="button-explore-cta"
              >
                <Link href="/acquista">
                  Esplora Eventi
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative z-10 border-t border-white/10 px-6 py-8 mt-auto"
      >
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <span className="font-semibold">Event<span className="text-primary">4</span>U</span>
          </div>
          
          {/* Links */}
          <div className="flex items-center gap-6">
            <Link href="/acquista" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center" data-testid="link-footer-events">
              Eventi
            </Link>
            <Link href="/locali" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center" data-testid="link-footer-venues">
              Locali
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center" data-testid="link-footer-login">
              Accedi
            </Link>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Event Four You
            <br />
            Tutti i diritti riservati
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
