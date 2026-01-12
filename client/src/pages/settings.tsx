import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { HapticButton, MobileAppLayout, MobileHeader, triggerHaptic } from "@/components/mobile-primitives";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  User, 
  ChevronRight, 
  Moon, 
  Sun, 
  Bell, 
  LogOut,
  Settings as SettingsIcon,
  Shield,
  Palette
} from "lucide-react";

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springTransition
  }
};

interface SettingsCardProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  testId?: string;
}

function SettingsCard({ 
  icon: Icon, 
  iconColor, 
  title, 
  subtitle, 
  onClick, 
  rightElement,
  showChevron = true,
  testId 
}: SettingsCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      className="glass-card overflow-visible"
      data-testid={testId}
    >
      <button
        onClick={() => {
          triggerHaptic('light');
          onClick?.();
        }}
        className="w-full flex items-center gap-4 p-4 min-h-[72px] text-left"
        disabled={!onClick && !rightElement}
      >
        <div className={`w-12 h-12 rounded-2xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        
        {rightElement}
        
        {showChevron && onClick && !rightElement && (
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
    </motion.div>
  );
}

interface ToggleRowProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId?: string;
}

function ToggleRow({ 
  icon: Icon, 
  iconColor, 
  title, 
  subtitle, 
  checked, 
  onCheckedChange,
  testId 
}: ToggleRowProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="glass-card overflow-visible"
      data-testid={testId}
    >
      <div className="flex items-center gap-4 p-4 min-h-[72px]">
        <div className={`w-12 h-12 rounded-2xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <Switch
          checked={checked}
          onCheckedChange={(value) => {
            triggerHaptic('light');
            onCheckedChange(value);
          }}
          className="min-h-[44px] min-w-[44px] data-[state=checked]:bg-primary"
        />
      </div>
    </motion.div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  const isDarkMode = resolvedTheme === 'dark';
  
  const handleLogout = async () => {
    triggerHaptic('medium');
    try {
      await fetch('/api/logout', { credentials: 'include' });
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };
  
  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-background px-4 pb-24"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="pt-6 pb-4">
          <Skeleton className="h-8 w-40 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const userDisplayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || t('common.user');

  const roleDisplay = user?.role === 'gestore' ? t('settings.roles.manager') 
    : user?.role === 'super_admin' ? t('settings.roles.superAdmin')
    : user?.role === 'bartender' ? t('settings.roles.bartender')
    : user?.role || t('common.user');

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-settings">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1" data-testid="card-profile-section">
            <CardHeader>
              <CardTitle>{t('settings.profile.title')}</CardTitle>
              <CardDescription>{t('settings.profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate" data-testid="text-user-name">
                    {userDisplayName}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-user-role">
                    {roleDisplay}
                  </p>
                  <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation('/account/profile')}
                data-testid="button-edit-profile"
              >
                <User className="h-4 w-4 mr-2" />
                {t('settings.profile.editProfile')}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('settings.preferences.title')}</CardTitle>
              <CardDescription>{t('settings.preferences.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings.table.setting')}</TableHead>
                    <TableHead>{t('settings.table.description')}</TableHead>
                    <TableHead className="text-right">{t('settings.table.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow data-testid="row-theme">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        {t('settings.theme.darkTheme')}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {isDarkMode ? t('settings.theme.active') : t('settings.theme.inactive')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={isDarkMode}
                        onCheckedChange={handleThemeToggle}
                        data-testid="toggle-dark-mode"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-notifications">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        {t('settings.notifications.pushNotifications')}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t('settings.notifications.receiveUpdates')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={true}
                        onCheckedChange={() => {}}
                        data-testid="toggle-notifications"
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="card-privacy">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('settings.privacy.title')}</CardTitle>
                  <CardDescription>{t('settings.privacy.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {t('settings.privacy.viewOptions')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('settings.privacy.title')}</DialogTitle>
                    <DialogDescription>
                      {t('settings.privacy.dialogDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <span>{t('settings.privacy.twoFactor')}</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('settings.privacy.saveHistory')}</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">{t('common.close')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card data-testid="card-advanced">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('settings.advanced.title')}</CardTitle>
                  <CardDescription>{t('settings.advanced.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {t('settings.privacy.viewOptions')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('settings.advanced.title')}</DialogTitle>
                    <DialogDescription>
                      {t('settings.advanced.dialogDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <span>{t('settings.advanced.compactMode')}</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('settings.advanced.animations')}</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">{t('common.close')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('settings.logout.title')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.logout.description')}</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('settings.logout.button')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {t('settings.version')}
        </p>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title={t('settings.title')} showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="px-4 space-y-6"
      >
        <section>
          <motion.p 
            variants={staggerItem}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1"
          >
            {t('settings.profile.title')}
          </motion.p>
          
          <motion.div
            variants={staggerItem}
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
            className="glass-card overflow-visible"
            data-testid="card-profile-section"
          >
            <button
              onClick={() => {
                triggerHaptic('light');
                setLocation('/account/profile');
              }}
              className="w-full flex items-center gap-4 p-4 min-h-[88px] text-left"
            >
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-lg font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-foreground truncate" data-testid="text-user-name">
                  {userDisplayName}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-user-role">
                  {roleDisplay}
                </p>
                <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          </motion.div>
        </section>

        <section>
          <motion.p 
            variants={staggerItem}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1"
          >
            {t('settings.appearance')}
          </motion.p>
          
          <div className="space-y-3">
            <ToggleRow
              icon={isDarkMode ? Moon : Sun}
              iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
              title={t('settings.theme.darkTheme')}
              subtitle={isDarkMode ? t('settings.theme.active') : t('settings.theme.inactive')}
              checked={isDarkMode}
              onCheckedChange={handleThemeToggle}
              testId="toggle-dark-mode"
            />
          </div>
        </section>

        <section>
          <motion.p 
            variants={staggerItem}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1"
          >
            {t('settings.notifications.title')}
          </motion.p>
          
          <div className="space-y-3">
            <ToggleRow
              icon={Bell}
              iconColor="bg-gradient-to-br from-teal-500 to-cyan-600"
              title={t('settings.notifications.pushNotifications')}
              subtitle={t('settings.notifications.receiveUpdates')}
              checked={true}
              onCheckedChange={() => {}}
              testId="toggle-notifications"
            />
          </div>
        </section>

        <section>
          <motion.p 
            variants={staggerItem}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1"
          >
            {t('settings.other')}
          </motion.p>
          
          <div className="space-y-3">
            <SettingsCard
              icon={Shield}
              iconColor="bg-gradient-to-br from-green-500 to-emerald-600"
              title={t('settings.privacy.title')}
              subtitle={t('settings.privacy.description')}
              testId="card-privacy"
            />
            
            <SettingsCard
              icon={SettingsIcon}
              iconColor="bg-gradient-to-br from-slate-500 to-slate-700"
              title={t('settings.advanced.title')}
              subtitle={t('settings.advanced.description')}
              testId="card-advanced"
            />
          </div>
        </section>

        <motion.div 
          variants={staggerItem}
          className="pt-4"
        >
          <HapticButton
            onClick={handleLogout}
            hapticType="medium"
            variant="destructive"
            className="w-full min-h-[56px] rounded-2xl text-base font-semibold"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-2" />
            {t('settings.logout.title')}
          </HapticButton>
        </motion.div>

        <motion.p 
          variants={staggerItem}
          className="text-center text-xs text-muted-foreground pt-2 pb-4"
        >
          {t('settings.version')}
        </motion.p>
      </motion.div>
    </MobileAppLayout>
  );
}
