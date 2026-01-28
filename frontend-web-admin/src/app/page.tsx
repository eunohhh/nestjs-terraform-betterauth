'use client';

import {
  addMonths,
  endOfMonth,
  format,
  setMonth,
  setYear,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EditBookingDialog, EditCareDialog, EditClientDialog } from '@/components/sitting';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSittingBookings, useSittingCaresForCalendar, useSittingClients } from '@/hooks/queries';
import { SittingBooking, SittingCare, SittingClient } from '@/lib/apis/api-client';
import { authClient } from '@/lib/auth-client';
import { bookingColumns, careColumns, clientColumns } from '../components/sitting/columns';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dialog states
  const [selectedClient, setSelectedClient] = useState<SittingClient | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SittingBooking | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedCare, setSelectedCare] = useState<SittingCare | null>(null);
  const [careDialogOpen, setCareDialogOpen] = useState(false);

  // Queries
  const { data: clients, isLoading: clientsLoading } = useSittingClients();
  const { data: bookings, isLoading: bookingsLoading } = useSittingBookings();

  // Derived state for cares query
  const from = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  const { data: cares, isLoading: caresLoading } = useSittingCaresForCalendar(from, to);

  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const handleYearChange = (year: string) => {
    setCurrentDate((prev) => setYear(prev, parseInt(year, 10)));
  };

  const handleMonthChange = (month: string) => {
    setCurrentDate((prev) => setMonth(prev, parseInt(month, 10) - 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Generate year options (current year +/- 5)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        router.push('/login');
      } else {
        if (session.user.role !== 'admin') {
          // Access denied handling if needed
        }
        setIsAuthorized(true);
      }
    }
  }, [session, isPending, router]);

  const handleLogout = async () => {
    await authClient.signOut();
    localStorage.removeItem('app_access_token');
    router.push('/login');
  };

  // Row click handlers
  const handleClientClick = (client: SittingClient) => {
    setSelectedClient(client);
    setClientDialogOpen(true);
  };

  const handleBookingClick = (booking: SittingBooking) => {
    setSelectedBooking(booking);
    setBookingDialogOpen(true);
  };

  const handleCareClick = (care: SittingCare) => {
    setSelectedCare(care);
    setCareDialogOpen(true);
  };

  if (isPending || !isAuthorized) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Family Infra Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>
            {session?.user?.name} ({session?.user?.role})
          </span>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="cares">Cares</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <div className="rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-4">Clients</h2>
            <p className="text-sm text-muted-foreground mb-4">Click on a row to edit</p>
            {clientsLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columns={clientColumns}
                data={clients || []}
                onRowClick={handleClientClick}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-4">Bookings</h2>
            <p className="text-sm text-muted-foreground mb-4">Click on a row to edit</p>
            {bookingsLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columns={bookingColumns}
                data={bookings || []}
                onRowClick={handleBookingClick}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="cares">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Cares</h2>
                <p className="text-sm text-muted-foreground">Click on a row to edit</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {month}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {caresLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable columns={careColumns} data={cares || []} onRowClick={handleCareClick} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      <EditClientDialog
        client={selectedClient}
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
      />
      <EditBookingDialog
        booking={selectedBooking}
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
      <EditCareDialog care={selectedCare} open={careDialogOpen} onOpenChange={setCareDialogOpen} />
    </div>
  );
}
