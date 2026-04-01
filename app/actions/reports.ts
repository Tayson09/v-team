import { Role, TaskStatus } from '@prisma/client';

import { prisma } from '@/lib/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

export type ReportUser = {
  id: number;
  name: string | null;
  email: string;
  role: Role;
};

type NumericInput = number | null | undefined;

export type MemberMetrics = {
  tasksCompleted: number;
  completionRate: number;
  throughput: number;
  tasksCreated: number;
  lateRate: number;
  lateTasks: number;
  leadTimeHours: number | null;
  cycleTimeHours: number | null;
  hoursWorked: number;
  timeEfficiency: number | null;
  avgHoursPerTask: number | null;
  productivityPerHour: number | null;
  tasksInProgress: number;
  tasksBlocked: number;
  historyChanges: number;
  dailyConsistency: number;
  score: number;
};

export type MemberReport = {
  user: ReportUser;
  range: ReportRange;
  metrics: MemberMetrics;
};

export type TeamSummary = {
  memberCount: number;
  averageScore: number;
  averageCompletionRate: number;
  averageDailyConsistency: number;
  totalTasksCompleted: number;
  totalTasksCreated: number;
  totalLateTasks: number;
  totalHoursWorked: number;
};

export type TeamReport = {
  range: ReportRange;
  summary: TeamSummary;
  members: MemberReport[];
};

type ReportTask = {
  id: number;
  status: string | null;
  statusEnum: TaskStatus | null;
  createdAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  history: Array<{
    field: string;
    newValue: string | null;
    createdAt: Date;
  }>;
};

function toNumber(value: NumericInput, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: ReadonlyArray<NumericInput>): number | null {
  const filtered: number[] = values
    .map((value : any) => toNumber(value))
    .filter((value) => Number.isFinite(value));

  if (!filtered.length) return null;

  return round(filtered.reduce((acc, value) => acc + value, 0) / filtered.length, 2);
}

function sum(values: ReadonlyArray<NumericInput>): number {
  return values.reduce<number>((acc, value) => acc + toNumber(value), 0);
}

function isInRange(date: Date | null | undefined, range: ReportRange) {
  if (!date) return false;
  return date >= range.startDate && date <= range.endDate;
}

function normalizeStatusValue(value?: string | TaskStatus | null) {
  return (value ?? '').toString().trim().toUpperCase();
}

function isDoneTask(task: { status?: string | null; statusEnum?: TaskStatus | null }) {
  return normalizeStatusValue(task.statusEnum ?? task.status) === 'DONE';
}

function parseInputDate(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysInRange(range: ReportRange) {
  const start = startOfDay(range.startDate);
  const end = startOfDay(range.endDate);
  const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY_MS));
  return diff + 1;
}

export function resolveReportRange(input?: {
  period?: string | null;
  start?: string | null;
  end?: string | null;
}): ReportRange {
  const now = new Date();

  const start = parseInputDate(input?.start ?? null);
  const end = parseInputDate(input?.end ?? null);

  if (start && end) {
    const normalizedStart = start <= end ? startOfDay(start) : startOfDay(end);
    const normalizedEnd = start <= end ? endOfDay(end) : endOfDay(start);

    return {
      startDate: normalizedStart,
      endDate: normalizedEnd,
      label: `${normalizedStart.toLocaleDateString('pt-BR')} até ${normalizedEnd.toLocaleDateString('pt-BR')}`,
    };
  }

  const period = (input?.period ?? '30d').toLowerCase();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

  const endDate = endOfDay(now);
  const startDate = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));

  const label =
    period === '7d'
      ? 'Últimos 7 dias'
      : period === '90d'
        ? 'Últimos 90 dias'
        : 'Últimos 30 dias';

  return { startDate, endDate, label };
}

