'use client';

import { ColumnDef } from '@tanstack/react-table';
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
import { authClient } from '@/lib/auth-client';

// Columns Definitions
const clientColumns: ColumnDef<any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'clientName', header: 'Name' },
  { accessorKey: 'catName', header: 'Cat' },
  { accessorKey: 'address', header: 'Address' },
  { accessorKey: 'entryNote', header: 'Entry Note' },
  { accessorKey: 'requirements', header: 'Requirements' },
];

const bookingColumns: ColumnDef<any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'bookingStatus', header: 'Status' },
  { accessorKey: 'paymentStatus', header: 'Payment' },
  { accessorKey: 'client.clientName', header: 'Client' },

  { accessorKey: 'contactMethod', header: 'Contact Method' },
  { accessorKey: 'expectedAmount', header: 'Expected Amount' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'paymentStatus', header: 'Payment Status' },
  {
    accessorKey: 'reservationDate',
    header: 'Reservation Date',
    cell: ({ row }) => format(new Date(row.getValue('reservationDate')), 'yyyy-MM-dd HH:mm'),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'yyyy-MM-dd HH:mm'),
  },
];

const careColumns: ColumnDef<any>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'careTime',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.getValue('careTime')), 'yyyy-MM-dd HH:mm'),
  },
  { accessorKey: 'note', header: 'Note' },
  { accessorKey: 'booking.client.clientName', header: 'Client' },
  { accessorKey: 'booking.catName', header: 'Cat' },
  {
    accessorKey: 'completedAt',
    header: 'Completed At',
    cell: ({ row }) => format(new Date(row.getValue('completedAt')), 'yyyy-MM-dd HH:mm'),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'yyyy-MM-dd HH:mm'),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated At',
    cell: ({ row }) => format(new Date(row.getValue('updatedAt')), 'yyyy-MM-dd HH:mm'),
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

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
        // Check role (assuming role is in user object)
        if (session.user.role !== 'admin') {
          // alert("Access denied. Admin only.");
          // router.push("/login"); // Or show unauthorized view
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

  if (isPending || !isAuthorized) {
    return <div className="p-8">Loading...</div>;
  }

  console.log(cares);
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
            {clientsLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable columns={clientColumns} data={clients || []} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-4">Bookings</h2>
            {bookingsLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable columns={bookingColumns} data={bookings || []} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="cares">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Cares</h2>
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
              <DataTable columns={careColumns} data={cares || []} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
