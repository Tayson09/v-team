'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

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

const roleSchema = z.enum(['ADMIN', 'COLLABORATOR']);

const createMemberSchema = z.object({
  name: z.string().min(2, 'O nome precisa ter ao menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.'),
  role: roleSchema.default('COLLABORATOR'),
});

const updateMemberSchema = z.object({
  id: z.coerce.number().int().positive('Usuário inválido.'),
  name: z.string().min(2, 'O nome precisa ter ao menos 2 caracteres.').optional(),
  email: z.string().email('E-mail inválido.').optional(),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.').optional(),
  role: roleSchema.optional(),
});

const deleteMemberSchema = z.object({
  id: z.coerce.number().int().positive('Usuário inválido.'),
});

function toPlainObject(input: unknown): Record<string, unknown> {
  if (input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }

  if (typeof input === 'object' && input !== null) {
    return input as Record<string, unknown>;
  }

  return {};
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

async function ensureAdmin() {
  const user = await getAuthUser();

  if (user.role !== Role.ADMIN) {
    throw new Error('Você não tem permissão para gerenciar a equipe.');
  }

  return user;
}

async function ensureNotLastAdmin(targetUserId: number, nextRole: Role) {
  if (nextRole !== Role.COLLABORATOR) return;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });

  if (!target || target.role !== Role.ADMIN) return;

  const otherAdmins = await prisma.user.count({
    where: {
      role: Role.ADMIN,
      NOT: { id: targetUserId },
    },
  });

  if (otherAdmins === 0) {
    throw new Error('Não é possível remover o último administrador do sistema.');
  }
}

async function ensureCanDeleteUser(targetUserId: number) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });

  if (!target) {
    throw new Error('Usuário não encontrado.');
  }

  if (target.role === Role.ADMIN) {
    const otherAdmins = await prisma.user.count({
      where: {
        role: Role.ADMIN,
        NOT: { id: targetUserId },
      },
    });

    if (otherAdmins === 0) {
      throw new Error('Não é possível excluir o último administrador do sistema.');
    }
  }
}

export async function getTeamMembers(): Promise<ActionResult> {
  try {
    await ensureAdmin();

    const members = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            tasks: true,
            tasksCreated: true,
            dailies: true,
            meetings: true,
            warnings: true,
            notifications: true,
            comments: true,
            timeEntries: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Equipe carregada com sucesso.',
      data: members,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao carregar equipe.',
    };
  }
}

export async function getMemberById(id: number): Promise<ActionResult> {
  try {
    await ensureAdmin();

    const member = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            tasks: true,
            tasksCreated: true,
          },
        },
      },
    });

    if (!member) {
      return {
        success: false,
        message: 'Usuário não encontrado.',
      };
    }

    return {
      success: true,
      message: 'Usuário carregado com sucesso.',
      data: member,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao carregar usuário.',
    };
  }
}

export async function createMember(input: unknown): Promise<ActionResult> {
  try {
    await ensureAdmin();

    const raw = toPlainObject(input);
    const data = createMemberSchema.parse(raw);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath('/equipe');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Membro criado com sucesso.',
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

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        success: false,
        message: 'Já existe um usuário com esse e-mail.',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar membro.',
    };
  }
}

export async function updateMember(input: unknown): Promise<ActionResult> {
  try {
    const authUser = await ensureAdmin();
    const raw = toPlainObject(input);
    const data = updateMemberSchema.parse(raw);

    if (data.role) {
      await ensureNotLastAdmin(data.id, data.role);
    }

    const current = await prisma.user.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        role: true,
      },
    });

    if (!current) {
      throw new Error('Usuário não encontrado.');
    }

    const updated = await prisma.user.update({
      where: { id: data.id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        email: data.email !== undefined ? data.email.toLowerCase().trim() : undefined,
        password: data.password ? await bcrypt.hash(data.password, 10) : undefined,
        role: data.role ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath('/equipe');
    revalidatePath('/dashboard');

    // Se quiser refletir mudanças imediatamente no próprio painel do admin, isso ajuda.
    if (authUser.id === updated.id) {
      revalidatePath('/perfil');
    }

    return {
      success: true,
      message: 'Membro atualizado com sucesso.',
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

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        success: false,
        message: 'Já existe um usuário com esse e-mail.',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao atualizar membro.',
    };
  }
}

export async function deleteMember(input: unknown): Promise<ActionResult> {
  try {
    const authUser = await ensureAdmin();
    const raw = toPlainObject(input);
    const data = deleteMemberSchema.parse(raw);

    if (data.id === authUser.id) {
      throw new Error('Você não pode excluir o próprio usuário.');
    }

    await ensureCanDeleteUser(data.id);

    const target = await prisma.user.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({
        where: { userId: target.id },
      });

      await tx.task.updateMany({
        where: { assigneeId: target.id },
        data: { assigneeId: null },
      });

      await tx.task.updateMany({
        where: { createdById: target.id },
        data: { createdById: null },
      });

      await tx.comment.deleteMany({
        where: { userId: target.id },
      });

      await tx.daily.deleteMany({
        where: { userId: target.id },
      });

      await tx.meetingParticipant.deleteMany({
        where: { userId: target.id },
      });

      await tx.userWarning.deleteMany({
        where: { userId: target.id },
      });

      await tx.taskHistory.deleteMany({
        where: { changedById: target.id },
      });

      await tx.notification.deleteMany({
        where: { userId: target.id },
      });

      await tx.timeEntry.deleteMany({
        where: { userId: target.id },
      });

      await tx.productivityMetric.updateMany({
        where: { userId: target.id },
        data: { userId: null },
      });

      await tx.label.updateMany({
        where: { createdById: target.id },
        data: { createdById: null },
      });

      await tx.user.delete({
        where: { id: target.id },
      });
    });

    revalidatePath('/equipe');
    revalidatePath('/dashboard');
    revalidatePath('/projetos');
    revalidatePath('/tarefas');
    revalidatePath('/reunioes');

    return {
      success: true,
      message: 'Membro removido com sucesso.',
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
      message: error instanceof Error ? error.message : 'Erro ao excluir membro.',
    };
  }
}