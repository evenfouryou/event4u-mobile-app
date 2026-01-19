import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useParams } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  ChevronLeft,
  Mail,
  Building2,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
} from "@/components/mobile-primitives";
import type { User, Company } from "@shared/schema";

interface UserCompanyAssociation {
  id: string;
  userId: string;
  companyId: string;
  role: string | null;
  isDefault: boolean;
  createdAt: string | null;
  companyName: string;
}

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.05,
    },
  }),
};

export default function AdminGestoreUsers() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const params = useParams<{ gestoreId: string }>();
  const gestoreId = params.gestoreId;
  const isMobile = useIsMobile();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const gestore = useMemo(() => {
    return users?.find(u => u.id === gestoreId);
  }, [users, gestoreId]);

  const gestoreLoading = usersLoading;

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: gestoreCompanies } = useQuery<UserCompanyAssociation[]>({
    queryKey: ["/api/users", gestoreId, "companies"],
    enabled: !!gestoreId,
  });

  const gestoreCompanyIds = useMemo(() => {
    if (!gestore || !gestoreCompanies) return [];
    const companyIds = gestoreCompanies.map((gc) => gc.companyId);
    if (gestore.companyId && !companyIds.includes(gestore.companyId)) {
      companyIds.push(gestore.companyId);
    }
    return companyIds;
  }, [gestore, gestoreCompanies]);

  const gestoreUsers = useMemo(() => {
    if (!users || gestoreCompanyIds.length === 0) return [];
    return users.filter((user) => 
      user.companyId && gestoreCompanyIds.includes(user.companyId) && user.id !== gestoreId
    );
  }, [users, gestoreCompanyIds, gestoreId]);

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return t('admin.gestoreUsers.noCompany');
    const company = companies?.find((c) => c.id === companyId);
    return company?.name || t('admin.gestoreUsers.unknownCompany');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "gestore":
        return "default";
      case "capo_staff":
        return "secondary";
      case "pr":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "gestore":
        return t('admin.gestoreUsers.roles.gestore');
      case "gestore_covisione":
        return t('admin.gestoreUsers.roles.gestoreCovisione');
      case "capo_staff":
        return t('admin.gestoreUsers.roles.capoStaff');
      case "pr":
        return t('admin.gestoreUsers.roles.pr');
      case "warehouse":
        return t('admin.gestoreUsers.roles.warehouse');
      case "bartender":
        return t('admin.gestoreUsers.roles.bartender');
      case "cassiere":
        return t('admin.gestoreUsers.roles.cassiere');
      case "cliente":
        return t('admin.gestoreUsers.roles.cliente');
      case "scanner":
        return t('admin.gestoreUsers.roles.scanner');
      default:
        return role;
    }
  };

  const renderUserCard = (user: User, index: number) => {
    const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    return (
      <motion.div
        key={user.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="hover-elevate" data-testid={`card-user-${user.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" data-testid={`text-user-name-${user.id}`}>
                  {user.firstName} {user.lastName}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{getCompanyName(user.companyId)}</span>
                </div>
                <div className="mt-2">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderDesktopContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('admin.gestoreUsers.companyUsers')}
        </CardTitle>
        <CardDescription>
          {t('admin.gestoreUsers.companyUsersDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {usersLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : gestoreUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.gestoreUsers.tableHeaders.name')}</TableHead>
                <TableHead>{t('admin.gestoreUsers.tableHeaders.email')}</TableHead>
                <TableHead>{t('admin.gestoreUsers.tableHeaders.role')}</TableHead>
                <TableHead>{t('admin.gestoreUsers.tableHeaders.company')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestoreUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell data-testid={`text-user-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell data-testid={`text-user-role-${user.id}`}>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-user-company-${user.id}`}>
                    {getCompanyName(user.companyId)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t('admin.gestoreUsers.noUsersInCompanies')}
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
            title={`${t('admin.gestoreUsers.usersOf')} ${gestore?.firstName || ""}`}
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/gestori")}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-3">
          {usersLoading || gestoreLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : gestoreUsers.length > 0 ? (
            gestoreUsers.map((user, index) => renderUserCard(user, index))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('admin.gestoreUsers.noUsersFound')}
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
          onClick={() => setLocation("/admin/gestori")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {t('admin.gestoreUsers.usersOf')} {gestore?.firstName} {gestore?.lastName}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.gestoreUsers.companyUsersDescription')}
          </p>
        </div>
      </div>

      {gestoreLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        renderDesktopContent()
      )}
    </div>
  );
}
