import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface CustomerProfile {
  id: number;
  userId: number | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  birthDate: string | null;
  city: string | null;
  province: string | null;
  _isUserWithoutSiaeProfile?: boolean;
}

export function useCustomerAuth() {
  const { data: customer, isLoading } = useQuery<CustomerProfile | null>({
    queryKey: ["/api/public/customers/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    customer,
    isLoading,
    isAuthenticated: !!customer,
  };
}
