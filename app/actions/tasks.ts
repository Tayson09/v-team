'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { randomUUID } from "crypto";

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  notifyTaskEdited,
  notifyAdminTaskCompleted,
} from '../../lib/notifications/individual';

// -------------------------------
// Tipos e Schemas
// -------------------------------
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

type TaskPriorityLegacy = 'baixa' | 'media' | 'alta' | 'urgente';
type TaskStatusLegacy = 'pending' | 'in_progress' | 'blocked' | 'done' | 'canceled';
type JustificationTypeNormalized = 'DELAY' | 'BLOCKER' | 'SCOPE_CHANGE' | 'OTHER';

type HistoryEntry = {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  changeReason?: string | null;
};

const prioritySchema = z.preprocess((value) => {
  if (typeof value === 'string') return value.trim().toUpperCase();
  return value;
}, z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional());

const statusSchema = z.preprocess((value) => {
  if (typeof value === 'string') return value.trim().toUpperCase();
  return value;
}, z.enum(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELED']).optional());

const optionalText = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim();
  return value;
}, z.string().nullable().optional());

const optionalDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}, z.date().nullable().optional());

const nullableNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;

  return parsed;
}, z.number().int().positive().nullable().optional());

const createTaskSchema = z.object({
  title: z.string().min(3, 'O título precisa ter ao menos 3 caracteres.'),
  description: optionalText,
  projectId: z.coerce.number().int().positive('Projeto inválido.'),
  assigneeId: nullableNumber,
  parentTaskId: nullableNumber,
  dueDate: optionalDate,
  priority: prioritySchema,
  status: statusSchema,
  justification: optionalText,
  justificationType: optionalText,
});

const updateTaskSchema = z.object({
  id: z.coerce.number().int().positive('Tarefa inválida.'),
  title: z.string().min(3, 'O título precisa ter ao menos 3 caracteres.').optional(),
  description: optionalText,
  assigneeId: nullableNumber,
  parentTaskId: nullableNumber,
  dueDate: optionalDate,
  priority: prioritySchema,
  status: statusSchema,
  justification: optionalText,
  justificationType: optionalText,
});

const changeStatusSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  status: z.preprocess((value) => {
    if (typeof value === 'string') return value.trim().toUpperCase();
    return value;
  }, z.enum(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELED'])),
});

const assignTaskSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  assigneeId: z.coerce.number().int().positive().nullable(),
});

const completeTaskSchema = z.object({
  taskId: z.coerce.number().int().positive('Tarefa inválida.'),
  justification: optionalText,
  justificationType: optionalText,
});

// -------------------------------
// Funções auxiliares
// -------------------------------
function toPlainObject(input: unknown): Record<string, unknown> {
  if (input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }

  if (typeof input === 'object' && input !== null) {
    return input as Record<string, unknown>;
  }

  return {};
}

function normalizePriorityEnum(value?: string | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  switch ((value ?? 'MEDIUM').trim().toUpperCase()) {
    case 'LOW':
      return 'LOW';
    case 'HIGH':
      return 'HIGH';
    case 'URGENT':
      return 'URGENT';
    case 'MEDIUM':
    default:
      return 'MEDIUM';
  }
}

function legacyPriority(priorityEnum: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'): TaskPriorityLegacy {
  switch (priorityEnum) {
    case 'LOW':
      return 'baixa';
    case 'HIGH':
      return 'alta';
    case 'URGENT':
      return 'urgente';
    case 'MEDIUM':
    default:
      return 'media';
  }
}

function normalizeStatusEnum(value?: string | null): 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELED' {
  switch ((value ?? 'PENDING').trim().toUpperCase()) {
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'BLOCKED':
      return 'BLOCKED';
    case 'DONE':
      return 'DONE';
    case 'CANCELED':
      return 'CANCELED';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}

function legacyStatus(statusEnum: 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELED'): TaskStatusLegacy {
  switch (statusEnum) {
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'BLOCKED':
      return 'blocked';
    case 'DONE':
      return 'done';
    case 'CANCELED':
      return 'canceled';
    case 'PENDING':
    default:
      return 'pending';
  }
}

function normalizeJustificationType(
  value?: string | null
): JustificationTypeNormalized | null {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();

  switch (normalized) {
    case 'DELAY':
      return 'DELAY';
    case 'BLOCKER':
      return 'BLOCKER';
    case 'SCOPE_CHANGE':
      return 'SCOPE_CHANGE';
    case 'OTHER':
      return 'OTHER';
    default:
      return null;
  }
}

