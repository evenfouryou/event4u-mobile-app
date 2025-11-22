import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Package, BarChart3, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Event4U</h1>
          </div>
          <Button
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Accedi
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6">
              Gestione Eventi e Inventario
              <span className="block text-primary mt-2">Semplice e Professionale</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Sistema completo per organizzare eventi, gestire magazzino, 
              tracciare consumi e generare report dettagliati in tempo reale.
            </p>
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login-hero"
            >
              Inizia Ora
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <Calendar className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Gestione Eventi
                </h3>
                <p className="text-sm text-muted-foreground">
                  Crea e organizza eventi con location, postazioni e staff assegnato
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Package className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Inventario Multi-Livello
                </h3>
                <p className="text-sm text-muted-foreground">
                  Magazzino generale, per evento e per postazione con tracciamento completo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Multi-Ruolo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gestione utenti con ruoli specifici: Admin, Organizzatore, Barista
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <BarChart3 className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Report Dettagliati
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analisi consumi e costi per evento e postazione con export PDF/Excel
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-card py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-semibold mb-4">
                Pronto per iniziare?
              </h3>
              <p className="text-muted-foreground mb-6">
                Registrati ora e inizia a gestire i tuoi eventi in modo professionale
              </p>
              <Button
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login-footer"
              >
                Accedi alla Piattaforma
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Event4U. Sistema di gestione eventi e inventario.
        </div>
      </footer>
    </div>
  );
}
