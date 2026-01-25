import { Body, Controller, Post, Req } from '@nestjs/common';
import { CreateSittingBookingDto } from './dto/create-booking.dto';
import { CreateSittingCareDto } from './dto/create-care.dto';
import { SittingService } from './sitting.service';

@Controller('/sitting')
export class SittingController {
  constructor(private readonly sitting: SittingService) {}

  @Post('/bookings')
  async createBooking(@Req() req: any, @Body() dto: CreateSittingBookingDto) {
    const userId = req.user.sub; // app-jwt guard에서 주입했다고 가정
    return this.sitting.createBooking({ userId, dto });
  }

  @Post('/cares')
  async createCare(@Req() req: any, @Body() dto: CreateSittingCareDto) {
    const userId = req.user.sub;
    return this.sitting.createCare({ userId, dto });
  }
}
