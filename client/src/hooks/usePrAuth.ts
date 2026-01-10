import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface PrProfile {
  id: string;
  companyId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  displayName?: string | null;
  prCode: string;
  commissionType: string;
  commissionValue: string;
  defaultListCommission?: string | null;
  defaultTableCommission?: string | null;
  status: string;
  isStaff?: boolean;
  assignedEvents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PrCompanyProfile {
  id: string;
  companyId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  prCode: string;
  displayName?: string | null;
  userId?: string | null;
  isCurrent: boolean;
}

export interface PrMyCompaniesResponse {
  currentProfileId: string;
  profiles: PrCompanyProfile[];
}

export function usePrAuth() {
  const { data: prProfile, isLoading, error } = useQuery<PrProfile>({
    queryKey: ["/api/pr/me"],
    retry: false,
  });

  const { data: myCompanies, isLoading: isLoadingCompanies } = useQuery<PrMyCompaniesResponse>({
    queryKey: ["/api/pr/my-companies"],
    enabled: !!prProfile,
    retry: false,
  });

  const switchCompanyMutation = useMutation({
    mutationFn: async (prProfileId: string) => {
      const response = await apiRequest("POST", "/api/pr/switch-company", { prProfileId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/my-companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pr/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
      window.location.href = "/login";
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; displayName?: string }) => {
      const response = await apiRequest("PATCH", "/api/pr/me", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/pr/change-password", data);
      return response.json();
    },
  });

  return {
    prProfile,
    isLoading,
    isAuthenticated: !!prProfile && !error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    myCompanies,
    isLoadingCompanies,
    hasMultipleCompanies: (myCompanies?.profiles?.length ?? 0) > 1,
    switchCompany: switchCompanyMutation.mutate,
    isSwitchingCompany: switchCompanyMutation.isPending,
  };
}
