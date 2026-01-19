import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

export default function EventShortLink() {
  const { t } = useTranslation();
  const { shortId } = useParams<{ shortId: string }>();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function resolveShortLink() {
      if (!shortId) {
        setError(t('events.shortLink.invalidLink'));
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/events/short/${shortId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(t('events.shortLink.eventNotFound'));
          } else {
            setError(t('events.shortLink.loadError'));
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        navigate(`/acquista/${data.id}`, { replace: true });
      } catch (err) {
        setError(t('events.shortLink.connectionError'));
        setLoading(false);
      }
    }

    resolveShortLink();
  }, [shortId, navigate, t]);

  if (!isMobile) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-event-short-link">
          <div className="container max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" data-testid="loading-spinner" />
                  <p className="text-muted-foreground" data-testid="text-loading">{t('events.shortLink.loading')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-event-short-link">
          <div className="container max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">{t('events.shortLink.oops')}</h1>
                  <p className="text-muted-foreground" data-testid="text-error-message">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" data-testid="page-event-short-link">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" data-testid="loading-spinner" />
          <p className="text-muted-foreground" data-testid="text-loading">{t('events.shortLink.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" data-testid="page-event-short-link">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">{t('events.shortLink.oops')}</h1>
          <p className="text-muted-foreground" data-testid="text-error-message">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}
