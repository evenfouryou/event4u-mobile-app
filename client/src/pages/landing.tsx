import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Package, BarChart3, Users, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-background sticky top-0 z-50"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Event Four You</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              asChild
              data-testid="button-login"
            >
              <Link href="/login">Accedi</Link>
            </Button>
            <Button
              asChild
              data-testid="button-register-header"
            >
              <Link href="/register">Registrati</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="flex-1">
        <section className="relative container mx-auto px-6 py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
          <motion.div 
            className="absolute top-10 right-10 w-72 h-72 bg-primary/5 rounded-full pointer-events-none"
            animate={{ 
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-10 left-10 w-96 h-96 bg-primary/3 rounded-full pointer-events-none"
            animate={{ 
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          
          <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="h-4 w-4" />
              Il sistema completo per i tuoi eventi
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-semibold mb-6"
            >
              Gestione Eventi e Inventario
              <motion.span 
                className="block text-primary mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Semplice e Professionale
              </motion.span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-muted-foreground mb-8"
            >
              Sistema completo per organizzare eventi, gestire magazzino, 
              tracciare consumi e generare report dettagliati in tempo reale.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-4 justify-center flex-wrap"
            >
              <Button
                size="lg"
                asChild
                data-testid="button-register-hero"
                className="group"
              >
                <Link href="/register">
                  <span>Registrati Ora</span>
                  <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                data-testid="button-login-hero"
              >
                <Link href="/login">Accedi</Link>
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {[
              {
                icon: Calendar,
                title: "Gestione Eventi",
                description: "Crea e organizza eventi con location, postazioni e staff assegnato",
                delay: 0.6
              },
              {
                icon: Package,
                title: "Inventario Multi-Livello",
                description: "Magazzino generale, per evento e per postazione con tracciamento completo",
                delay: 0.7
              },
              {
                icon: Users,
                title: "Multi-Ruolo",
                description: "Gestione utenti con ruoli specifici: Admin, Organizzatore, Barista",
                delay: 0.8
              },
              {
                icon: BarChart3,
                title: "Report Dettagliati",
                description: "Analisi consumi e costi per evento e postazione con export PDF/Excel",
                delay: 0.9
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: feature.delay }}
              >
                <Card className="h-full hover-elevate active-elevate-2">
                  <CardContent className="p-6">
                    <feature.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="relative bg-gradient-to-br from-card to-card/50 py-16 overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-primary/5 opacity-50"
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            style={{ 
              backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px"
            }}
          />
          <div className="container mx-auto px-6 relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto text-center"
            >
              <h3 className="text-3xl font-semibold mb-4">
                Pronto per iniziare?
              </h3>
              <p className="text-muted-foreground mb-6">
                Registrati ora e inizia a gestire i tuoi eventi in modo professionale
              </p>
              <motion.div 
                className="flex gap-4 justify-center flex-wrap"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  size="lg"
                  asChild
                  data-testid="button-register-footer"
                >
                  <Link href="/register">Crea Account</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="button-login-footer"
                >
                  <Link href="/login">Accedi</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t py-8"
      >
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Event Four You. Sistema di gestione eventi e inventario.
        </div>
      </motion.footer>
    </div>
  );
}
