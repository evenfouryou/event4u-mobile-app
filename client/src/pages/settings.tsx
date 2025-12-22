import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { HapticButton, MobileAppLayout, MobileHeader, triggerHaptic } from "@/components/mobile-primitives";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { user, isLoading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  
  const isDarkMode = resolvedTheme === 'dark';
  
  const handleLogout = async () => {
    triggerHaptic('medium');
    window.location.href = '/api/logout';
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
    : user?.email || 'Utente';

  const roleDisplay = user?.role === 'gestore' ? 'Gestore Azienda' 
    : user?.role === 'super_admin' ? 'Super Admin'
    : user?.role === 'bartender' ? 'Bartender'
    : user?.role || 'Utente';

  return (
    <MobileAppLayout
      header={<MobileHeader title="Impostazioni" showBackButton showMenuButton />}
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
            Profilo
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
            Aspetto
          </motion.p>
          
          <div className="space-y-3">
            <ToggleRow
              icon={isDarkMode ? Moon : Sun}
              iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
              title="Tema Scuro"
              subtitle={isDarkMode ? "Attivo" : "Disattivo"}
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
            Notifiche
          </motion.p>
          
          <div className="space-y-3">
            <ToggleRow
              icon={Bell}
              iconColor="bg-gradient-to-br from-teal-500 to-cyan-600"
              title="Notifiche Push"
              subtitle="Ricevi aggiornamenti importanti"
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
            Altro
          </motion.p>
          
          <div className="space-y-3">
            <SettingsCard
              icon={Shield}
              iconColor="bg-gradient-to-br from-green-500 to-emerald-600"
              title="Privacy e Sicurezza"
              subtitle="Gestisci i tuoi dati"
              testId="card-privacy"
            />
            
            <SettingsCard
              icon={SettingsIcon}
              iconColor="bg-gradient-to-br from-slate-500 to-slate-700"
              title="Preferenze Avanzate"
              subtitle="Impostazioni dell'app"
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
            Esci dall'Account
          </HapticButton>
        </motion.div>

        <motion.p 
          variants={staggerItem}
          className="text-center text-xs text-muted-foreground pt-2 pb-4"
        >
          Event4U v1.0.0
        </motion.p>
      </motion.div>
    </MobileAppLayout>
  );
}
