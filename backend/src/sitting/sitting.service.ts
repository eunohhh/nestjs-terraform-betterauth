import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  SittingAuditType,
  SittingBookingStatus,
  SittingPaymentStatus,
} from '../generated/prisma/client';
import { kstStringToUtcDate } from '../libs/common/kst';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSittingBookingDto } from './dto/create-booking.dto';
import { CreateSittingCareDto } from './dto/create-care.dto';
import { CreateSittingClientDto } from './dto/create-client.dto';
import { UpdateSittingBookingDto } from './dto/update-booking.dto';
import { UpdateSittingCareDto } from './dto/update-care.dto';
import { UpdateSittingClientDto } from './dto/update-client.dto';

@Injectable()
export class SittingService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CLIENT ====================

  async createClient(params: { userId: string; dto: CreateSittingClientDto; appId?: string }) {
    const { userId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    return this.prisma.sittingClient.create({
      data: {
        appId,
        userId,
        clientName: dto.clientName,
        catName: dto.catName,
        address: dto.address,
        entryNote: dto.entryNote ?? null,
        requirements: dto.requirements ?? null,
        catPic: dto.catPic ?? null,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async getClient(params: { userId: string; clientId: string; appId?: string }) {
    const { userId, clientId } = params;
    const appId = params.appId ?? 'catsitter';

    const client = await this.prisma.sittingClient.findFirst({
      where: { id: clientId, appId },
    });

    if (!client) throw new NotFoundException('Client not found');
    if (client.userId !== userId) throw new ForbiddenException('Not your client');

    return client;
  }

  async getClients(params: { userId: string; appId?: string }) {
    const { userId } = params;
    const appId = params.appId ?? 'catsitter';

    return this.prisma.sittingClient.findMany({
      where: { userId, appId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateClient(params: {
    userId: string;
    clientId: string;
    dto: UpdateSittingClientDto;
    appId?: string;
  }) {
    const { userId, clientId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    const client = await this.prisma.sittingClient.findFirst({
      where: { id: clientId, appId },
      select: { id: true, userId: true },
    });

    if (!client) throw new NotFoundException('Client not found');
    if (client.userId !== userId) throw new ForbiddenException('Not your client');

    return this.prisma.sittingClient.update({
      where: { id: clientId },
      data: {
        ...dto,
        updatedById: userId,
      },
    });
  }

  async deleteClient(params: { userId: string; clientId: string; appId?: string }) {
    const { userId, clientId } = params;
    const appId = params.appId ?? 'catsitter';

    const client = await this.prisma.sittingClient.findFirst({
      where: { id: clientId, appId },
      select: { id: true, userId: true },
    });

    if (!client) throw new NotFoundException('Client not found');
    if (client.userId !== userId) throw new ForbiddenException('Not your client');

    await this.prisma.sittingClient.delete({
      where: { id: clientId },
    });

    return { success: true };
  }

  // ==================== BOOKING ====================

  async createBooking(params: { userId: string; appId?: string; dto: CreateSittingBookingDto }) {
    const { userId, dto } = params;
    const appId = params.appId ?? 'catsitter';

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
    if (client.userId !== userId) throw new ForbiddenException('Not your client');

    const reservationDateUtc = kstStringToUtcDate(dto.reservationKst);

    const catName = dto.catNameOverride ?? client.catName;
    const addressSnapshot = dto.addressSnapshotOverride ?? client.address;
    const entryNoteSnapshot = dto.entryNoteSnapshotOverride ?? client.entryNote ?? null;

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.sittingBooking.create({
        data: {
          appId,
          clientId: client.id,
          reservationDate: reservationDateUtc,
          catName,
          bookingStatus: SittingBookingStatus.CONFIRMED,
          expectedAmount: dto.expectedAmount,
          amount: dto.amount,
          paymentStatus: SittingPaymentStatus.UNPAID,
          contactMethod: dto.contactMethod ?? null,
          addressSnapshot,
          entryNoteSnapshot,
          createdById: userId,
          updatedById: userId,
        },
      });

      await tx.sittingBookingAuditLog.create({
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
            contactMethod: booking.contactMethod,
          },
        },
      });

      return booking;
    });
  }

  async getBooking(params: { userId: string; bookingId: string; appId?: string }) {
    const { userId, bookingId } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: bookingId, appId },
      include: {
        client: true,
        cares: { orderBy: { careTime: 'asc' } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    return booking;
  }

  async getBookings(params: {
    userId: string;
    appId?: string;
    clientId?: string;
    status?: SittingBookingStatus;
  }) {
    const { userId, clientId, status } = params;
    const appId = params.appId ?? 'catsitter';

    return this.prisma.sittingBooking.findMany({
      where: {
        appId,
        client: { userId },
        ...(clientId && { clientId }),
        ...(status && { bookingStatus: status }),
      },
      include: {
        client: { select: { id: true, clientName: true, catName: true } },
        cares: { select: { id: true, careTime: true } },
      },
      orderBy: { reservationDate: 'desc' },
    });
  }

  async updateBooking(params: {
    userId: string;
    bookingId: string;
    dto: UpdateSittingBookingDto;
    appId?: string;
  }) {
    const { userId, bookingId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: bookingId, appId },
      include: { client: { select: { userId: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    const updateData: any = { updatedById: userId };

    if (dto.reservationKst) {
      updateData.reservationDate = kstStringToUtcDate(dto.reservationKst);
    }
    if (dto.expectedAmount !== undefined) updateData.expectedAmount = dto.expectedAmount;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.contactMethod !== undefined) updateData.contactMethod = dto.contactMethod;
    if (dto.catName !== undefined) updateData.catName = dto.catName;
    if (dto.addressSnapshot !== undefined) updateData.addressSnapshot = dto.addressSnapshot;
    if (dto.entryNoteSnapshot !== undefined) updateData.entryNoteSnapshot = dto.entryNoteSnapshot;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sittingBooking.update({
        where: { id: bookingId },
        data: updateData,
      });

      await tx.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId,
          type: SittingAuditType.BOOKING_UPDATED,
          actorUserId: userId,
          payload: { changes: { ...dto } },
        },
      });

      return updated;
    });
  }

  async updateBookingStatus(params: {
    userId: string;
    bookingId: string;
    appId?: string;
    nextStatus: SittingBookingStatus;
  }) {
    const { userId, bookingId, nextStatus } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: bookingId, appId },
      select: { id: true, client: { select: { userId: true } }, bookingStatus: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    const auditType =
      nextStatus === SittingBookingStatus.CANCELLED
        ? SittingAuditType.BOOKING_CANCELLED
        : nextStatus === SittingBookingStatus.COMPLETED
          ? SittingAuditType.BOOKING_COMPLETED
          : SittingAuditType.BOOKING_UPDATED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sittingBooking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: nextStatus,
          updatedById: userId,
        },
      });

      await tx.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId,
          type: auditType,
          actorUserId: userId,
          payload: { prev: booking.bookingStatus, next: nextStatus },
        },
      });

      return updated;
    });
  }

  async updatePaymentStatus(params: {
    userId: string;
    bookingId: string;
    appId?: string;
    nextStatus: SittingPaymentStatus;
  }) {
    const { userId, bookingId, nextStatus } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: bookingId, appId },
      select: { id: true, client: { select: { userId: true } }, paymentStatus: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sittingBooking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: nextStatus,
          updatedById: userId,
        },
      });

      await tx.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId,
          type: SittingAuditType.PAYMENT_STATUS_CHANGED,
          actorUserId: userId,
          payload: { prev: booking.paymentStatus, next: nextStatus },
        },
      });

      return updated;
    });
  }

  // ==================== CARE ====================

  async createCare(params: { userId: string; dto: CreateSittingCareDto; appId?: string }) {
    const { userId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: dto.bookingId, appId },
      select: { id: true, client: { select: { userId: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    const careTimeUtc = kstStringToUtcDate(dto.careTimeKst);

    return this.prisma.$transaction(async (tx) => {
      const care = await tx.sittingCare.create({
        data: {
          appId,
          bookingId: dto.bookingId,
          careTime: careTimeUtc,
          note: dto.note ?? null,
          createdById: userId,
          updatedById: userId,
        },
      });

      await tx.sittingBookingAuditLog.create({
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

  async getCare(params: { userId: string; careId: string; appId?: string }) {
    const { userId, careId } = params;
    const appId = params.appId ?? 'catsitter';

    const care = await this.prisma.sittingCare.findFirst({
      where: { id: careId, appId },
      include: {
        booking: {
          select: {
            id: true,
            catName: true,
            addressSnapshot: true,
            client: { select: { userId: true, address: true, clientName: true } },
          },
        },
      },
    });

    if (!care) throw new NotFoundException('Care not found');
    if (care.booking.client.userId !== userId) throw new ForbiddenException('Not your care');

    return care;
  }

  async getCaresByBooking(params: { userId: string; bookingId: string; appId?: string }) {
    const { userId, bookingId } = params;
    const appId = params.appId ?? 'catsitter';

    const booking = await this.prisma.sittingBooking.findFirst({
      where: { id: bookingId, appId },
      select: { id: true, client: { select: { userId: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.client.userId !== userId) throw new ForbiddenException('Not your booking');

    return this.prisma.sittingCare.findMany({
      where: { bookingId, appId },
      orderBy: { careTime: 'asc' },
    });
  }

  async updateCare(params: {
    userId: string;
    careId: string;
    dto: UpdateSittingCareDto;
    appId?: string;
  }) {
    const { userId, careId, dto } = params;
    const appId = params.appId ?? 'catsitter';

    const care = await this.prisma.sittingCare.findFirst({
      where: { id: careId, appId },
      include: {
        booking: {
          select: { id: true, client: { select: { userId: true } } },
        },
      },
    });

    if (!care) throw new NotFoundException('Care not found');
    if (care.booking.client.userId !== userId) throw new ForbiddenException('Not your care');

    const updateData: any = { updatedById: userId };

    if (dto.careTimeKst) {
      updateData.careTime = kstStringToUtcDate(dto.careTimeKst);
    }
    if (dto.note !== undefined) {
      updateData.note = dto.note;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sittingCare.update({
        where: { id: careId },
        data: updateData,
      });

      await tx.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId: care.booking.id,
          type: SittingAuditType.CARE_UPDATED,
          actorUserId: userId,
          payload: { careId, changes: { ...dto } },
        },
      });

      return updated;
    });
  }

  async deleteCare(params: { userId: string; careId: string; appId?: string }) {
    const { userId, careId } = params;
    const appId = params.appId ?? 'catsitter';

    const care = await this.prisma.sittingCare.findFirst({
      where: { id: careId, appId },
      include: {
        booking: {
          select: { id: true, client: { select: { userId: true } } },
        },
      },
    });

    if (!care) throw new NotFoundException('Care not found');
    if (care.booking.client.userId !== userId) throw new ForbiddenException('Not your care');

    return this.prisma.$transaction(async (tx) => {
      await tx.sittingCare.delete({
        where: { id: careId },
      });

      await tx.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId: care.booking.id,
          type: SittingAuditType.CARE_DELETED,
          actorUserId: userId,
          payload: {
            careId,
            careTimeUtc: care.careTime.toISOString(),
            note: care.note,
          },
        },
      });

      return { success: true };
    });
  }

  // ==================== CALENDAR ====================

  /**
   * 달력용 care 조회 - 날짜 범위로 조회
   * from/to는 UTC ISO 문자열 (예: "2026-01-01T00:00:00.000Z")
   */
  async getCaresForCalendar(params: { userId: string; from: Date; to: Date; appId?: string }) {
    const { userId, from, to } = params;
    console.log('from ====>', from);
    console.log('to ====>', to);
    const appId = params.appId ?? 'catsitter';

    return this.prisma.sittingCare.findMany({
      where: {
        appId,
        careTime: {
          gte: from,
          lte: to,
        },
        booking: {
          client: { userId },
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            catName: true,
            addressSnapshot: true,
            client: {
              select: {
                id: true,
                clientName: true,
                catName: true,
              },
            },
          },
        },
      },
      orderBy: { careTime: 'asc' },
    });
  }

  /**
   * Care 완료/미완료 토글
   */
  async toggleCareComplete(params: { userId: string; careId: string; appId?: string }) {
    const { userId, careId } = params;
    const appId = params.appId ?? 'catsitter';

    const care = await this.prisma.sittingCare.findFirst({
      where: { id: careId, appId },
      include: {
        booking: {
          select: { id: true, client: { select: { userId: true } } },
        },
      },
    });

    if (!care) throw new NotFoundException('Care not found');
    if (care.booking.client.userId !== userId) throw new ForbiddenException('Not your care');

    const isCompleting = care.completedAt === null;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sittingCare.update({
        where: { id: careId },
        data: {
          completedAt: isCompleting ? now : null,
          updatedById: userId,
        },
      });

      await tx.sittingBookingAuditLog.create({
        data: {
          appId,
          bookingId: care.booking.id,
          type: SittingAuditType.CARE_COMPLETED,
          actorUserId: userId,
          payload: {
            careId,
            action: isCompleting ? 'completed' : 'uncompleted',
            completedAt: isCompleting ? now.toISOString() : null,
          },
        },
      });

      return updated;
    });
  }
}
