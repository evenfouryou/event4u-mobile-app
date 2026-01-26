import { useState } from "react";
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
  Check,
  Loader2,
  Plus,
  Trash2,
  Users,
  ListChecks,
  User,
} from "lucide-react";

interface GuestList {
  id: string;
  name: string;
  listType: string;
  currentCount: number;
  maxCapacity: number | null;
}

interface GuestListBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  guestLists: GuestList[];
  onSuccess?: () => void;
}

const guestSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  phone: z.string().min(5, "Telefono richiesto"),
  gender: z.enum(["M", "F"], { required_error: "Genere richiesto" }),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  plusOnes: z.number().min(0).max(5).default(0),
});

const batchGuestSchema = z.object({
  listId: z.string().min(1, "Seleziona una lista"),
  guests: z.array(guestSchema).min(1, "Aggiungi almeno un ospite").max(10, "Massimo 10 ospiti per volta"),
});

type BatchGuestFormData = z.infer<typeof batchGuestSchema>;

export function GuestListBatchDialog({
  open,
  onOpenChange,
  eventId,
  guestLists,
  onSuccess,
}: GuestListBatchDialogProps) {
  const { toast } = useToast();

  const form = useForm<BatchGuestFormData>({
    resolver: zodResolver(batchGuestSchema),
    defaultValues: {
      listId: guestLists.length === 1 ? guestLists[0].id : "",
      guests: [{ firstName: "", lastName: "", phone: "", gender: "M", email: "", plusOnes: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "guests",
  });

  const selectedListId = form.watch("listId");
  const selectedList = guestLists.find((l) => l.id === selectedListId);
  const remainingCapacity = selectedList?.maxCapacity 
    ? selectedList.maxCapacity - selectedList.currentCount 
    : 10;
  const maxGuests = Math.min(10, remainingCapacity);

  const addGuestsBatchMutation = useMutation({
    mutationFn: async (data: BatchGuestFormData) => {
      const response = await apiRequest("POST", `/api/pr/guest-lists/${data.listId}/entries/batch`, {
        entries: data.guests.map(g => ({
          ...g,
          eventId,
        })),
      });
      return response.json();
    },
    onSuccess: (result) => {
      const count = result.created?.length || fields.length;
      toast({
        title: "Ospiti aggiunti!",
        description: `${count} ospiti aggiunti alla lista. QR code inviati.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", eventId, "guest-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/stats"] });
      form.reset({
        listId: guestLists.length === 1 ? guestLists[0].id : "",
        guests: [{ firstName: "", lastName: "", phone: "", gender: "M", email: "", plusOnes: 0 }],
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiunta degli ospiti",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset({
      listId: guestLists.length === 1 ? guestLists[0].id : "",
      guests: [{ firstName: "", lastName: "", phone: "", gender: "M", email: "", plusOnes: 0 }],
    });
    onOpenChange(false);
  };

  const handleAddGuest = () => {
    if (fields.length < maxGuests) {
      append({ firstName: "", lastName: "", phone: "", gender: "M", email: "", plusOnes: 0 });
    }
  };

  const onSubmit = (data: BatchGuestFormData) => {
    addGuestsBatchMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Aggiungi Ospiti alla Lista
          </DialogTitle>
          <DialogDescription>
            Aggiungi fino a 10 ospiti alla volta. Ogni ospite riceverà un QR code via SMS/Email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="listId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lista Ospiti *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-guest-list">
                        <SelectValue placeholder="Seleziona lista..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {guestLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.currentCount}
                          {list.maxCapacity && `/${list.maxCapacity}`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ospiti da Aggiungere
              </p>
              <Badge variant="outline">
                {fields.length}/{maxGuests}
              </Badge>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      Ospite {index + 1}
                    </Badge>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => remove(index)}
                        data-testid={`button-remove-guest-${index}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`guests.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Nome *"
                              {...field}
                              className="h-8 text-sm"
                              data-testid={`input-guest-${index}-first-name`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`guests.${index}.lastName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Cognome *"
                              {...field}
                              className="h-8 text-sm"
                              data-testid={`input-guest-${index}-last-name`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`guests.${index}.phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Telefono *"
                              {...field}
                              className="h-8 text-sm"
                              data-testid={`input-guest-${index}-phone`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`guests.${index}.gender`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger
                                className="h-8 text-sm"
                                data-testid={`select-guest-${index}-gender`}
                              >
                                <SelectValue placeholder="Genere *" />
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
                    <FormField
                      control={form.control}
                      name={`guests.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Email (opzionale)"
                              type="email"
                              {...field}
                              className="h-8 text-sm"
                              data-testid={`input-guest-${index}-email`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`guests.${index}.plusOnes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={5}
                              placeholder="+1 (0-5)"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="h-8 text-sm"
                              data-testid={`input-guest-${index}-plus-ones`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}
            </div>

            {fields.length < maxGuests && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAddGuest}
                data-testid="button-add-guest"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Ospite ({fields.length}/{maxGuests})
              </Button>
            )}

            {fields.length >= maxGuests && (
              <p className="text-sm text-muted-foreground text-center">
                Hai raggiunto il limite massimo di ospiti per questa operazione.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={addGuestsBatchMutation.isPending || fields.length === 0}
                data-testid="button-submit-guests-batch"
              >
                {addGuestsBatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aggiunta...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Aggiungi {fields.length} Ospite{fields.length !== 1 ? "i" : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