function isTaskDone(status?: string | null) {
  return (status ?? '').trim().toLowerCase() === 'done';
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

export async function addTaskFile(formData: FormData) {
  try {
    console.log("🚀 INICIO addTaskFile");

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.log("❌ Usuário não autenticado");
      return;
    }

    const taskId = Number(formData.get("taskId"));
    const file = formData.get("file");

    console.log("📦 taskId:", taskId);
    console.log("📎 file recebido:", file);

    if (!file || !(file instanceof File)) {
      console.log("❌ FILE INVÁLIDO");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      console.log("❌ Usuário não encontrado no banco");
      return;
    }

    console.log("👤 uploadedById:", user.id);

    console.log("📄 nome:", file.name);
    console.log("📏 tamanho:", file.size);
    console.log("📂 tipo:", file.type);

    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("☁️ enviando para R2...");

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    console.log("✅ upload R2 concluído");

    const fileUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${fileName}`;

    console.log("💾 salvando no banco...");

    await prisma.taskFile.create({
      data: {
        taskId,
        uploadedById: user.id,
        originalName: file.name,
        fileName,
        filePath: fileUrl,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
      },
    });

    console.log("🎉 REGISTRO CRIADO NO BANCO");

    revalidatePath(`/tarefas/${taskId}`);
    return { success: true };
  } catch (error) {
    console.error("🔥 ERRO NA addTaskFile:", error);
    return { success: false };
  }
}

async function ensureProjectAccess(user: AuthUser, projectId: number) {
  const allowed = await canAccessProject(user, projectId);

  if (!allowed) {
    throw new Error('Você não tem permissão para acessar este projeto.');
  }
}

async function ensureAssigneeIsProjectMember(projectId: number, assigneeId: number) {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: assigneeId,
      },
    },
    select: { id: true },
  });

  if (!member) {
    throw new Error('O responsável precisa ser membro do projeto.');
  }
}

async function getTaskWithProject(taskId: number) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          statusEnum: true,
          progress: true,
        },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      history: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

async function ensureTaskAccess(user: AuthUser, taskId: number) {
  const task = await getTaskWithProject(taskId);

  if (!task) {
    throw new Error('Tarefa não encontrada.');
  }

  if (!task.projectId) {
    throw new Error('Tarefa sem projeto associado.');
  }

  await ensureProjectAccess(user, task.projectId);

  return task;
}

// Notificação interna (transacional)
async function createNotification(
  tx: Prisma.TransactionClient,
  params: {
    userId: number;
    title: string;
    message: string;
    type: string;
    link?: string | null;
  }
) {
  return tx.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link ?? null,
    },
  });
}

async function createHistoryRows(
  tx: Prisma.TransactionClient,
  params: {
    taskId: number;
    changedById: number;
    entries: HistoryEntry[];
  }
) {
  if (!params.entries.length) return;

  await tx.taskHistory.createMany({
    data: params.entries.map((entry) => ({
      taskId: params.taskId,
      changedById: params.changedById,
      field: entry.field,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      changeReason: entry.changeReason ?? null,
    })),
  });
}

function pushChange(
  entries: HistoryEntry[],
  field: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
  changeReason?: string | null
) {
  const oldNormalized = oldValue ?? null;
  const newNormalized = newValue ?? null;

  if (oldNormalized === newNormalized) return;

  entries.push({
    field,
    oldValue: oldNormalized,
    newValue: newNormalized,
    changeReason: changeReason ?? null,
  });
}

// -------------------------------
// Funções de ação (leitura)
// -------------------------------

export async function getTasks(filters?: {
  projectId?: number;
  assigneeId?: number;
  status?: string;
}): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    const where: Record<string, unknown> = {};

    if (filters?.projectId) {
      await ensureProjectAccess(user, filters.projectId);
      where.projectId = filters.projectId;
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters?.status) {
      where.status = legacyStatus(normalizeStatusEnum(filters.status));
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            statusEnum: true,
            progress: true,
          },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      success: true,
      message: 'Tarefas carregadas com sucesso.',
      data: tasks,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao carregar tarefas.',
    };
  }
}

export async function getTaskById(taskId: number): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const task = await ensureTaskAccess(user, taskId);

    return {
      success: true,
      message: 'Tarefa carregada com sucesso.',
      data: task,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao carregar tarefa.',
    };
  }
}

// -------------------------------
// Funções de ação (mutação)
// -------------------------------

export async function createTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // Apenas administradores podem criar tarefas
    if (user.role !== Role.ADMIN) {
      return {
        success: false,
        message: 'Apenas administradores podem criar tarefas.',
      };
    }

    const raw = toPlainObject(input);
    const data = createTaskSchema.parse(raw);

    await ensureProjectAccess(user, data.projectId);

    if (data.assigneeId) {
      await ensureAssigneeIsProjectMember(data.projectId, data.assigneeId);
    }

    if (data.parentTaskId) {
      const parent = await prisma.task.findUnique({
        where: { id: data.parentTaskId },
        select: { id: true, projectId: true },
      });

      if (!parent) throw new Error('Tarefa pai não encontrada.');

      if (parent.projectId !== data.projectId) {
        throw new Error('A subtarefa deve pertencer ao mesmo projeto da tarefa pai.');
      }
    }

    const priorityEnum = normalizePriorityEnum(data.priority ?? 'MEDIUM');
    const statusEnum = normalizeStatusEnum(data.status ?? 'PENDING');

    const created = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description ?? null,
          projectId: data.projectId,
          assigneeId: data.assigneeId ?? null,
          createdById: user.id,
          dueDate: data.dueDate ?? null,
          priority: legacyPriority(priorityEnum),
          priorityEnum,
          status: legacyStatus(statusEnum),
          statusEnum,
          completedAt: statusEnum === 'DONE' ? new Date() : null,
          justification: data.justification ?? null,
          justificationType: data.justificationType ?? null,
          justificationTypeEnum: normalizeJustificationType(data.justificationType) ?? null,
          parentTaskId: data.parentTaskId ?? null,
        },
      });

      await createHistoryRows(tx, {
        taskId: task.id,
        changedById: user.id,
        entries: [
          { field: 'created', oldValue: null, newValue: 'created' },
          { field: 'title', oldValue: null, newValue: task.title },
          { field: 'status', oldValue: null, newValue: task.status },
          { field: 'priority', oldValue: null, newValue: task.priority },
        ],
      });

      if (task.assigneeId) {
        await createNotification(tx, {
          userId: task.assigneeId,
          title: 'Nova tarefa atribuída',
          message: `Você recebeu a tarefa "${task.title}".`,
          type: 'TASK_ASSIGNED',
          link: `/tarefas/${task.id}`,
        });
      }

      return task;
    });

    revalidatePath('/tarefas');
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Tarefa criada com sucesso.',
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
      message: error instanceof Error ? error.message : 'Erro ao criar tarefa.',
    };
  }
}

export async function updateTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // Apenas administradores podem editar tarefas
    if (user.role !== Role.ADMIN) {
      return {
        success: false,
        message: 'Apenas administradores podem editar tarefas.',
      };
    }

    const raw = toPlainObject(input);
    const data = updateTaskSchema.parse(raw);

    const currentTask = await ensureTaskAccess(user, data.id);

    if (data.parentTaskId !== undefined && data.parentTaskId !== null) {
      const parent = await prisma.task.findUnique({
        where: { id: data.parentTaskId },
        select: { id: true, projectId: true },
      });

      if (!parent) throw new Error('Tarefa pai não encontrada.');

      if (parent.projectId !== currentTask.projectId) {
        throw new Error('A subtarefa deve pertencer ao mesmo projeto da tarefa pai.');
      }

      if (parent.id === currentTask.id) {
        throw new Error('Uma tarefa não pode ser pai dela mesma.');
      }
    }

    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      await ensureAssigneeIsProjectMember(currentTask.projectId, data.assigneeId);
    }

    const nextPriorityEnum = data.priority
      ? normalizePriorityEnum(data.priority)
      : currentTask.priorityEnum;
    const nextStatusEnum = data.status ? normalizeStatusEnum(data.status) : currentTask.statusEnum;

    const nextJustificationTypeEnum = data.justificationType
      ? normalizeJustificationType(data.justificationType)
      : currentTask.justificationTypeEnum;

    const historyEntries: HistoryEntry[] = [];

    if (data.title !== undefined) {
      pushChange(historyEntries, 'title', currentTask.title, data.title);
    }

    if (data.description !== undefined) {
      pushChange(
        historyEntries,
        'description',
        currentTask.description ?? null,
        data.description ?? null
      );
    }

    if (data.assigneeId !== undefined) {
      pushChange(
        historyEntries,
        'assigneeId',
        currentTask.assigneeId ? String(currentTask.assigneeId) : null,
        data.assigneeId ? String(data.assigneeId) : null
      );
    }

    if (data.parentTaskId !== undefined) {
      pushChange(
        historyEntries,
        'parentTaskId',
        currentTask.parentTaskId ? String(currentTask.parentTaskId) : null,
        data.parentTaskId ? String(data.parentTaskId) : null
      );
    }

    if (data.dueDate !== undefined) {
      const datesEqual = sameDate(currentTask.dueDate, data.dueDate);
      if (!datesEqual) {
        historyEntries.push({
          field: 'dueDate',
          oldValue: currentTask.dueDate ? currentTask.dueDate.toISOString() : null,
          newValue: data.dueDate ? data.dueDate.toISOString() : null,
        });
      }
    }

    if (nextPriorityEnum !== currentTask.priorityEnum) {
      historyEntries.push({
        field: 'priority',
        oldValue: currentTask.priority,
        newValue: legacyPriority(nextPriorityEnum),
      });
    }

    if (nextStatusEnum !== currentTask.statusEnum) {
      historyEntries.push({
        field: 'status',
        oldValue: currentTask.status,
        newValue: legacyStatus(nextStatusEnum),
      });
    }

    if (data.justification !== undefined) {
      pushChange(
        historyEntries,
        'justification',
        currentTask.justification ?? null,
        data.justification ?? null
      );
    }

    if (data.justificationType !== undefined) {
      pushChange(
        historyEntries,
        'justificationType',
        currentTask.justificationType ?? null,
        data.justificationType ?? null
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: currentTask.id },
        data: {
          title: data.title ?? currentTask.title,
          description: data.description !== undefined ? data.description : currentTask.description,
          assigneeId: data.assigneeId === undefined ? currentTask.assigneeId : data.assigneeId,
          parentTaskId:
            data.parentTaskId === undefined ? currentTask.parentTaskId : data.parentTaskId,
          dueDate: data.dueDate === undefined ? currentTask.dueDate : data.dueDate,
          priority: legacyPriority(nextPriorityEnum),
          priorityEnum: nextPriorityEnum,
          status: legacyStatus(nextStatusEnum),
          statusEnum: nextStatusEnum,
          completedAt:
            nextStatusEnum === 'DONE'
              ? currentTask.completedAt ?? new Date()
              : null,
          justification:
            data.justification === undefined ? currentTask.justification : data.justification,
          justificationType:
            data.justificationType === undefined
              ? currentTask.justificationType
              : data.justificationType,
          justificationTypeEnum: nextJustificationTypeEnum,
        },
      });

      if (historyEntries.length) {
        await createHistoryRows(tx, {
          taskId: task.id,
          changedById: user.id,
          entries: historyEntries,
        });
      }

      if (
        data.assigneeId !== undefined &&
        data.assigneeId !== null &&
        data.assigneeId !== currentTask.assigneeId
      ) {
        await createNotification(tx, {
          userId: data.assigneeId,
          title: 'Tarefa atribuída',
          message: `Você foi designado para a tarefa "${task.title}".`,
          type: 'TASK_ASSIGNED',
          link: `/tarefas/${task.id}`,
        });
      }

      return task;
    });

    // Notificação de edição (fora da transação)
    if (updated.assigneeId && historyEntries.length > 0) {
      const changedFields = historyEntries.map(entry => {
        switch (entry.field) {
          case 'title': return 'título';
          case 'description': return 'descrição';
          case 'dueDate': return 'prazo';
          case 'priority': return 'prioridade';
          case 'status': return 'status';
          case 'assigneeId': return 'responsável';
          default: return entry.field;
        }
      }).filter(f => f !== 'responsável');

      if (changedFields.length > 0) {
        await notifyTaskEdited(updated.id, updated.assigneeId, changedFields).catch(console.error);
      }
    }

    revalidatePath('/tarefas');
    revalidatePath(`/tarefas/${updated.id}`);
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Tarefa atualizada com sucesso.',
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
      message: error instanceof Error ? error.message : 'Erro ao atualizar tarefa.',
    };
  }
}

export async function updateTaskStatus(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // Apenas administradores podem alterar status
    if (user.role !== Role.ADMIN) {
      return {
        success: false,
        message: 'Apenas administradores podem alterar o status da tarefa.',
      };
    }

    const raw = toPlainObject(input);
    const data = changeStatusSchema.parse(raw);

    const currentTask = await ensureTaskAccess(user, data.taskId);
    const nextStatusEnum = normalizeStatusEnum(data.status);

    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: currentTask.id },
        data: {
          status: legacyStatus(nextStatusEnum),
          statusEnum: nextStatusEnum,
          completedAt: nextStatusEnum === 'DONE' ? new Date() : null,
        },
      });

      await createHistoryRows(tx, {
        taskId: task.id,
        changedById: user.id,
        entries: [
          {
            field: 'status',
            oldValue: currentTask.status,
            newValue: legacyStatus(nextStatusEnum),
          },
          {
            field: 'completedAt',
            oldValue: currentTask.completedAt ? currentTask.completedAt.toISOString() : null,
            newValue: task.completedAt ? task.completedAt.toISOString() : null,
          },
        ],
      });

      return task;
    });

    if (nextStatusEnum === 'DONE' && user.role !== Role.ADMIN) {
      const adminUsers = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
      if (adminUsers.length) {
        await notifyAdminTaskCompleted(updated.id, adminUsers.map(a => a.id)).catch(console.error);
      }
    }

    revalidatePath('/tarefas');
    revalidatePath(`/tarefas/${updated.id}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Status da tarefa atualizado com sucesso.',
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
      message: error instanceof Error ? error.message : 'Erro ao atualizar status da tarefa.',
    };
  }
}

