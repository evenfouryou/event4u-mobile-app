import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  User,
  Phone,
  Users,
  Table2,
} from "lucide-react";

interface EventTable {
  id: string;
  name: string;
  capacity: number;
  minSpend: number | null;
  isBooked: boolean;
}

interface TableBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  tables: EventTable[];
  onSuccess?: () => void;
}

const participantSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  phone: z.string().min(5, "Telefono richiesto"),
  gender: z.enum(["M", "F"], { required_error: "Genere richiesto" }),
});

const tableBookingSchema = z.object({
  tableId: z.string().min(1, "Seleziona un tavolo"),
  bookerFirstName: z.string().min(1, "Nome richiesto"),
  bookerLastName: z.string().min(1, "Cognome richiesto"),
  bookerPhone: z.string().min(5, "Telefono richiesto"),
  bookerEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  bookerGender: z.enum(["M", "F"], { required_error: "Genere richiesto" }),
  notes: z.string().optional(),
  participants: z.array(participantSchema).max(10, "Massimo 10 partecipanti aggiuntivi"),
});

type TableBookingFormData = z.infer<typeof tableBookingSchema>;

export function TableBookingDialog({
  open,
  onOpenChange,
  eventId,
  tables,
  onSuccess,
}: TableBookingDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  const form = useForm<TableBookingFormData>({
    resolver: zodResolver(tableBookingSchema),
    defaultValues: {
      tableId: "",
      bookerFirstName: "",
      bookerLastName: "",
      bookerPhone: "",
      bookerEmail: "",
      bookerGender: undefined,
      notes: "",
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const selectedTableId = form.watch("tableId");
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId),
    [tables, selectedTableId]
  );

  const availableTables = useMemo(
    () => tables.filter((t) => !t.isBooked),
    [tables]
  );

  const maxParticipants = selectedTable ? Math.min(selectedTable.capacity - 1, 10) : 10;
  const totalGuests = 1 + fields.length;

  const bookTableMutation = useMutation({
    mutationFn: async (data: TableBookingFormData) => {
      const response = await apiRequest("POST", `/api/pr/tables/${data.tableId}/book`, {
        customerName: `${data.bookerFirstName} ${data.bookerLastName}`,
        customerPhone: data.bookerPhone,
        customerEmail: data.bookerEmail,
        guestCount: totalGuests,
        notes: data.notes,
        booker: {
          firstName: data.bookerFirstName,
          lastName: data.bookerLastName,
          phone: data.bookerPhone,
          gender: data.bookerGender,
        },
        participants: data.participants,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione inviata",
        description: "La prenotazione è in attesa di approvazione dal gestore.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", eventId, "tables"] });
      form.reset();
      setStep(1);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la prenotazione",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setStep(1);
    onOpenChange(false);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await form.trigger([
        "tableId",
        "bookerFirstName",
        "bookerLastName",
        "bookerPhone",
        "bookerGender",
      ]);
      if (isValid) {
        setStep(2);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddParticipant = () => {
    if (fields.length < maxParticipants) {
      append({ firstName: "", lastName: "", phone: "", gender: "M" });
    }
  };

  const onSubmit = (data: TableBookingFormData) => {
    bookTableMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary" />
            Prenota Tavolo
          </DialogTitle>
          <DialogDescription>
            Step {step} di {totalSteps}:{" "}
            {step === 1 ? "Dati prenotazione" : "Partecipanti aggiuntivi"}
          </DialogDescription>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="tableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tavolo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-table-multistep">
                            <SelectValue placeholder="Seleziona tavolo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTables.map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              {table.name} ({table.capacity} posti)
                              {table.minSpend && ` - Min. ${table.minSpend}€`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dati Intestatario Prenotazione
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="bookerFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome"
                              {...field}
                              data-testid="input-booker-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bookerLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cognome *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Cognome"
                              {...field}
                              data-testid="input-booker-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="bookerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+39 333..."
                              {...field}
                              data-testid="input-booker-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bookerGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genere *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-booker-gender">
                                <SelectValue placeholder="Seleziona..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M">Maschio</SelectItem>
                              <SelectItem value="F">Femmina</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bookerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opzionale)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@esempio.com"
                            {...field}
                            data-testid="input-booker-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (opzionale)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Richieste speciali..."
                            {...field}
                            data-testid="input-booking-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Partecipanti Aggiuntivi
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTable?.name} - Capacità: {selectedTable?.capacity} persone
                    </p>
                  </div>
                  <Badge variant="outline">
                    {totalGuests}/{selectedTable?.capacity || "?"}
                  </Badge>
                </div>

                <Card className="p-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Intestatario:{" "}
                    <span className="font-medium text-foreground">
                      {form.getValues("bookerFirstName")} {form.getValues("bookerLastName")}
                    </span>
                  </p>
                </Card>

                {fields.length > 0 && (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-3 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-participant-${index}`}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>

                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <FormField
                            control={form.control}
                            name={`participants.${index}.firstName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Nome *"
                                    {...field}
                                    className="h-8 text-sm"
                                    data-testid={`input-participant-${index}-first-name`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`participants.${index}.lastName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Cognome *"
                                    {...field}
                                    className="h-8 text-sm"
                                    data-testid={`input-participant-${index}-last-name`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`participants.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Telefono *"
                                    {...field}
                                    className="h-8 text-sm"
                                    data-testid={`input-participant-${index}-phone`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`participants.${index}.gender`}
                            render={({ field }) => (
                              <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger
                                      className="h-8 text-sm"
                                      data-testid={`select-participant-${index}-gender`}
                                    >
                                      <SelectValue placeholder="Genere *" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="M">M</SelectItem>
                                    <SelectItem value="F">F</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {fields.length < maxParticipants && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddParticipant}
                    data-testid="button-add-participant"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Partecipante ({fields.length}/{maxParticipants})
                  </Button>
                )}

                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Puoi aggiungere fino a {maxParticipants} partecipanti aggiuntivi.
                    <br />
                    Questo step è opzionale.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Indietro
                </Button>
              )}
              {step < totalSteps ? (
                <Button type="button" onClick={handleNextStep} data-testid="button-next-step">
                  Avanti
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={bookTableMutation.isPending}
                  data-testid="button-submit-table-booking"
                >
                  {bookTableMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Prenotazione...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Invia Prenotazione
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
