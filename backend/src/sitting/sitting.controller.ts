import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';

import { SittingBookingStatus } from '../generated/prisma/client';
import { CreateSittingBookingDto } from './dto/create-booking.dto';
import { CreateSittingCareDto } from './dto/create-care.dto';
import { CreateSittingClientDto } from './dto/create-client.dto';
import { UpdateSittingBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateSittingCareDto } from './dto/update-care.dto';
import { UpdateSittingClientDto } from './dto/update-client.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { SittingService } from './sitting.service';

@Controller('/sitting')
export class SittingController {
  constructor(private readonly sitting: SittingService) {}

  // ==================== CLIENT ====================

  @Post('/clients')
  async createClient(@Req() req: any, @Body() dto: CreateSittingClientDto) {
    const userId = req.user.sub;
    return this.sitting.createClient({ userId, dto });
  }

  @Get('/clients')
  async getClients(@Req() req: any) {
    const userId = req.user.sub;
    return this.sitting.getClients({ userId });
  }

  @Get('/clients/:clientId')
  async getClient(@Req() req: any, @Param('clientId') clientId: string) {
    const userId = req.user.sub;
    return this.sitting.getClient({ userId, clientId });
  }

  @Patch('/clients/:clientId')
  async updateClient(
    @Req() req: any,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateSittingClientDto,
  ) {
    const userId = req.user.sub;
    return this.sitting.updateClient({ userId, clientId, dto });
  }

  @Delete('/clients/:clientId')
  async deleteClient(@Req() req: any, @Param('clientId') clientId: string) {
    const userId = req.user.sub;
    return this.sitting.deleteClient({ userId, clientId });
  }

  // ==================== BOOKING ====================

  @Post('/bookings')
  async createBooking(@Req() req: any, @Body() dto: CreateSittingBookingDto) {
    const userId = req.user.sub;
    return this.sitting.createBooking({ userId, dto });
  }

  @Get('/bookings')
  async getBookings(
    @Req() req: any,
    @Query('clientId') clientId?: string,
    @Query('status') status?: SittingBookingStatus,
  ) {
    const userId = req.user.sub;
    return this.sitting.getBookings({ userId, clientId, status });
  }

  @Get('/bookings/:bookingId')
  async getBooking(@Req() req: any, @Param('bookingId') bookingId: string) {
    const userId = req.user.sub;
    return this.sitting.getBooking({ userId, bookingId });
  }

  @Patch('/bookings/:bookingId')
  async updateBooking(
    @Req() req: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateSittingBookingDto,
  ) {
    const userId = req.user.sub;
    return this.sitting.updateBooking({ userId, bookingId, dto });
  }

  @Patch('/bookings/:bookingId/status')
  async updateBookingStatus(
    @Req() req: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const userId = req.user.sub;
    return this.sitting.updateBookingStatus({
      userId,
      bookingId,
      nextStatus: dto.bookingStatus as SittingBookingStatus,
    });
  }

  @Patch('/bookings/:bookingId/payment-status')
  async updatePaymentStatus(
    @Req() req: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    const userId = req.user.sub;
    return this.sitting.updatePaymentStatus({
      userId,
      bookingId,
      nextStatus: dto.paymentStatus as any,
    });
  }

  // ==================== CARE ====================

  @Post('/cares')
  async createCare(@Req() req: any, @Body() dto: CreateSittingCareDto) {
    const userId = req.user.sub;
    return this.sitting.createCare({ userId, dto });
  }

  @Get('/bookings/:bookingId/cares')
  async getCaresByBooking(@Req() req: any, @Param('bookingId') bookingId: string) {
    const userId = req.user.sub;
    return this.sitting.getCaresByBooking({ userId, bookingId });
  }

  @Get('/cares/:careId')
  async getCare(@Req() req: any, @Param('careId') careId: string) {
    const userId = req.user.sub;
    return this.sitting.getCare({ userId, careId });
  }

  @Patch('/cares/:careId')
  async updateCare(
    @Req() req: any,
    @Param('careId') careId: string,
    @Body() dto: UpdateSittingCareDto,
  ) {
    const userId = req.user.sub;
    return this.sitting.updateCare({ userId, careId, dto });
  }

  @Delete('/cares/:careId')
  async deleteCare(@Req() req: any, @Param('careId') careId: string) {
    const userId = req.user.sub;
    return this.sitting.deleteCare({ userId, careId });
  }
}