export async function assignTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // Apenas administradores podem atribuir tarefas
    if (user.role !== Role.ADMIN) {
      return {
        success: false,
        message: 'Apenas administradores podem atribuir tarefas.',
      };
    }

    const raw = toPlainObject(input);
    const data = assignTaskSchema.parse(raw);

    const currentTask = await ensureTaskAccess(user, data.taskId);

    if (data.assigneeId !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { id: true },
      });

      if (!assignee) {
        throw new Error('Usuário responsável não encontrado.');
      }

      await ensureAssigneeIsProjectMember(currentTask.projectId, data.assigneeId);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: currentTask.id },
        data: {
          assigneeId: data.assigneeId,
        },
      });

      await createHistoryRows(tx, {
        taskId: task.id,
        changedById: user.id,
        entries: [
          {
            field: 'assigneeId',
            oldValue: currentTask.assigneeId ? String(currentTask.assigneeId) : null,
            newValue: data.assigneeId ? String(data.assigneeId) : null,
          },
        ],
      });

      if (data.assigneeId) {
        await createNotification(tx, {
          userId: data.assigneeId,
          title: 'Nova tarefa atribuída',
          message: `Você recebeu a tarefa "${task.title}".`,
          type: 'TASK_ASSIGNED',
          link: `/tarefas/${task.id}`,
        });
      }

      return task;
    });

    revalidatePath('/tarefas');
    revalidatePath(`/tarefas/${updated.id}`);
    revalidatePath('/projetos');

    return {
      success: true,
      message: 'Responsável da tarefa atualizado com sucesso.',
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
      message: error instanceof Error ? error.message : 'Erro ao atribuir tarefa.',
    };
  }
}

