'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { SittingBooking, SittingCare, SittingClient } from '@/lib/apis/api-client';

export const clientColumns: ColumnDef<SittingClient>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'clientName', header: 'Name' },
  { accessorKey: 'catName', header: 'Cat' },
  { accessorKey: 'address', header: 'Address' },
  { accessorKey: 'entryNote', header: 'Entry Note' },
  { accessorKey: 'requirements', header: 'Requirements' },
];

export const bookingColumns: ColumnDef<SittingBooking>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'bookingStatus', header: 'Status' },
  { accessorKey: 'paymentStatus', header: 'Payment' },
  { accessorKey: 'client.clientName', header: 'Client' },
  { accessorKey: 'contactMethod', header: 'Contact Method' },
  { accessorKey: 'expectedAmount', header: 'Expected Amount' },
  { accessorKey: 'amount', header: 'Amount' },
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

export const careColumns: ColumnDef<SittingCare>[] = [
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
    cell: ({ row }) => {
      const value = row.getValue('completedAt');
      return value ? format(new Date(value as string), 'yyyy-MM-dd HH:mm') : '-';
    },
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
