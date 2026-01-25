import { axiosInstance } from "../api/axios";

// Types (You might want to share these from backend or define properly)
export interface SittingClient {
  id: string;
  name: string;
  // ... add other fields as needed
}

export interface SittingBooking {
  id: string;
  status: string;
  // ...
}

export const api = {
  auth: {
    // Exchange Better Auth Session for App JWT
    getAdminToken: async () => {
      const response = await axiosInstance.post<{
        accessToken: string;
        user: any;
      }>("/auth/app/admin/token");
      return response.data;
    },
  },
  sitting: {
    getClients: async () => {
      const response = await axiosInstance.get<SittingClient[]>("/sitting/clients");
      return response.data;
    },
    getBookings: async (params?: { clientId?: string; status?: string }) => {
      const response = await axiosInstance.get<SittingBooking[]>("/sitting/bookings", {
        params,
      });
      return response.data;
    },
    getCaresForCalendar: async (params: { from: string; to: string }) => {
      const response = await axiosInstance.get<any[]>("/sitting/calendar/cares", {
        params,
      });
      return response.data;
    },
    // Add more methods as requested/needed
  },
};