export async function completeTask(
  taskId: number,
  justification?: string,
  justificationType?: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // 🔹 Validação correta
    const raw = toPlainObject({ taskId, justification, justificationType });
    const parsed = completeTaskSchema.parse(raw);

    // 🔹 Buscar tarefa
    const currentTask = await ensureTaskAccess(user, parsed.taskId);

    // 🔒 Regra de negócio
    if (currentTask.assigneeId !== user.id) {
      return {
        success: false,
        message: 'Apenas o responsável pode concluir a tarefa.',
      };
    }

    // 🔒 Já concluída
    if (isTaskDone(currentTask.status)) {
      return {
        success: false,
        message: 'Esta tarefa já foi concluída.',
      };
    }

    const now = new Date();
    const isLate = !!currentTask.dueDate && currentTask.dueDate < now;

    const cleanJustification = parsed.justification?.trim() || null;
    const normalizedJustificationType = normalizeJustificationType(parsed.justificationType);

    // 🔒 Regra: tarefa atrasada exige justificativa
    if (isLate && !cleanJustification) {
      return {
        success: false,
        message: 'Tarefas atrasadas exigem uma justificativa.',
      };
    }

    if (parsed.justificationType && !normalizedJustificationType) {
      return {
        success: false,
        message: 'Tipo de justificativa inválido.',
      };
    }

    // 🚀 Transação
    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: currentTask.id },
        data: {
          status: 'done',
          statusEnum: 'DONE',
          completedAt: now,
          justification: cleanJustification ?? currentTask.justification,
          justificationType:
            normalizedJustificationType ?? currentTask.justificationType,
          justificationTypeEnum:
            normalizedJustificationType ?? currentTask.justificationTypeEnum,
        },
      });

      await createHistoryRows(tx, {
        taskId: task.id,
        changedById: user.id,
        entries: [
          {
            field: 'status',
            oldValue: currentTask.status,
            newValue: 'done',
            changeReason: isLate ? 'Task completed after due date.' : null,
          },
          {
            field: 'completedAt',
            oldValue: currentTask.completedAt
              ? currentTask.completedAt.toISOString()
              : null,
            newValue: task.completedAt
              ? task.completedAt.toISOString()
              : null,
            changeReason: isLate ? 'Task completed after due date.' : null,
          },
          ...(cleanJustification
            ? [
                {
                  field: 'justification',
                  oldValue: currentTask.justification ?? null,
                  newValue: cleanJustification,
                  changeReason: 'Task completion justification.',
                },
              ]
            : []),
          ...(normalizedJustificationType
            ? [
                {
                  field: 'justificationType',
                  oldValue: currentTask.justificationType ?? null,
                  newValue: normalizedJustificationType,
                  changeReason: 'Task completion justification type.',
                },
              ]
            : []),
        ],
      });

      return task;
    });

    // 🔔 Notificar admins
    if (user.role !== Role.ADMIN) {
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });

      if (admins.length) {
        await notifyAdminTaskCompleted(
          updated.id,
          admins.map((a) => a.id)
        ).catch(console.error);
      }
    }

    // 🔄 Revalidação
    revalidatePath('/tarefas');
    revalidatePath(`/tarefas/${updated.id}`);
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Tarefa concluída com sucesso.',
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
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao concluir tarefa.',
    };
  }
}

