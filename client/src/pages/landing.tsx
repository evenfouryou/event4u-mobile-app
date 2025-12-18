import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Package, BarChart3, Users, Sparkles, ArrowRight, Zap, Shield, Clock, Ticket, User } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

export default function Landing() {
  const { isAuthenticated } = useCustomerAuth();
  
  const features = [
    {
      icon: Calendar,
      title: "Gestione Eventi",
      description: "Crea e organizza eventi con location, postazioni e staff assegnato",
      gradient: "from-amber-500/20 to-yellow-500/10"
    },
    {
      icon: Package,
      title: "Inventario Completo",
      description: "Magazzino multi-livello con tracciamento in tempo reale",
      gradient: "from-teal-500/20 to-cyan-500/10"
    },
    {
      icon: Users,
      title: "Team Multi-Ruolo",
      description: "Gestione staff con ruoli specifici e permessi granulari",
      gradient: "from-violet-500/20 to-purple-500/10"
    },
    {
      icon: BarChart3,
      title: "Analytics Avanzati",
      description: "Report dettagliati con export PDF e analisi AI",
      gradient: "from-rose-500/20 to-pink-500/10"
    }
  ];

  const stats = [
    { value: "500+", label: "Eventi Gestiti" },
    { value: "50+", label: "Club Partner" },
    { value: "10K+", label: "Prodotti Tracciati" },
    { value: "99.9%", label: "Uptime" }
  ];

  const benefits = [
    { icon: Zap, text: "Setup in 5 minuti" },
    { icon: Shield, text: "Dati sicuri e protetti" },
    { icon: Clock, text: "Supporto 24/7" }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Animated background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)" }}
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[800px] h-[800px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.15) 0%, transparent 70%)" }}
          animate={{ 
            x: [0, -30, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass sticky top-0 z-50"
      >
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
            </div>
            <span className="text-lg sm:text-xl font-bold hidden sm:block">
              Event<span className="text-primary">4</span>U
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-primary/50 text-primary hover:bg-primary/10"
              data-testid="button-venues"
            >
              <Link href="/locali">
                Locali
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-primary/50 text-primary hover:bg-primary/10"
              data-testid="button-buy-tickets"
            >
              <Link href="/acquista">
                <Ticket className="w-4 h-4 mr-1" />
                Biglietti
              </Link>
            </Button>
            {isAuthenticated ? (
              <Link href="/account">
                <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all" data-testid="avatar-user">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-login"
                >
                  <Link href="/login">Accedi</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="gradient-golden text-black font-semibold"
                  data-testid="button-register-header"
                >
                  <Link href="/register">Inizia Gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-3 sm:px-4 md:px-6 pt-8 sm:pt-12 md:pt-20 pb-12 sm:pb-16 md:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass border border-primary/30 text-xs sm:text-sm font-medium mb-6 sm:mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-teal">La piattaforma #1 per i club</span>
            </motion.div>
            
            {/* Main heading */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
            >
              Gestisci i tuoi
              <br />
              <span className="gradient-golden-text">eventi come un pro</span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto"
            >
              Inventario, staff, cassa e report in un'unica piattaforma.
              Tutto in tempo reale, ovunque tu sia.
            </motion.p>
            
            {/* CTA buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            >
              <Button
                size="lg"
                asChild
                className="gradient-golden text-black font-semibold h-14 px-8 text-lg w-full sm:w-auto glow-golden"
                data-testid="button-register-hero"
              >
                <Link href="/register">
                  Inizia Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 px-8 text-lg w-full sm:w-auto border-white/20 hover:bg-white/5"
                data-testid="button-login-hero"
              >
                <Link href="/login">Accedi al tuo account</Link>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
            >
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <benefit.icon className="h-4 w-4 text-teal" />
                  <span>{benefit.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-4 sm:p-6 md:p-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {stats.map((stat, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold gradient-golden-text mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tutto ciò di cui hai bisogno
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Una suite completa di strumenti per gestire ogni aspetto del tuo club
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-6 group hover:border-primary/30 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Modules Preview */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Moduli Integrati
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Ogni aspetto della gestione del tuo club, coperto da moduli specifici
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {[
              { name: "Beverage", icon: "🍸", color: "from-amber-500 to-orange-600" },
              { name: "Contabilità", icon: "📊", color: "from-emerald-500 to-teal-600" },
              { name: "Personale", icon: "👥", color: "from-blue-500 to-indigo-600" },
              { name: "Cassa", icon: "💰", color: "from-violet-500 to-purple-600" },
              { name: "File Serata", icon: "📋", color: "from-rose-500 to-pink-600" }
            ].map((module, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="glass-card p-4 md:p-6 text-center group hover:border-white/20 transition-all duration-300"
              >
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mx-auto mb-3 text-2xl md:text-3xl group-hover:scale-110 transition-transform duration-300`}>
                  {module.icon}
                </div>
                <h3 className="font-semibold text-sm md:text-base">
                  {module.name}
                </h3>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card p-8 md:p-12 text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-teal-500/10 pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pronto per iniziare?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Unisciti a centinaia di club che già utilizzano Event4U per gestire i loro eventi
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="gradient-golden text-black font-semibold h-14 px-8 text-lg glow-golden"
                  data-testid="button-register-footer"
                >
                  <Link href="/register">
                    Crea Account Gratuito
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 text-lg border-white/20 hover:bg-white/5"
                  data-testid="button-login-footer"
                >
                  <Link href="/login">Accedi</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t border-white/10 py-8 mt-auto"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-black" />
              </div>
              <span>Event<span className="text-primary">4</span>U</span>
            </div>
            <p>© {new Date().getFullYear()} Event Four You. Tutti i diritti riservati.</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
