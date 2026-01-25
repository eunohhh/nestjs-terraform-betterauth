import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PrismaClient,
  SittingAuditType,
  SittingBookingStatus,
  SittingPaymentStatus,
} from '../generated/prisma/client';
import { kstStringToUtcDate } from '../libs/common/kst';
import { CreateSittingBookingDto } from './dto/create-booking.dto';
import { CreateSittingCareDto } from './dto/create-care.dto';

@Injectable()
export class SittingService {
  constructor(private readonly prisma: PrismaClient) {}

  async createBooking(params: {
    userId: string;
    appId?: string; // default "catsitter"
    dto: CreateSittingBookingDto;
  }) {
    const { userId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    // 1) client 조회 (권한/소유 체크)
    const client = await this.prisma.sittingClient.findFirst({
      where: { id: dto.clientId, appId },
      select: {
        id: true,
        userId: true,
        catName: true,
        address: true,
        entryNote: true,
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    // 지금은 단일 사용자 툴이지만, 확장 대비로 소유 체크 추천
    if (client.userId !== userId) throw new ForbiddenException('Not your client');

    // 2) KST -> UTC 변환
    const reservationDateUtc = kstStringToUtcDate(dto.reservationKst);

    // 3) 스냅샷 자동 채우기 (override 우선)
    const catName = dto.catNameOverride ?? client.catName;
    const addressSnapshot = dto.addressSnapshotOverride ?? client.address;
    const entryNoteSnapshot = dto.entryNoteSnapshotOverride ?? client.entryNote ?? null;

    // 4) 트랜잭션으로 booking + auditlog 생성
    return this.prisma.$transaction(async (transaction) => {
      const booking = await transaction.sittingBooking.create({
        data: {
          appId,
          clientId: client.id,
          reservationDate: reservationDateUtc,
          catName,
          bookingStatus: SittingBookingStatus.CONFIRMED,
          expectedAmount: dto.expectedAmount,
          amount: dto.amount,
          paymentStatus: SittingPaymentStatus.UNPAID,
          addressSnapshot,
          entryNoteSnapshot,
          createdById: userId,
          updatedById: userId,
        },
      });

      await transaction.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId: booking.id,
          type: SittingAuditType.BOOKING_CREATED,
          actorUserId: userId,
          payload: {
            clientId: booking.clientId,
            reservationDateUtc: booking.reservationDate.toISOString(),
            catName: booking.catName,
            expectedAmount: booking.expectedAmount,
            amount: booking.amount,
            paymentStatus: booking.paymentStatus,
            bookingStatus: booking.bookingStatus,
          },
        },
      });

      return booking;
    });
  }

  async updatePaymentStatus(params: {
    userId: string;
    bookingId: string;
    appId?: string;
    nextStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  }) {
    const { userId, bookingId, nextStatus } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: bookingId, appId },
      select: { id: true, client: { select: { userId: true } }, paymentStatus: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.sittingBooking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: nextStatus as any,
          updatedById: userId,
        },
      });

      await transaction.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId: bookingId,
          type: SittingAuditType.PAYMENT_STATUS_CHANGED,
          actorUserId: userId,
          payload: { prev: booking.paymentStatus, next: nextStatus },
        },
      });

      return updated;
    });
  }

  async createCare(params: { userId: string; dto: CreateSittingCareDto; appId?: string }) {
    const { userId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    // booking 소유 체크(booking -> client.userId)
    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: dto.bookingId, appId },
      select: { id: true, client: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    const careTimeUtc = kstStringToUtcDate(dto.careTimeKst);

    return this.prisma.$transaction(async (transaction) => {
      const care = await transaction.sittingCare.create({
        data: {
          appId,
          bookingId: dto.bookingId,
          careTime: careTimeUtc,
          note: dto.note ?? null,
          createdById: userId,
          updatedById: userId,
        },
      });

      await transaction.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId: dto.bookingId,
          type: SittingAuditType.CARE_ADDED,
          actorUserId: userId,
          payload: {
            careId: care.id,
            careTimeUtc: care.careTime.toISOString(),
            note: care.note,
          },
        },
      });

      return care;
    });
  }
}
