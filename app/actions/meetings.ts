'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

type ActionResult<T = unknown> =
  | {
      success: true;
      message: string;
      data?: T;
    }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[]>;
    };

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: Role;
};

type HistoryEntry = {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  changeReason?: string | null;
};

const optionalText = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim();
  return value;
}, z.string().nullable().optional());

const requiredDate = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}, z.date({ message: 'Data inválida.' }));

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}, z.coerce.number().int().positive().nullable().optional());

const participantIdsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value ? [value] : [];
  return [];
}, z.array(z.coerce.number().int().positive()).default([]));

const createMeetingSchema = z.object({
  title: z.string().min(3, 'O título precisa ter ao menos 3 caracteres.'),
  description: optionalText,
  date: requiredDate,
  duration: optionalNumber,
  projectId: z.coerce.number().int().positive('Projeto inválido.'),
  agenda: optionalText,
  minutes: optionalText,
  participantIds: participantIdsSchema,
});

const updateMeetingSchema = z.object({
  id: z.coerce.number().int().positive('Reunião inválida.'),
  title: z.string().min(3, 'O título precisa ter ao menos 3 caracteres.').optional(),
  description: optionalText,
  date: requiredDate.optional(),
  duration: optionalNumber,
  projectId: z.coerce.number().int().positive('Projeto inválido.').optional(),
  agenda: optionalText,
  minutes: optionalText,
  participantIds: participantIdsSchema.optional(),
});

const deleteMeetingSchema = z.object({
  id: z.coerce.number().int().positive('Reunião inválida.'),
});

function toMeetingObject(input: unknown): Record<string, unknown> {
  if (input instanceof FormData) {
    return {
      ...Object.fromEntries(input.entries()),
      participantIds: input.getAll('participantIds'),
    };
  }

  if (typeof input === 'object' && input !== null) {
    return input as Record<string, unknown>;
  }

  return {};
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids)];
}

function sameDate(a?: Date | null, b?: Date | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

async function getAuthUser(): Promise<AuthUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error('Não autenticado.');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  return user;
}

async function canAccessProject(user: AuthUser, projectId: number) {
  if (user.role === Role.ADMIN) return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  return !!member;
}

async function ensureProjectAccess(user: AuthUser, projectId: number) {
  const allowed = await canAccessProject(user, projectId);

  if (!allowed) {
    throw new Error('Você não tem permissão para acessar este projeto.');
  }
}

async function ensureParticipantsAreProjectMembers(projectId: number, participantIds: number[]) {
  if (!participantIds.length) return;

  const uniqueParticipantIds = uniqueIds(participantIds);

  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      userId: {
        in: uniqueParticipantIds,
      },
    },
    select: {
      userId: true,
    },
  });

  const memberIds = new Set(members.map((member : any) => member.userId));
  const invalidIds = uniqueParticipantIds.filter((id) => !memberIds.has(id));

  if (invalidIds.length) {
    throw new Error('Todos os participantes precisam ser membros do projeto.');
  }
}

async function getMeetingWithRelations(meetingId: number) {
  return prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      comments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

async function ensureMeetingAccess(user: AuthUser, meetingId: number) {
  const meeting = await getMeetingWithRelations(meetingId);

  if (!meeting) {
    throw new Error('Reunião não encontrada.');
  }

  if (!meeting.projectId) {
    if (user.role !== Role.ADMIN) {
      throw new Error('Você não tem permissão para acessar esta reunião.');
    }
    return meeting;
  }

  await ensureProjectAccess(user, meeting.projectId);

  return meeting;
}



async function createMeetingHistory(
  tx: Prisma.TransactionClient,
  params: {
    meetingId: number;
    changedById: number;
    entries: HistoryEntry[];
  }
) {
  if (!params.entries.length) return;

  await tx.$executeRaw`SELECT 1`;
}

export async function getMeetings(filters?: {
  projectId?: number;
}): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    const where: Record<string, unknown> = {};

    if (filters?.projectId) {
      await ensureProjectAccess(user, filters.projectId);
      where.projectId = filters.projectId;
    } else if (user.role !== Role.ADMIN) {
      where.project = {
        members: {
          some: {
            userId: user.id,
          },
        },
      };
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return {
      success: true,
      message: 'Reuniões carregadas com sucesso.',
      data: meetings,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao carregar reuniões.',
    };
  }
}

export async function getMeetingById(meetingId: number): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const meeting = await ensureMeetingAccess(user, meetingId);

    return {
      success: true,
      message: 'Reunião carregada com sucesso.',
      data: meeting,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao carregar reunião.',
    };
  }
}

