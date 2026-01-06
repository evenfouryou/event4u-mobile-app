import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Ticket, Users, Wine, Sparkles, Tag, Check } from "lucide-react";
import type { ProductBundle, ProductBundleItem } from "@shared/schema";

interface BundleSelectorProps {
  eventId: string;
  onSelect?: (bundleId: string, quantity: number, groupSize?: number) => void;
}

type BundleWithItems = ProductBundle & { items?: ProductBundleItem[] };

export function BundleSelector({ eventId, onSelect }: BundleSelectorProps) {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState<Record<string, number>>({});

  const { data: bundles = [], isLoading } = useQuery<BundleWithItems[]>({
    queryKey: ["/api/public/events", eventId, "bundles"],
    queryFn: async () => {
      const res = await fetch(`/api/public/events/${eventId}/bundles`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-32 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (bundles.length === 0) {
    return null;
  }

  const getBundleIcon = (type: string) => {
    switch (type) {
      case "ticket_drink":
        return <Wine className="h-5 w-5" />;
      case "group_discount":
        return <Users className="h-5 w-5" />;
      case "vip_table":
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getBundleLabel = (type: string) => {
    switch (type) {
      case "ticket_drink":
        return "Offerta Speciale";
      case "group_discount":
        return "Sconto Gruppo";
      case "vip_table":
        return "VIP Experience";
      default:
        return "Bundle";
    }
  };

  const getBundleBadgeClass = (type: string) => {
    switch (type) {
      case "ticket_drink":
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "group_discount":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "vip_table":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      default:
        return "";
    }
  };

  const calculatePrice = (bundle: BundleWithItems) => {
    if (bundle.type === "group_discount") {
      const size = groupSize[bundle.id] || bundle.minGroupSize || 1;
      return parseFloat(bundle.basePrice) * size;
    }
    return parseFloat(bundle.basePrice);
  };

  const calculateSavings = (bundle: BundleWithItems) => {
    if (!bundle.originalPrice) return 0;
    const original = parseFloat(bundle.originalPrice);
    const current = parseFloat(bundle.basePrice);
    if (bundle.type === "group_discount") {
      const size = groupSize[bundle.id] || bundle.minGroupSize || 1;
      return (original - current) * size;
    }
    return original - current;
  };

  const handleSelect = (bundle: BundleWithItems) => {
    setSelectedBundle(bundle.id);
    if (onSelect) {
      const size = bundle.type === "group_discount" ? (groupSize[bundle.id] || bundle.minGroupSize || 1) : undefined;
      onSelect(bundle.id, 1, size);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Offerte Speciali</h3>
      </div>

      <div className="grid gap-4">
        {bundles.map((bundle) => {
          const savings = calculateSavings(bundle);
          const totalPrice = calculatePrice(bundle);
          const isSelected = selectedBundle === bundle.id;
          const currentGroupSize = groupSize[bundle.id] || bundle.minGroupSize || 1;

          return (
            <Card
              key={bundle.id}
              className={`transition-all cursor-pointer hover-elevate ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleSelect(bundle)}
              data-testid={`bundle-card-${bundle.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getBundleIcon(bundle.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bundle.name}</CardTitle>
                      <Badge className={getBundleBadgeClass(bundle.type)} variant="outline">
                        {getBundleLabel(bundle.type)}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="p-1 bg-primary rounded-full">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bundle.description && (
                  <p className="text-sm text-muted-foreground">{bundle.description}</p>
                )}

                {bundle.items && bundle.items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {bundle.items.map((item) => (
                      <Badge key={item.id} variant="secondary" className="text-xs">
                        {item.itemType === "ticket" && <Ticket className="h-3 w-3 mr-1" />}
                        {item.itemType === "drink" && <Wine className="h-3 w-3 mr-1" />}
                        {item.quantity > 1 && `${item.quantity}x `}
                        {item.itemName}
                      </Badge>
                    ))}
                  </div>
                )}

                {bundle.type === "group_discount" && (
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm">Persone:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const newSize = Math.max(bundle.minGroupSize || 1, currentGroupSize - 1);
                          setGroupSize({ ...groupSize, [bundle.id]: newSize });
                        }}
                        disabled={currentGroupSize <= (bundle.minGroupSize || 1)}
                        data-testid={`button-decrease-group-${bundle.id}`}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        className="w-16 text-center h-8"
                        value={currentGroupSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= (bundle.minGroupSize || 1) && (!bundle.maxGroupSize || val <= bundle.maxGroupSize)) {
                            setGroupSize({ ...groupSize, [bundle.id]: val });
                          }
                        }}
                        min={bundle.minGroupSize || 1}
                        max={bundle.maxGroupSize || undefined}
                        data-testid={`input-group-size-${bundle.id}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const newSize = bundle.maxGroupSize 
                            ? Math.min(bundle.maxGroupSize, currentGroupSize + 1)
                            : currentGroupSize + 1;
                          setGroupSize({ ...groupSize, [bundle.id]: newSize });
                        }}
                        disabled={bundle.maxGroupSize ? currentGroupSize >= bundle.maxGroupSize : false}
                        data-testid={`button-increase-group-${bundle.id}`}
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      (min {bundle.minGroupSize || 1}{bundle.maxGroupSize ? `, max ${bundle.maxGroupSize}` : ""})
                    </span>
                  </div>
                )}

                <div className="flex items-end justify-between pt-2 border-t">
                  <div>
                    {bundle.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        €{(bundle.type === "group_discount" 
                          ? parseFloat(bundle.originalPrice) * currentGroupSize 
                          : parseFloat(bundle.originalPrice)
                        ).toFixed(2)}
                      </span>
                    )}
                    <span className="text-2xl font-bold text-primary">
                      €{totalPrice.toFixed(2)}
                    </span>
                    {bundle.type === "group_discount" && (
                      <span className="text-sm text-muted-foreground ml-1">
                        (€{parseFloat(bundle.basePrice).toFixed(2)}/persona)
                      </span>
                    )}
                  </div>
                  {savings > 0 && (
                    <Badge variant="destructive" className="bg-green-500">
                      Risparmi €{savings.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
