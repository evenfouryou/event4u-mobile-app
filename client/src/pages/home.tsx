import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Wine,
  Calculator,
  Users,
  Database,
  ArrowRight,
  Calendar,
  Plus,
  Building2,
  Wallet,
  FileText,
} from "lucide-react";
import type { Company } from "@shared/schema";

function SectionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
  available = true,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  available?: boolean;
}) {
  const content = (
    <Card className={`hover-elevate cursor-pointer h-full transition-all ${!available ? 'opacity-60' : ''}`}>
      <CardContent className="p-8">
        <div className="flex items-start gap-6">
          <div className={`rounded-2xl p-5 ${color}`}>
            <Icon className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
            {!available && (
              <p className="text-sm text-orange-500 font-medium mt-3">Prossimamente</p>
            )}
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground mt-2" />
        </div>
      </CardContent>
    </Card>
  );

  if (!available) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  return (
    <Link href={href} data-testid={`section-${title.toLowerCase()}`}>
      {content}
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const isSuperAdmin = user?.role === 'super_admin';
  const isBartender = user?.role === 'bartender';
  const isWarehouse = user?.role === 'warehouse';

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  // Redirect baristi e magazzinieri direttamente a Beverage
  useEffect(() => {
    if (isBartender || isWarehouse) {
      setLocation('/beverage');
    }
  }, [isBartender, isWarehouse, setLocation]);

  if (isBartender || isWarehouse) {
    return null;
  }

  if (isSuperAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Benvenuto, {user?.firstName}</h1>
            <p className="text-muted-foreground">
              Panoramica sistema EventFourYou
            </p>
          </div>
          <Button asChild data-testid="button-create-company">
            <Link href="/companies">
              <Plus className="h-4 w-4 mr-2" />
              Nuova Azienda
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {companiesLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Aziende Totali</p>
                      <p className="text-3xl font-semibold" data-testid="stat-companies-total">
                        {companies?.length || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Aziende Attive</p>
                      <p className="text-3xl font-semibold" data-testid="stat-companies-active">
                        {companies?.filter(c => c.active).length || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aziende Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {companiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : companies && companies.length > 0 ? (
              <div className="space-y-2">
                {companies.slice(0, 5).map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 rounded-lg hover-elevate"
                    data-testid={`company-item-${company.id}`}
                  >
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.taxId || 'N/A'}</p>
                    </div>
                    <div className="text-sm">
                      {company.active ? (
                        <span className="text-green-600">Attiva</span>
                      ) : (
                        <span className="text-muted-foreground">Inattiva</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nessuna azienda presente</p>
                <Button asChild className="mt-4" data-testid="button-create-first-company">
                  <Link href="/companies">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Prima Azienda
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold mb-2">
          Benvenuto, {user?.firstName || 'Gestore'}
        </h1>
        <p className="text-muted-foreground text-lg">
          Seleziona una sezione per iniziare
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Eventi"
          description="Crea e gestisci i tuoi eventi. Pianifica date, location e organizza ogni dettaglio della serata."
          icon={Calendar}
          href="/events"
          color="bg-indigo-500"
        />
        <SectionCard
          title="Beverage"
          description="Magazzino, postazioni e consumi. Monitora le scorte e gestisci l'inventario delle bevande."
          icon={Wine}
          href="/beverage"
          color="bg-purple-500"
        />
        <SectionCard
          title="Contabilità"
          description="Costi fissi, costi extra, manutenzioni e documenti contabili. Gestione completa della contabilità aziendale."
          icon={Calculator}
          href="/accounting"
          color="bg-emerald-500"
        />
        <SectionCard
          title="Personale"
          description="Anagrafica staff, assegnazioni agli eventi e gestione pagamenti. Organizza il tuo team efficacemente."
          icon={Users}
          href="/personnel"
          color="bg-blue-500"
        />
        <SectionCard
          title="Cassa"
          description="Settori, postazioni, registrazione incassi e quadratura fondi. Gestione completa della cassa eventi."
          icon={Wallet}
          href="/cash-register"
          color="bg-orange-500"
        />
        <SectionCard
          title="File della Serata"
          description="Documento riepilogativo integrato. Visualizza contabilità, personale e cassa per ogni evento."
          icon={FileText}
          href="/night-file"
          color="bg-rose-500"
        />
        <SectionCard
          title="Dati"
          description="Analytics avanzati, report e statistiche. Ottieni insights per migliorare il tuo business."
          icon={Database}
          href="/data"
          color="bg-slate-500"
          available={false}
        />
      </div>
    </div>
  );
}