export async function createMeeting(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const raw = toMeetingObject(input);
    const data = createMeetingSchema.parse(raw);

    await ensureProjectAccess(user, data.projectId);

    const participantIds = uniqueIds(data.participantIds ?? []);
    await ensureParticipantsAreProjectMembers(data.projectId, participantIds);

    const created = await prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          title: data.title,
          description: data.description ?? null,
          date: data.date,
          duration: data.duration ?? null,
          projectId: data.projectId,
          agenda: data.agenda ?? null,
          minutes: data.minutes ?? null,
        },
      });

      if (participantIds.length) {
        await tx.meetingParticipant.createMany({
          data: participantIds.map((userId : any) => ({
            meetingId: meeting.id,
            userId,
          })),
        });
      }

      return meeting;
    });

    revalidatePath('/reunioes');
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Reunião criada com sucesso.',
      data: created,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Dados inválidos.',
        errors: error.flatten().fieldErrors,
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar reunião.',
    };
  }
}

export async function updateMeeting(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const raw = toMeetingObject(input);
    const data = updateMeetingSchema.parse(raw);

    const currentMeeting = await ensureMeetingAccess(user, data.id);

    const nextProjectId = data.projectId ?? currentMeeting.projectId;
    if (!nextProjectId) {
      throw new Error('A reunião precisa estar associada a um projeto.');
    }

    await ensureProjectAccess(user, nextProjectId);

    const nextParticipantIds = uniqueIds(data.participantIds ?? []);
    await ensureParticipantsAreProjectMembers(nextProjectId, nextParticipantIds);

    const historyEntries: HistoryEntry[] = [];

    if (data.title !== undefined && data.title !== currentMeeting.title) {
      historyEntries.push({
        field: 'title',
        oldValue: currentMeeting.title,
        newValue: data.title,
      });
    }

    if (data.description !== undefined && data.description !== currentMeeting.description) {
      historyEntries.push({
        field: 'description',
        oldValue: currentMeeting.description ?? null,
        newValue: data.description ?? null,
      });
    }

    if (data.date !== undefined && !sameDate(currentMeeting.date, data.date)) {
      historyEntries.push({
        field: 'date',
        oldValue: currentMeeting.date ? currentMeeting.date.toISOString() : null,
        newValue: data.date ? data.date.toISOString() : null,
      });
    }

    if (data.duration !== undefined && data.duration !== currentMeeting.duration) {
      historyEntries.push({
        field: 'duration',
        oldValue: currentMeeting.duration ? String(currentMeeting.duration) : null,
        newValue: data.duration ? String(data.duration) : null,
      });
    }

    if (data.projectId !== undefined && data.projectId !== currentMeeting.projectId) {
      historyEntries.push({
        field: 'projectId',
        oldValue: currentMeeting.projectId ? String(currentMeeting.projectId) : null,
        newValue: data.projectId ? String(data.projectId) : null,
      });
    }

    if (data.agenda !== undefined && data.agenda !== currentMeeting.agenda) {
      historyEntries.push({
        field: 'agenda',
        oldValue: currentMeeting.agenda ?? null,
        newValue: data.agenda ?? null,
      });
    }

    if (data.minutes !== undefined && data.minutes !== currentMeeting.minutes) {
      historyEntries.push({
        field: 'minutes',
        oldValue: currentMeeting.minutes ?? null,
        newValue: data.minutes ?? null,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.update({
        where: { id: currentMeeting.id },
        data: {
          title: data.title ?? currentMeeting.title,
          description: data.description !== undefined ? data.description : currentMeeting.description,
          date: data.date ?? currentMeeting.date,
          duration: data.duration === undefined ? currentMeeting.duration : data.duration,
          projectId: nextProjectId,
          agenda: data.agenda !== undefined ? data.agenda : currentMeeting.agenda,
          minutes: data.minutes !== undefined ? data.minutes : currentMeeting.minutes,
        },
      });

      if (historyEntries.length) {
        await tx.$executeRaw`SELECT 1`;
      }

      await tx.meetingParticipant.deleteMany({
        where: {
          meetingId: meeting.id,
        },
      });

      if (nextParticipantIds.length) {
        await tx.meetingParticipant.createMany({
          data: nextParticipantIds.map((userId : any) => ({
            meetingId: meeting.id,
            userId,
          })),
        });
      }

      return meeting;
    });

    revalidatePath('/reunioes');
    revalidatePath(`/reunioes/${updated.id}`);
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Reunião atualizada com sucesso.',
      data: updated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Dados inválidos.',
        errors: error.flatten().fieldErrors,
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao atualizar reunião.',
    };
  }
}

export async function deleteMeeting(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const raw = toMeetingObject(input);
    const data = deleteMeetingSchema.parse(raw);

    const meeting = await ensureMeetingAccess(user, data.id);

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({
        where: {
          meetingId: meeting.id,
        },
      });

      await tx.meetingParticipant.deleteMany({
        where: {
          meetingId: meeting.id,
        },
      });

      await tx.meeting.delete({
        where: {
          id: meeting.id,
        },
      });
    });

    revalidatePath('/reunioes');
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Reunião removida com sucesso.',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Dados inválidos.',
        errors: error.flatten().fieldErrors,
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao excluir reunião.',
    };
  }
}