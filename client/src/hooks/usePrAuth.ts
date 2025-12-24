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
  assignedEvents?: string[];
  createdAt: string;
  updatedAt: string;
}

export function usePrAuth() {
  const { data: prProfile, isLoading, error } = useQuery<PrProfile>({
    queryKey: ["/api/pr/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pr/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
      window.location.href = "/pr/login";
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
  };
}
