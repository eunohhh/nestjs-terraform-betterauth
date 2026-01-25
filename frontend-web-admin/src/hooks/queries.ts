import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { api } from "@/lib/apis/api-client";

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