function buildMemberMetrics(
  assignedTasks: ReportTask[],
  tasksCreated: number,
  timeEntriesMinutes: number,
  dailiesCount: number,
  range: ReportRange
): MemberMetrics {
  const scopeTasks = assignedTasks.filter((task) => task.createdAt <= range.endDate);

  const completedTasksList = scopeTasks.filter(
    (task) => isDoneTask(task) && task.completedAt && isInRange(task.completedAt, range)
  );

  const tasksCompleted = completedTasksList.length;

  const lateTasks = completedTasksList.filter(
    (task) => task.dueDate && task.completedAt && task.completedAt > task.dueDate
  ).length;

  const totalScopeTasks = scopeTasks.length;
  const completionRate = totalScopeTasks > 0 ? round((tasksCompleted / totalScopeTasks) * 100, 2) : 0;
  const throughput = round(tasksCompleted / daysInRange(range), 2);

  const leadTimeHours = avg(
    completedTasksList.map((task : any) =>
      task.completedAt ? ((task.completedAt.getTime() - task.createdAt.getTime()) / DAY_MS) * 24 : null
    )
  );

  const cycleTimeHours = avg(
    completedTasksList.map((task) => {
      const inProgressHistory = task.history.find(
        (item) => item.field === 'status' && normalizeStatusValue(item.newValue) === 'IN_PROGRESS'
      );

      const cycleStart = inProgressHistory?.createdAt ?? task.createdAt;

      return task.completedAt ? ((task.completedAt.getTime() - cycleStart.getTime()) / DAY_MS) * 24 : null;
    })
  );

  const hoursWorked = round(toNumber(timeEntriesMinutes) / 60, 2);

  const estimatedHoursTotal = round(sum(completedTasksList.map((task : any) => task.estimatedHours)), 2);

  const actualHoursFromTasks = round(sum(completedTasksList.map((task : any) => task.actualHours)), 2);

  const actualHoursTotal = actualHoursFromTasks > 0 ? actualHoursFromTasks : hoursWorked;

  const timeEfficiency =
    estimatedHoursTotal > 0 && actualHoursTotal > 0
      ? round((estimatedHoursTotal / actualHoursTotal) * 100, 2)
      : null;

  const avgHoursPerTask = tasksCompleted > 0 ? round(actualHoursTotal / tasksCompleted, 2) : null;
  const productivityPerHour = actualHoursTotal > 0 ? round(tasksCompleted / actualHoursTotal, 2) : null;

  const tasksInProgress = scopeTasks.filter(
    (task) => normalizeStatusValue(task.statusEnum ?? task.status) === 'IN_PROGRESS'
  ).length;

  const tasksBlocked = scopeTasks.filter(
    (task) => normalizeStatusValue(task.statusEnum ?? task.status) === 'BLOCKED'
  ).length;

  const historyChanges = scopeTasks.reduce((acc: number, task) => {
    const changesInRange = task.history.filter(
      (entry) => entry.field !== 'created' && isInRange(entry.createdAt, range)
    ).length;

    return acc + changesInRange;
  }, 0);

  const dailyConsistency = daysInRange(range) > 0 ? round((dailiesCount / daysInRange(range)) * 100, 2) : 0;

  const punctualityScore = tasksCompleted > 0 ? clamp(100 - (lateTasks / tasksCompleted) * 100, 0, 100) : 0;

  const efficiencyScore = timeEfficiency !== null ? clamp(timeEfficiency, 0, 100) : 50;

  const flowScore = totalScopeTasks > 0 ? clamp(100 - (tasksBlocked / totalScopeTasks) * 100, 0, 100) : 100;

  const score = round(
    completionRate * 0.25 +
      punctualityScore * 0.25 +
      efficiencyScore * 0.2 +
      dailyConsistency * 0.15 +
      flowScore * 0.15,
    1
  );

  return {
    tasksCompleted,
    completionRate,
    throughput,
    tasksCreated,
    lateRate: tasksCompleted > 0 ? round((lateTasks / tasksCompleted) * 100, 2) : 0,
    lateTasks,
    leadTimeHours,
    cycleTimeHours,
    hoursWorked,
    timeEfficiency,
    avgHoursPerTask,
    productivityPerHour,
    tasksInProgress,
    tasksBlocked,
    historyChanges,
    dailyConsistency,
    score,
  };
}

