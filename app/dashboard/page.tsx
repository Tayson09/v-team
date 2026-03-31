import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Users,
  Briefcase,
} from 'lucide-react';
import DashboardTasksChart from './dashboard-tasks-chart';
import './dashboard.css'; // Estilos customizados

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  const userId = parseInt((session.user as any).id, 10);
  const userRole = (session.user as any).role as string;
  const isAdmin = userRole === 'ADMIN';

  // Escopo para tarefas (admin vê tudo, colaborador vê apenas as suas)
  const taskScope = isAdmin ? {} : { assigneeId: userId };

  // ========== Métricas do usuário logado ==========
  const totalTasks = await prisma.task.count({ where: taskScope });
  const pendingTasks = await prisma.task.count({
    where: { ...taskScope, status: { in: ['pending', 'in_progress'] } },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const completedThisMonth = await prisma.task.count({
    where: { ...taskScope, status: 'completed', updatedAt: { gte: startOfMonth } },
  });

  const overdueTasks = await prisma.task.count({
    where: { ...taskScope, status: { not: 'completed' }, dueDate: { lt: new Date() } },
  });

  // ========== Métricas exclusivas para admin ==========
  let teamMetrics = null;
  if (isAdmin) {
    const totalMembers = await prisma.user.count();
    const teamCompletedThisMonth = await prisma.task.count({
      where: {
        status: 'completed',
        updatedAt: { gte: startOfMonth },
      },
    });
    const teamPendingTasks = await prisma.task.count({
      where: { status: { in: ['pending', 'in_progress'] } },
    });
    teamMetrics = { totalMembers, teamCompletedThisMonth, teamPendingTasks };
  }

  // ========== Próximas reuniões ==========
  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      participants: { some: { userId } },
      date: { gte: new Date() },
    },
    orderBy: { date: 'asc' },
    take: 5,
    include: {
      participants: { include: { user: true } },
    },
  });

  // ========== Tarefas recentes ==========
  const recentTasks = await prisma.task.findMany({
    where: taskScope,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { project: true, assignee: true },
  });

  // ========== Dados para gráfico (últimos 7 dias) ==========
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  }).reverse();

  const tasksPerDay = await Promise.all(
    last7Days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const count = await prisma.task.count({
        where: {
          ...taskScope,
          createdAt: { gte: day, lt: nextDay },
        },
      });
      return {
        date: day.toLocaleDateString('pt-BR', { weekday: 'short' }),
        tasks: count,
      };
    })
  );

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* Cabeçalho com gradiente no título */}
      <div>
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">
          {isAdmin
            ? 'Visão geral da equipe e indicadores de produtividade'
            : 'Acompanhe suas tarefas e atividades'}
        </p>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card metric-card">
          <div className="metric-icon">
            <ListTodo className="h-6 w-6" />
          </div>
          <div className="metric-value">{totalTasks}</div>
          <div className="metric-label">Total de Tarefas</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon">
            <Clock className="h-6 w-6" />
          </div>
          <div className="metric-value">{pendingTasks}</div>
          <div className="metric-label">Pendentes</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="metric-value">{completedThisMonth}</div>
          <div className="metric-label">Concluídas no Mês</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="metric-value text-red-400">{overdueTasks}</div>
          <div className="metric-label">Atrasadas</div>
        </div>
      </div>

      {/* Cards de métricas da equipe (somente admin) */}
      {isAdmin && teamMetrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-card metric-card">
            <div className="metric-icon">
              <Users className="h-6 w-6" />
            </div>
            <div className="metric-value">{teamMetrics.totalMembers}</div>
            <div className="metric-label">Membros da Equipe</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-icon">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="metric-value">{teamMetrics.teamCompletedThisMonth}</div>
            <div className="metric-label">Concluídas (Equipe)</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-icon">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="metric-value">{teamMetrics.teamPendingTasks}</div>
            <div className="metric-label">Pendentes (Equipe)</div>
          </div>
        </div>
      )}

      {/* Gráfico e próximas reuniões */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="glass-card col-span-4 p-4">
          <h2 className="text-xl font-semibold text-white mb-4">Tarefas por Dia (últimos 7 dias)</h2>
          <DashboardTasksChart data={tasksPerDay} />
        </div>

        <div className="glass-card col-span-3 p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-purple-300" />
            <h2 className="text-xl font-semibold text-white">Próximas Reuniões</h2>
          </div>
          {upcomingMeetings.length === 0 ? (
            <p className="text-purple-200/70">Nenhuma reunião agendada</p>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="meeting-item">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                        <span className="text-purple-300 font-bold">
                          {meeting.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{meeting.title}</p>
                      <p className="text-xs text-purple-200/80">
                        {new Date(meeting.date).toLocaleDateString('pt-BR')} •{' '}
                        {new Date(meeting.date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <div className="flex -space-x-1 mt-1">
                        {meeting.participants.slice(0, 3).map((p) => (
                          <div
                            key={p.user.id}
                            className="w-6 h-6 rounded-full bg-purple-600/40 border-2 border-purple-800/50 flex items-center justify-center"
                          >
                            <span className="text-xs text-white">
                              {p.user.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        ))}
                        {meeting.participants.length > 3 && (
                          <span className="ml-1 h-6 px-1 text-xs bg-purple-600/40 rounded-full flex items-center text-white">
                            +{meeting.participants.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tarefas Recentes */}
      <div className="glass-card p-4">
        <h2 className="text-xl font-semibold text-white mb-4">Tarefas Recentes</h2>
        {recentTasks.length === 0 ? (
          <p className="text-purple-200/70">Nenhuma tarefa registrada</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="task-item flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-green-500'
                      : task.status === 'in_progress'
                      ? 'bg-blue-500'
                      : task.status === 'blocked'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{task.title}</p>
                  <div className="flex gap-2 text-xs text-purple-200/80">
                    {task.project && <span>{task.project.name}</span>}
                    {task.assignee && (
                      <span>• {task.assignee.name || task.assignee.email}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    task.status === 'completed'
                      ? 'border-green-500 text-green-300'
                      : task.status === 'in_progress'
                      ? 'border-blue-500 text-blue-300'
                      : task.status === 'blocked'
                      ? 'border-red-500 text-red-300'
                      : 'border-yellow-500 text-yellow-300'
                  }`}
                >
                  {task.status === 'pending'
                    ? 'Pendente'
                    : task.status === 'in_progress'
                    ? 'Em andamento'
                    : task.status === 'completed'
                    ? 'Concluída'
                    : 'Bloqueada'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}