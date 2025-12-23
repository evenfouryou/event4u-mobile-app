import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Users,
  Ticket,
  Armchair,
  Clock,
  User,
  Filter,
  Eye,
} from "lucide-react";

interface CheckedInPerson {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  type: 'list' | 'table' | 'ticket';
  checkedInAt: string;
  listName?: string;
  tableName?: string;
  ticketType?: string;
  sector?: string;
}

interface Event {
  id: string;
  name: string;
  startDatetime: string;
}

export default function ScannerScannedPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'list' | 'table' | 'ticket'>('all');
  const [selectedPerson, setSelectedPerson] = useState<CheckedInPerson | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: event } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: checkedInPeople, isLoading } = useQuery<CheckedInPerson[]>({
    queryKey: ['/api/e4u/events', eventId, 'checked-in'],
    enabled: !!eventId,
  });

  const filteredPeople = checkedInPeople?.filter(person => {
    const matchesSearch = searchQuery.trim() === '' || 
      `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.phone?.includes(searchQuery);
    
    const matchesFilter = activeFilter === 'all' || person.type === activeFilter;
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => 
    new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
  ) || [];

  const listCount = checkedInPeople?.filter(p => p.type === 'list').length || 0;
  const tableCount = checkedInPeople?.filter(p => p.type === 'table').length || 0;
  const ticketCount = checkedInPeople?.filter(p => p.type === 'ticket').length || 0;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'list':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30"><Users className="h-3 w-3 mr-1" /> Lista</Badge>;
      case 'table':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Armchair className="h-3 w-3 mr-1" /> Tavolo</Badge>;
      case 'ticket':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Ticket className="h-3 w-3 mr-1" /> Biglietto</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-scanner-scanned">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/scanner/stats/${eventId}`}>
              <Button variant="outline" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                Utenti Scansionati
              </h1>
              {event && (
                <p className="text-muted-foreground">{event.name}</p>
              )}
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xl px-4 py-2">
            {checkedInPeople?.length || 0} totali
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{checkedInPeople?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-400">{listCount}</div>
              <p className="text-sm text-muted-foreground">Liste</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-400">{tableCount}</div>
              <p className="text-sm text-muted-foreground">Tavoli</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-400">{ticketCount}</div>
              <p className="text-sm text-muted-foreground">Biglietti</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Elenco Check-in</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome o telefono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[300px]"
                    data-testid="input-search"
                  />
                </div>
                <Select value={activeFilter} onValueChange={(val) => setActiveFilter(val as typeof activeFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filtra tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                    <SelectItem value="table">Tavoli</SelectItem>
                    <SelectItem value="ticket">Biglietti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredPeople.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dettaglio</TableHead>
                    <TableHead>Ora Check-in</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeople.map((person, index) => (
                    <TableRow key={person.id || index} data-testid={`row-person-${index}`}>
                      <TableCell className="font-medium">
                        {person.firstName} {person.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {person.phone || "-"}
                      </TableCell>
                      <TableCell>{getTypeBadge(person.type)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {person.listName || person.tableName || person.ticketType || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {format(parseISO(person.checkedInAt), "HH:mm", { locale: it })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPerson(person);
                            setIsDetailDialogOpen(true);
                          }}
                          data-testid={`button-view-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground">
                  {searchQuery || activeFilter !== 'all'
                    ? "Nessun risultato trovato"
                    : "Nessun utente scansionato"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dettaglio Check-in</DialogTitle>
              <DialogDescription>
                Informazioni sul check-in dell'utente
              </DialogDescription>
            </DialogHeader>
            {selectedPerson && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    selectedPerson.type === 'list' 
                      ? 'bg-purple-500/20' 
                      : selectedPerson.type === 'table' 
                        ? 'bg-amber-500/20'
                        : 'bg-blue-500/20'
                  }`}>
                    <User className={`h-8 w-8 ${
                      selectedPerson.type === 'list' 
                        ? 'text-purple-400' 
                        : selectedPerson.type === 'table' 
                          ? 'text-amber-400'
                          : 'text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">
                      {selectedPerson.firstName} {selectedPerson.lastName}
                    </p>
                    {selectedPerson.phone && (
                      <p className="text-muted-foreground">{selectedPerson.phone}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <div className="mt-1">{getTypeBadge(selectedPerson.type)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ora Check-in</p>
                    <p className="font-medium flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(selectedPerson.checkedInAt), "HH:mm:ss", { locale: it })}
                    </p>
                  </div>
                  {(selectedPerson.listName || selectedPerson.tableName || selectedPerson.ticketType) && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedPerson.type === 'list' ? 'Lista' : selectedPerson.type === 'table' ? 'Tavolo' : 'Tipo Biglietto'}
                      </p>
                      <p className="font-medium mt-1">
                        {selectedPerson.listName || selectedPerson.tableName || selectedPerson.ticketType}
                      </p>
                    </div>
                  )}
                  {selectedPerson.sector && (
                    <div>
                      <p className="text-sm text-muted-foreground">Settore</p>
                      <p className="font-medium mt-1">{selectedPerson.sector}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 p-4">
          <Link href={`/scanner/stats/${eventId}`}>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-title">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Utenti Scansionati
            </h1>
            {event && (
              <p className="text-xs text-muted-foreground truncate">
                {event.name}
              </p>
            )}
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-lg px-3 py-1">
            {checkedInPeople?.length || 0}
          </Badge>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 rounded-xl bg-muted/30 border-white/10"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="shrink-0 rounded-full"
              data-testid="filter-all"
            >
              Tutti ({checkedInPeople?.length || 0})
            </Button>
            <Button
              variant={activeFilter === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('list')}
              className="shrink-0 rounded-full border-purple-500/30"
              data-testid="filter-lists"
            >
              <Users className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              Liste ({listCount})
            </Button>
            <Button
              variant={activeFilter === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('table')}
              className="shrink-0 rounded-full border-amber-500/30"
              data-testid="filter-tables"
            >
              <Armchair className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              Tavoli ({tableCount})
            </Button>
            <Button
              variant={activeFilter === 'ticket' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('ticket')}
              className="shrink-0 rounded-full border-blue-500/30"
              data-testid="filter-tickets"
            >
              <Ticket className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              Biglietti ({ticketCount})
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="border-0 bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPeople.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2 pr-2">
              {filteredPeople.map((person, index) => (
                <motion.div
                  key={person.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="border-0 bg-muted/30" data-testid={`card-person-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          person.type === 'list' 
                            ? 'bg-purple-500/20' 
                            : person.type === 'table' 
                              ? 'bg-amber-500/20'
                              : 'bg-blue-500/20'
                        }`}>
                          <User className={`h-6 w-6 ${
                            person.type === 'list' 
                              ? 'text-purple-400' 
                              : person.type === 'table' 
                                ? 'text-amber-400'
                                : 'text-blue-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" data-testid="text-person-name">
                            {person.firstName} {person.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                              person.type === 'list' 
                                ? 'border-purple-500/30 text-purple-400' 
                                : person.type === 'table' 
                                  ? 'border-amber-500/30 text-amber-400'
                                  : 'border-blue-500/30 text-blue-400'
                            }`}>
                              {person.type === 'list' && <><Users className="h-3 w-3 mr-1" /> Lista</>}
                              {person.type === 'table' && <><Armchair className="h-3 w-3 mr-1" /> Tavolo</>}
                              {person.type === 'ticket' && <><Ticket className="h-3 w-3 mr-1" /> Biglietto</>}
                            </Badge>
                            {person.listName && (
                              <span className="truncate">{person.listName}</span>
                            )}
                            {person.tableName && (
                              <span className="truncate">{person.tableName}</span>
                            )}
                            {person.ticketType && (
                              <span className="truncate">{person.ticketType}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(person.checkedInAt), "HH:mm", { locale: it })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="border-0 bg-muted/30">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground">
                {searchQuery || activeFilter !== 'all'
                  ? "Nessun risultato trovato"
                  : "Nessun utente scansionato"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
