import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

interface AddressComponents {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value?: string;
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("Google Maps API key not found");
    return Promise.reject(new Error("API key not found"));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    window.initGoogleMaps = () => resolve();
    
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function parseAddressComponents(place: any): AddressComponents {
  const components: AddressComponents = {
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    formattedAddress: place.formatted_address || "",
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
  };

  let streetNumber = "";
  let route = "";

  for (const component of place.address_components || []) {
    const types = component.types;
    
    if (types.includes("street_number")) {
      streetNumber = component.long_name;
    } else if (types.includes("route")) {
      route = component.long_name;
    } else if (types.includes("locality") || types.includes("administrative_area_level_3")) {
      components.city = component.long_name;
    } else if (types.includes("administrative_area_level_2")) {
      components.province = component.short_name;
    } else if (types.includes("postal_code")) {
      components.postalCode = component.long_name;
    } else if (types.includes("country")) {
      components.country = component.short_name;
    }
  }

  components.street = route + (streetNumber ? `, ${streetNumber}` : "");

  return components;
}

export function AddressAutocomplete({
  value = "",
  onAddressSelect,
  placeholder = "Inserisci indirizzo",
  className,
  disabled,
  "data-testid": testId,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const initAutocomplete = useCallback(async () => {
    if (!inputRef.current || autocompleteRef.current) return;

    setIsLoading(true);
    try {
      await loadGoogleMaps();
      
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: "it" },
          fields: ["address_components", "formatted_address", "geometry"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (place.address_components) {
          const addressData = parseAddressComponents(place);
          setInputValue(addressData.formattedAddress);
          onAddressSelect(addressData);
        }
      });

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize autocomplete:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onAddressSelect]);

  useEffect(() => {
    initAutocomplete();
    
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [initAutocomplete]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pl-10 pr-10"
          data-testid={testId}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {!isInitialized && !isLoading && (
        <p className="text-xs text-muted-foreground mt-1">
          Google Maps non disponibile
        </p>
      )}
    </div>
  );
}

export type { AddressComponents };
