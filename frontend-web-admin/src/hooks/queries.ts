import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { api, UpdateBookingDto, UpdateCareDto, UpdateClientDto } from "@/lib/apis/api-client";

export function useSittingClients() {
  return useQuery({
    queryKey: QUERY_KEYS.SITTING.CLIENTS,
    queryFn: api.sitting.getClients,
  });
}

export function useSittingBookings(clientId?: string, status?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SITTING.BOOKINGS(clientId, status),
    queryFn: () => api.sitting.getBookings({ clientId, status }),
  });
}

export function useSittingCaresForCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["sitting", "calendar", { from, to }],
    queryFn: () => api.sitting.getCaresForCalendar({ from, to }),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, dto }: { clientId: string; dto: UpdateClientDto }) =>
      api.sitting.updateClient(clientId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SITTING.CLIENTS });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, dto }: { bookingId: string; dto: UpdateBookingDto }) =>
      api.sitting.updateBooking(bookingId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sitting", "bookings"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      api.sitting.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sitting", "bookings"] });
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      api.sitting.updatePaymentStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sitting", "bookings"] });
    },
  });
}

export function useUpdateCare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ careId, dto }: { careId: string; dto: UpdateCareDto }) =>
      api.sitting.updateCare(careId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sitting", "calendar"] });
    },
  });
}
