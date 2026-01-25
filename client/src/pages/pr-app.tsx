import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePrAuth } from "@/hooks/usePrAuth";
import { Loader2 } from "lucide-react";

/**
 * Legacy PR App - Redirects to new unified PR interface
 * The old /pr-app is now replaced by /pr/my-events which leads to
 * the unified event dashboard at /pr/events/:id
 */
export default function PrAppPage() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = usePrAuth();

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        setLocation("/pr/my-events");
      } else {
        setLocation("/login");
      }
    }
  }, [authLoading, isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Reindirizzamento...</p>
      </div>
    </div>
  );
}
