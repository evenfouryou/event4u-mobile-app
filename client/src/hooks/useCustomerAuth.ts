import { useQuery } from "@tanstack/react-query";

interface CustomerProfile {
  id: number;
  userId: number | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  _isUserWithoutSiaeProfile?: boolean;
}

export function useCustomerAuth() {
  const { data: customer, isLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    customer,
    isLoading,
    isAuthenticated: !!customer,
  };
}