async function buildMemberReportForUser(user: ReportUser, range: ReportRange): Promise<MemberReport> {
  const [assignedTasks, tasksCreated, timeEntries, dailies] = await Promise.all([
    prisma.task.findMany({
      where: {
        assigneeId: user.id,
      },
      select: {
        id: true,
        status: true,
        statusEnum: true,
        createdAt: true,
        completedAt: true,
        dueDate: true,
        estimatedHours: true,
        actualHours: true,
        history: {
          select: {
            field: true,
            newValue: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }),
    prisma.task.count({
      where: {
        createdById: user.id,
        createdAt: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      select: {
        minutes: true,
      },
    }),
    prisma.daily.count({
      where: {
        userId: user.id,
        date: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
    }),
  ]);

  const timeEntriesMinutes = timeEntries.reduce((acc, item) => acc + toNumber(item.minutes), 0);

  return {
    user,
    range,
    metrics: buildMemberMetrics(assignedTasks, tasksCreated, timeEntriesMinutes, dailies, range),
  };
}

export async function buildMemberReport(userId: number, range: ReportRange): Promise<MemberReport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  return buildMemberReportForUser(user, range);
}

export async function buildTeamReport(range: ReportRange): Promise<TeamReport> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [
      { role: 'asc' },
      { name: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  const members = await Promise.all(users.map((user : any) => buildMemberReportForUser(user, range)));

  members.sort((a, b) => {
    if (b.metrics.score !== a.metrics.score) return b.metrics.score - a.metrics.score;
    if (b.metrics.tasksCompleted !== a.metrics.tasksCompleted) {
      return b.metrics.tasksCompleted - a.metrics.tasksCompleted;
    }
    return (a.user.name ?? '').localeCompare(b.user.name ?? '');
  });

  const summary: TeamSummary = {
    memberCount: members.length,
    averageScore: avg(members.map((member  : any) => member.metrics.score)) ?? 0,
    averageCompletionRate: avg(members.map((member : any) => member.metrics.completionRate)) ?? 0,
    averageDailyConsistency: avg(members.map((member : any) => member.metrics.dailyConsistency)) ?? 0,
    totalTasksCompleted: sum(members.map((member : any) => member.metrics.tasksCompleted)),
    totalTasksCreated: sum(members.map((member : any) => member.metrics.tasksCreated)),
    totalLateTasks: sum(members.map((member : any) => member.metrics.lateTasks)),
    totalHoursWorked: round(sum(members.map((member : any) => member.metrics.hoursWorked)), 2),
  };

  return {
    range,
    summary,
    members,
  };
}

export const reportColumns = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'role', label: 'Tipo' },
  { key: 'score', label: 'Score' },
  { key: 'tasksCompleted', label: 'Tarefas concluídas' },
  { key: 'completionRate', label: 'Taxa de conclusão (%)' },
  { key: 'throughput', label: 'Throughput' },
  { key: 'tasksCreated', label: 'Tarefas criadas' },
  { key: 'lateRate', label: 'Taxa de atraso (%)' },
  { key: 'lateTasks', label: 'Tarefas atrasadas' },
  { key: 'leadTimeHours', label: 'Lead time (h)' },
  { key: 'cycleTimeHours', label: 'Cycle time (h)' },
  { key: 'hoursWorked', label: 'Horas trabalhadas' },
  { key: 'timeEfficiency', label: 'Eficiência de tempo (%)' },
  { key: 'avgHoursPerTask', label: 'Tempo médio por tarefa (h)' },
  { key: 'productivityPerHour', label: 'Produtividade por hora' },
  { key: 'tasksInProgress', label: 'Tarefas em andamento' },
  { key: 'tasksBlocked', label: 'Tarefas bloqueadas' },
  { key: 'historyChanges', label: 'Mudanças registradas' },
  { key: 'dailyConsistency', label: 'Consistência daily (%)' },
] as const;