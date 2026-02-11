import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { UserFeatures, CompanyFeatures } from '@/lib/api';
import { useAuth } from './AuthContext';

interface FeaturesContextType {
  userFeatures: UserFeatures | null;
  companyFeatures: CompanyFeatures | null;
  isLoading: boolean;
  featuresLoaded: boolean;
  refreshFeatures: () => Promise<void>;
  isModuleEnabled: (module: string) => boolean;
}

const FeaturesContext = createContext<FeaturesContextType>({
  userFeatures: null,
  companyFeatures: null,
  isLoading: false,
  featuresLoaded: false,
  refreshFeatures: async () => {},
  isModuleEnabled: () => true,
});

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [userFeatures, setUserFeatures] = useState<UserFeatures | null>(null);
  const [companyFeatures, setCompanyFeatures] = useState<CompanyFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  const loadFeatures = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setIsLoading(true);
    try {
      const [uf, cf] = await Promise.all([
        api.getUserFeatures(),
        api.getCompanyFeatures(),
      ]);
      setUserFeatures(uf);
      setCompanyFeatures(cf);
      setFeaturesLoaded(true);
    } catch (error) {
      console.error('Error loading features:', error);
      setFeaturesLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFeatures();
    } else {
      setUserFeatures(null);
      setCompanyFeatures(null);
      setFeaturesLoaded(false);
    }
  }, [isAuthenticated, user]);

  const isModuleEnabled = useCallback((module: string): boolean => {
    if (!featuresLoaded) return true;
    
    const uf = userFeatures;
    const cf = companyFeatures;

    const checkUser = (key: keyof UserFeatures): boolean => {
      if (!uf) return true;
      const val = uf[key];
      return typeof val === 'boolean' ? val : true;
    };

    const checkCompany = (key: keyof CompanyFeatures): boolean => {
      if (!cf) return true;
      const val = cf[key];
      return typeof val === 'boolean' ? val : true;
    };
    
    switch (module) {
      case 'beverage':
      case 'inventory':
        return checkUser('beverageEnabled') && checkCompany('beverageEnabled');
      case 'contabilita':
      case 'accounting':
        return checkUser('contabilitaEnabled') && checkCompany('contabilitaEnabled');
      case 'personale':
      case 'personnel':
      case 'staff':
        return checkUser('personaleEnabled') && checkCompany('personaleEnabled');
      case 'cassa':
      case 'cashier':
        return checkUser('cassaEnabled') && checkCompany('cassaEnabled');
      case 'nightFile':
      case 'night-file':
        return checkUser('nightFileEnabled') && checkCompany('nightFileEnabled');
      case 'siae':
        return checkUser('siaeEnabled') && checkCompany('siaeEnabled');
      case 'scanner':
        return checkUser('scannerEnabled') && checkCompany('scannerEnabled');
      case 'pr':
        return checkUser('prEnabled') && checkCompany('prEnabled');
      case 'prWallet':
        return checkUser('prWalletEnabled') && checkCompany('prWalletEnabled');
      case 'prReservations':
        return checkUser('prReservationsEnabled') && checkCompany('prReservationsEnabled');
      case 'prPayouts':
        return checkUser('prPayoutsEnabled') && checkCompany('prPayoutsEnabled');
      case 'badges':
        return checkUser('badgesEnabled') && checkCompany('badgesEnabled');
      case 'cassaBiglietti':
      case 'ticketCashier':
        return checkUser('cassaBigliettiEnabled') && checkCompany('cassaBigliettiEnabled');
      case 'template':
        return checkUser('templateEnabled') && checkCompany('templateEnabled');
      case 'guestList':
      case 'guests':
        return checkUser('guestListEnabled');
      case 'tables':
        return checkUser('tablesEnabled');
      case 'pageEditor':
        return checkUser('pageEditorEnabled');
      case 'resale':
        return checkUser('resaleEnabled');
      case 'marketing':
        return checkUser('marketingEnabled');
      case 'accessControl':
        return checkUser('accessControlEnabled');
      case 'finance':
        return checkUser('financeEnabled');
      case 'eventFormats':
        return checkUser('eventFormatsEnabled') && checkCompany('eventFormatsEnabled');
      default:
        return true;
    }
  }, [userFeatures, companyFeatures, featuresLoaded]);

  return (
    <FeaturesContext.Provider value={{
      userFeatures,
      companyFeatures,
      isLoading,
      featuresLoaded,
      refreshFeatures: loadFeatures,
      isModuleEnabled,
    }}>
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures() {
  return useContext(FeaturesContext);
}
