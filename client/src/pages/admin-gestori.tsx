import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Building2,
  Calendar,
  ChevronLeft,
  Mail,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { User, Company } from "@shared/schema";

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.08,
    },
  }),
};

export default function AdminGestori() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const gestori = useMemo(() => {
    return users?.filter((user) => user.role === "gestore") || [];
  }, [users]);

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "Nessuna azienda";
    const company = companies?.find((c) => c.id === companyId);
    return company?.name || "Azienda sconosciuta";
  };

  const handleViewCompanies = (gestore: User) => {
    triggerHaptic("medium");
    setLocation(`/admin/gestori/${gestore.id}/companies`);
  };

  const handleViewEvents = (gestore: User) => {
    triggerHaptic("medium");
    setLocation(`/admin/gestori/${gestore.id}/events`);
  };

  const handleViewUsers = (gestore: User) => {
    triggerHaptic("medium");
    setLocation(`/admin/gestori/${gestore.id}/users`);
  };

  const renderGestoreCard = (gestore: User, index: number) => {
    const initials = `${gestore.firstName?.[0] || ""}${gestore.lastName?.[0] || ""}`.toUpperCase();
    return (
      <motion.div
        key={gestore.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileTap={{ scale: 0.98 }}
      >
        <Card className="hover-elevate" data-testid={`card-gestore-${gestore.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials || "G"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" data-testid={`text-gestore-name-${gestore.id}`}>
                  {gestore.firstName} {gestore.lastName}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Mail className="h-3 w-3" />
                  <span className="truncate" data-testid={`text-gestore-email-${gestore.id}`}>
                    {gestore.email}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate" data-testid={`text-gestore-company-${gestore.id}`}>
                    {getCompanyName(gestore.companyId)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewCompanies(gestore)}
                data-testid={`button-view-companies-${gestore.id}`}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Aziende
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewUsers(gestore)}
                data-testid={`button-view-users-${gestore.id}`}
              >
                <Users className="h-4 w-4 mr-1" />
                Utenti
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewEvents(gestore)}
                data-testid={`button-view-events-${gestore.id}`}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Eventi
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderDesktopTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestori
        </CardTitle>
        <CardDescription>
          Gestisci i gestori e le loro associazioni con le aziende
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Azienda Principale</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gestori.map((gestore) => (
              <TableRow key={gestore.id} data-testid={`row-gestore-${gestore.id}`}>
                <TableCell className="font-medium" data-testid={`text-gestore-name-${gestore.id}`}>
                  {gestore.firstName} {gestore.lastName}
                </TableCell>
                <TableCell data-testid={`text-gestore-email-${gestore.id}`}>
                  {gestore.email}
                </TableCell>
                <TableCell data-testid={`text-gestore-company-${gestore.id}`}>
                  {getCompanyName(gestore.companyId)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCompanies(gestore)}
                      data-testid={`button-view-companies-${gestore.id}`}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Aziende
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewUsers(gestore)}
                      data-testid={`button-view-users-${gestore.id}`}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Utenti
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEvents(gestore)}
                      data-testid={`button-view-events-${gestore.id}`}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Eventi
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {gestori.length === 0 && !usersLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Nessun gestore trovato
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Gestori"
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-3">
          {usersLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : gestori.length > 0 ? (
            gestori.map((gestore, index) => renderGestoreCard(gestore, index))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nessun gestore trovato
            </div>
          )}
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gestione Gestori</h1>
          <p className="text-muted-foreground">
            Gestisci i gestori e le loro associazioni con le aziende
          </p>
        </div>
      </div>

      {usersLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        renderDesktopTable()
      )}
    </div>
  );
}