export async function createSubtask(parentTaskId: number, input: unknown): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // Apenas administradores podem criar subtarefas
    if (user.role !== Role.ADMIN) {
      return {
        success: false,
        message: 'Apenas administradores podem criar subtarefas.',
      };
    }

    const parentTask = await ensureTaskAccess(user, parentTaskId);

    const raw = toPlainObject(input);
    const parsed = createTaskSchema
      .omit({ projectId: true, parentTaskId: true })
      .parse(raw);

    return await createTask({
      ...parsed,
      projectId: parentTask.projectId,
      parentTaskId: parentTask.id,
    });
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
      message: error instanceof Error ? error.message : 'Erro ao criar subtarefa.',
    };
  }
}

export async function deleteTask(taskId: number): Promise<ActionResult> {
  try {
    const user = await getAuthUser();

    // Apenas administradores podem excluir tarefas
    if (user.role !== Role.ADMIN) {
      return {
        success: false,
        message: 'Apenas administradores podem excluir tarefas.',
      };
    }

    const task = await ensureTaskAccess(user, taskId);

    const subtasksCount = await prisma.task.count({
      where: { parentTaskId: task.id },
    });

    if (subtasksCount > 0) {
      throw new Error('Remova ou reatribua as subtarefas antes de excluir esta tarefa.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({
        where: { taskId: task.id },
      });

      await tx.timeEntry.deleteMany({
        where: { taskId: task.id },
      });

      await tx.taskLabel.deleteMany({
        where: { taskId: task.id },
      });

      await tx.taskHistory.deleteMany({
        where: { taskId: task.id },
      });

      await tx.task.delete({
        where: { id: task.id },
      });
    });

    revalidatePath('/tarefas');
    revalidatePath('/projetos');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Tarefa removida com sucesso.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao excluir tarefa.',
    };
  }
}

export async function deleteTaskFile(fileId: number) {
  try {
    const user = await getAuthUser();

    const file = await prisma.taskFile.findUnique({
      where: { id: fileId },
      include: { task: true },
    });

    if (!file) {
      return { success: false, message: "Arquivo não encontrado" };
    }

    // 🔒 só admin
    if (user.role !== "ADMIN") {
      return { success: false, message: "Sem permissão" };
    }

    // 🚫 não pode deletar se concluída
    if (file.task.status === "done") {
      return { success: false, message: "Tarefa já concluída" };
    }

    await prisma.taskFile.delete({
      where: { id: fileId },
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao deletar arquivo" };
  }
}