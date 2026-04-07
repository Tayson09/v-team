import { prisma } from '@/lib/prisma';
import { notifyUser } from './index';
import { NotificationType } from '@prisma/client';

// ----------------------------------------------------------------------
// 1. Tarefa atribuída a um colaborador
// ----------------------------------------------------------------------
export async function notifyTaskAssigned(taskId: number, assigneeId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email) return;

  await notifyUser({
    userId: assigneeId,
    email: task.assignee.email,
    title: 'Nova tarefa atribuída',
    message: `Você recebeu a tarefa "${task.title}" no projeto ${task.project.name}.`,
    type: NotificationType.TASK_ASSIGNED,
    entityType: 'Task',
    entityId: taskId,
  });
}

// ----------------------------------------------------------------------
// 2. Tarefa com 2 dias para o prazo (não concluída)
// ----------------------------------------------------------------------
export async function notifyTaskDueInTwoDays(taskId: number, assigneeId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email || !task.dueDate) return;

  const dueDateFormatted = new Date(task.dueDate).toLocaleDateString('pt-BR');
  await notifyUser({
    userId: assigneeId,
    email: task.assignee.email,
    title: '⏰ Tarefa vence em 2 dias',
    message: `A tarefa "${task.title}" do projeto ${task.project.name} vence em 2 dias (${dueDateFormatted}).`,
    type: NotificationType.TASK_DUE,
    entityType: 'Task',
    entityId: taskId,
  });
}

// ----------------------------------------------------------------------
// 3. Tarefa no dia do prazo (não concluída)
// ----------------------------------------------------------------------
export async function notifyTaskDueToday(taskId: number, assigneeId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email || !task.dueDate) return;

  await notifyUser({
    userId: assigneeId,
    email: task.assignee.email,
    title: '⚠️ Tarefa vence hoje',
    message: `A tarefa "${task.title}" do projeto ${task.project.name} vence HOJE!`,
    type: NotificationType.TASK_DUE,
    entityType: 'Task',
    entityId: taskId,
  });
}

// ----------------------------------------------------------------------
// 4. Tarefa em atraso (para o colaborador)
// ----------------------------------------------------------------------
export async function notifyTaskOverdue(taskId: number, assigneeId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email || !task.dueDate) return;

  const dueDateFormatted = new Date(task.dueDate).toLocaleDateString('pt-BR');
  await notifyUser({
    userId: assigneeId,
    email: task.assignee.email,
    title: '🔴 Tarefa em atraso',
    message: `A tarefa "${task.title}" do projeto ${task.project.name} está atrasada (vencia em ${dueDateFormatted}).`,
    type: NotificationType.TASK_OVERDUE,
    entityType: 'Task',
    entityId: taskId,
  });
}

// ----------------------------------------------------------------------
// 5. Tarefa editada (apenas se campos relevantes forem alterados)
// ----------------------------------------------------------------------
export async function notifyTaskEdited(taskId: number, assigneeId: number, changedFields: string[]) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email) return;

  const fieldsText = changedFields.join(', ');
  await notifyUser({
    userId: assigneeId,
    email: task.assignee.email,
    title: '✏️ Tarefa editada',
    message: `A tarefa "${task.title}" foi alterada: ${fieldsText}.`,
    type: NotificationType.SYSTEM,
    entityType: 'Task',
    entityId: taskId,
  });
}

// ----------------------------------------------------------------------
// 6. [ADMIN] Tarefa concluída por um colaborador
// ----------------------------------------------------------------------
export async function notifyAdminTaskCompleted(taskId: number, adminIds: number[]) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email) return;

  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds }, role: 'ADMIN' },
  });

  for (const admin of admins) {
    if (!admin.email) continue;
    await notifyUser({
      userId: admin.id,
      email: admin.email,
      title: '✅ Tarefa concluída por colaborador',
      message: `${task.assignee.name} concluiu a tarefa "${task.title}" do projeto ${task.project.name}.`,
      type: NotificationType.SYSTEM,
      entityType: 'Task',
      entityId: taskId,
    });
  }
}

// ----------------------------------------------------------------------
// 7. [ADMIN] Tarefa atrasada por um colaborador
// ----------------------------------------------------------------------
export async function notifyAdminTaskOverdue(taskId: number, adminIds: number[]) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, project: true },
  });
  if (!task || !task.assignee?.email || !task.dueDate) return;

  const dueDateFormatted = new Date(task.dueDate).toLocaleDateString('pt-BR');
  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds }, role: 'ADMIN' },
  });

  for (const admin of admins) {
    if (!admin.email) continue;
    await notifyUser({
      userId: admin.id,
      email: admin.email,
      title: '⚠️ Tarefa atrasada por colaborador',
      message: `${task.assignee.name} está com a tarefa "${task.title}" atrasada (vencia em ${dueDateFormatted}).`,
      type: NotificationType.TASK_OVERDUE,
      entityType: 'Task',
      entityId: taskId,
    });
  }
}

// ----------------------------------------------------------------------
// Função auxiliar para o CRON: verificar todas as tarefas pendentes
// e disparar notificações de 2 dias, hoje e atraso (individuais + admin)
// ----------------------------------------------------------------------
export async function checkAllPendingTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inTwoDays = new Date(today);
  inTwoDays.setDate(today.getDate() + 2);

  const tasks = await prisma.task.findMany({
    where: {
      statusEnum: { notIn: ['DONE', 'CANCELED'] },
      dueDate: { not: null },
      assigneeId: { not: null },
    },
    include: { assignee: true },
  });

  // Coletar IDs dos admins uma vez
  const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  const adminIds = adminUsers.map(a => a.id);

  for (const task of tasks) {
    const dueDate = new Date(task.dueDate!);
    const isOverdue = dueDate < today;
    const isDueToday = dueDate.toDateString() === today.toDateString();
    const isDueInTwoDays = dueDate.toDateString() === inTwoDays.toDateString();

    if (isOverdue) {
      // Notificar colaborador
      await notifyTaskOverdue(task.id, task.assigneeId!);
      // Notificar admins
      if (adminIds.length) {
        await notifyAdminTaskOverdue(task.id, adminIds);
      }
    } else if (isDueToday) {
      await notifyTaskDueToday(task.id, task.assigneeId!);
    } else if (isDueInTwoDays) {
      await notifyTaskDueInTwoDays(task.id, task.assigneeId!);
    }
  }
}