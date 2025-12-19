import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AccountLayout } from "@/components/account-layout";
import AccountHome from "@/pages/account-home";
import AccountProfile from "@/pages/account-profile";
import AccountTickets from "@/pages/account-tickets";
import AccountTicketDetail from "@/pages/account-ticket-detail";
import AccountNameChange from "@/pages/account-name-change";
import AccountWallet from "@/pages/account-wallet";
import AccountResales from "@/pages/account-resales";
import { Loader2 } from "lucide-react";

export default function AccountPage() {
  const [location, navigate] = useLocation();

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (isError || !customer)) {
      navigate("/login?redirect=" + encodeURIComponent(location));
    }
  }, [isLoading, isError, customer, navigate, location]);

  useEffect(() => {
    if (location === "/account" || location === "/account/") {
      navigate("/account/home");
    }
  }, [location, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return null;
  }

  return (
    <AccountLayout>
      <Switch>
        <Route path="/account/home" component={AccountHome} />
        <Route path="/account/profile" component={AccountProfile} />
        <Route path="/account/tickets/:id/name-change" component={AccountNameChange} />
        <Route path="/account/tickets/:id" component={AccountTicketDetail} />
        <Route path="/account/tickets" component={AccountTickets} />
        <Route path="/account/wallet" component={AccountWallet} />
        <Route path="/account/resales" component={AccountResales} />
      </Switch>
    </AccountLayout>
  );
}
