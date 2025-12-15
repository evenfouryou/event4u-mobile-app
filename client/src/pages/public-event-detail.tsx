import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Ticket,
  ChevronLeft,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  Check,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Seat {
  id: string;
  row: string;
  seatNumber: string;
  status: string;
}

interface Sector {
  id: string;
  name: string;
  capacity: number;
  availableSeats: number;
  priceIntero: string;
  priceRidotto: string | null;
  isNumbered: boolean;
  sectorCode: string;
  seats: Seat[];
}

interface EventDetail {
  id: string;
  eventId: number;
  siaeEventCode: string;
  totalCapacity: number;
  ticketsSold: number;
  ticketingStatus: string;
  saleStartDate: Date;
  saleEndDate: Date;
  maxTicketsPerUser: number;
  requiresNominative: boolean;
  allowsChangeName: boolean;
  eventName: string;
  eventDescription: string | null;
  eventImageUrl: string | null;
  eventStart: Date;
  eventEnd: Date;
  eventNotes: string | null;
  locationId: number;
  locationName: string;
  locationAddress: string;
  locationCapacity: number;
  sectors: Sector[];
}

function SectorCard({
  sector,
  ticketedEventId,
  requiresNominative,
  onAddToCart,
}: {
  sector: Sector;
  ticketedEventId: string;
  requiresNominative: boolean;
  onAddToCart: (data: any) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [ticketType, setTicketType] = useState("intero");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const price = ticketType === "ridotto" && sector.priceRidotto
    ? Number(sector.priceRidotto)
    : Number(sector.priceIntero);

  const totalPrice = price * (sector.isNumbered ? 1 : quantity);
  const isAvailable = sector.availableSeats > 0;

  const handleAdd = () => {
    if (!isAvailable) return;

    if (sector.isNumbered && !selectedSeat) {
      return;
    }

    if (requiresNominative && (!firstName || !lastName)) {
      return;
    }

    onAddToCart({
      ticketedEventId,
      sectorId: sector.id,
      seatId: selectedSeat?.id,
      quantity: sector.isNumbered ? 1 : quantity,
      ticketType,
      participantFirstName: firstName,
      participantLastName: lastName,
    });
  };

  return (
    <Card className="bg-[#151922] border-white/10 overflow-hidden" data-testid={`card-sector-${sector.id}`}>
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-white" data-testid={`text-sector-name-${sector.id}`}>
              {sector.name}
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Codice: {sector.sectorCode}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-400" data-testid={`text-sector-price-${sector.id}`}>
              €{price.toFixed(2)}
            </div>
            {sector.priceRidotto && (
              <p className="text-xs text-slate-500">Ridotto: €{Number(sector.priceRidotto).toFixed(2)}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Disponibilità</span>
          <Badge
            variant={isAvailable ? "default" : "destructive"}
            className={isAvailable ? "bg-teal-500/20 text-teal-400 border-teal-500/30" : ""}
            data-testid={`badge-availability-${sector.id}`}
          >
            {isAvailable ? `${sector.availableSeats} posti` : "Esaurito"}
          </Badge>
        </div>

        {isAvailable && (
          <>
            {sector.priceRidotto && (
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Tipo Biglietto</Label>
                <RadioGroup value={ticketType} onValueChange={setTicketType} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intero" id={`intero-${sector.id}`} className="border-white/20" />
                    <Label htmlFor={`intero-${sector.id}`} className="text-white cursor-pointer">
                      Intero - €{Number(sector.priceIntero).toFixed(2)}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ridotto" id={`ridotto-${sector.id}`} className="border-white/20" />
                    <Label htmlFor={`ridotto-${sector.id}`} className="text-white cursor-pointer">
                      Ridotto - €{Number(sector.priceRidotto).toFixed(2)}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {sector.isNumbered ? (
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Seleziona Posto</Label>
                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-black/20 rounded-lg">
                  {sector.seats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => setSelectedSeat(seat)}
                      disabled={seat.status !== "available"}
                      className={`p-2 text-xs rounded-md transition-all ${
                        seat.status !== "available"
                          ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                          : selectedSeat?.id === seat.id
                          ? "bg-yellow-500 text-black"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                      data-testid={`seat-${seat.id}`}
                    >
                      {seat.row}{seat.seatNumber}
                    </button>
                  ))}
                </div>
                {selectedSeat && (
                  <p className="text-sm text-teal-400">
                    Posto selezionato: Fila {selectedSeat.row}, Posto {selectedSeat.seatNumber}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Quantità</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="border-white/20 text-white"
                    data-testid={`button-minus-${sector.id}`}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-xl font-bold text-white w-12 text-center" data-testid={`text-quantity-${sector.id}`}>
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(sector.availableSeats, quantity + 1))}
                    className="border-white/20 text-white"
                    data-testid={`button-plus-${sector.id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {requiresNominative && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm text-slate-400">Nome</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Mario"
                    className="bg-white/5 border-white/10 text-white"
                    data-testid={`input-firstname-${sector.id}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-slate-400">Cognome</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Rossi"
                    className="bg-white/5 border-white/10 text-white"
                    data-testid={`input-lastname-${sector.id}`}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div>
                <p className="text-sm text-slate-400">Totale</p>
                <p className="text-xl font-bold text-yellow-400" data-testid={`text-total-${sector.id}`}>
                  €{totalPrice.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={handleAdd}
                disabled={
                  (sector.isNumbered && !selectedSeat) ||
                  (requiresNominative && (!firstName || !lastName))
                }
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                data-testid={`button-add-${sector.id}`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Aggiungi
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: event, isLoading, error } = useQuery<EventDetail>({
    queryKey: ["/api/public/events", params.id],
  });

  const handleAddToCart = async (data: any) => {
    try {
      await apiRequest("POST", "/api/public/cart/add", data);
      toast({
        title: "Aggiunto al carrello",
        description: "Il biglietto è stato aggiunto al carrello.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere al carrello.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <Card className="p-8 text-center bg-red-500/10 border-red-500/20 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400">Evento non trovato o non disponibile.</p>
          <Link href="/acquista">
            <Button variant="outline" className="mt-4 border-white/20 text-white">
              <ChevronLeft className="w-4 h-4 mr-1" /> Torna agli eventi
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e17]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/acquista">
              <Button variant="ghost" className="text-white hover:bg-white/10" data-testid="button-back">
                <ChevronLeft className="w-4 h-4 mr-1" /> Eventi
              </Button>
            </Link>
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
                <span className="text-lg font-bold text-white">Event4U</span>
              </div>
            </Link>
            <Link href="/carrello">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" data-testid="button-cart">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Carrello
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-8 w-2/3" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        ) : event ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-pink-900/30">
              {event.eventImageUrl && (
                <img
                  src={event.eventImageUrl}
                  alt={event.eventName}
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                  data-testid="img-event-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent" />
              <CardContent className="relative p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <Badge className="mb-4 bg-teal-500/20 text-teal-400 border-teal-500/30">
                      {event.ticketingStatus === "active" ? "In Vendita" : event.ticketingStatus}
                    </Badge>
                    <h1
                      className="text-3xl md:text-4xl font-bold text-white mb-4"
                      data-testid="text-event-name"
                    >
                      {event.eventName}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teal-400" />
                        <span data-testid="text-event-date">
                          {format(new Date(event.eventStart), "EEEE d MMMM yyyy", { locale: it })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-teal-400" />
                        <span data-testid="text-event-time">
                          {format(new Date(event.eventStart), "HH:mm")} - {format(new Date(event.eventEnd), "HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-slate-300">
                      <MapPin className="w-5 h-5 text-teal-400" />
                      <span data-testid="text-event-location">
                        {event.locationName} - {event.locationAddress}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400 mb-1">Biglietti disponibili</p>
                    <p className="text-3xl font-bold text-yellow-400" data-testid="text-available-tickets">
                      {event.totalCapacity - event.ticketsSold}
                    </p>
                    <p className="text-sm text-slate-500">
                      su {event.totalCapacity} totali
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {event.eventDescription && (
              <Card className="bg-[#151922] border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Descrizione</h3>
                <p className="text-slate-400 whitespace-pre-line" data-testid="text-event-description">{event.eventDescription}</p>
              </Card>
            )}

            {event.requiresNominative && (
              <Card className="bg-yellow-500/10 border-yellow-500/20 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-400">Biglietti Nominativi</h4>
                  <p className="text-sm text-yellow-300/80">
                    Questo evento richiede biglietti nominativi. Inserisci nome e cognome per ogni partecipante.
                    {event.allowsChangeName && " Il cambio nominativo è consentito."}
                  </p>
                </div>
              </Card>
            )}

            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Scegli il tuo settore</h2>
              <div className="grid md:grid-cols-2 gap-6" data-testid="grid-sectors">
                {event.sectors.map((sector) => (
                  <SectorCard
                    key={sector.id}
                    sector={sector}
                    ticketedEventId={event.id}
                    requiresNominative={event.requiresNominative}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </div>

            {event.sectors.length === 0 && (
              <Card className="p-12 text-center bg-white/5 border-white/10">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-semibold text-white mb-2">Nessun settore disponibile</h3>
                <p className="text-slate-400">
                  I biglietti per questo evento non sono ancora disponibili.
                </p>
              </Card>
            )}
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}
