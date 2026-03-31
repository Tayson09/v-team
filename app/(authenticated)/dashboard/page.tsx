import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Users,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";
import DashboardTasksChart from "./dashboard-tasks-chart";
import "./dashboard.css";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = parseInt((session.user as any).id, 10);
  const userRole = (session.user as any).role as string;
  const isAdmin = userRole === "ADMIN";

  const taskScope = isAdmin ? {} : { assigneeId: userId };

  // Métricas do usuário
  const totalTasks = await prisma.task.count({ where: taskScope });
  const pendingTasks = await prisma.task.count({
    where: { ...taskScope, status: { in: ["pending", "in_progress"] } },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const completedThisMonth = await prisma.task.count({
    where: { ...taskScope, status: "completed", updatedAt: { gte: startOfMonth } },
  });

  const overdueTasks = await prisma.task.count({
    where: { ...taskScope, status: { not: "completed" }, dueDate: { lt: new Date() } },
  });

  // Métricas da equipe (admin)
  let teamMetrics = null;
  if (isAdmin) {
    const totalMembers = await prisma.user.count();
    const teamCompletedThisMonth = await prisma.task.count({
      where: { status: "completed", updatedAt: { gte: startOfMonth } },
    });
    const teamPendingTasks = await prisma.task.count({
      where: { status: { in: ["pending", "in_progress"] } },
    });
    teamMetrics = { totalMembers, teamCompletedThisMonth, teamPendingTasks };
  }

  // Próximas reuniões
  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      participants: { some: { userId } },
      date: { gte: new Date() },
    },
    orderBy: { date: "asc" },
    take: 5,
    include: {
      participants: { include: { user: true } },
    },
  });

  // Tarefas recentes
  const recentTasks = await prisma.task.findMany({
    where: taskScope,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { project: true, assignee: true },
  });

  // Dados do gráfico (últimos 7 dias)
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
        date: day.toLocaleDateString("pt-BR", { weekday: "short" }),
        tasks: count,
      };
    })
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Cabeçalho com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-purple-200/80 mt-2">
          {isAdmin
            ? "Visão geral da equipe e indicadores de produtividade"
            : "Acompanhe suas tarefas e atividades"}
        </p>
      </div>

      {/* Cards principais */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={ListTodo}
          value={totalTasks}
          label="Total de Tarefas"
          color="purple"
        />
        <MetricCard
          icon={Clock}
          value={pendingTasks}
          label="Pendentes"
          color="yellow"
        />
        <MetricCard
          icon={CheckCircle2}
          value={completedThisMonth}
          label="Concluídas no Mês"
          color="green"
        />
        <MetricCard
          icon={TrendingUp}
          value={overdueTasks}
          label="Atrasadas"
          color="red"
          isWarning
        />
      </div>

      {/* Cards da equipe (admin) */}
      {isAdmin && teamMetrics && (
        <div className="grid gap-5 sm:grid-cols-3">
          <MetricCard
            icon={Users}
            value={teamMetrics.totalMembers}
            label="Membros da Equipe"
            color="purple"
          />
          <MetricCard
            icon={CheckCircle2}
            value={teamMetrics.teamCompletedThisMonth}
            label="Concluídas (Equipe)"
            color="green"
          />
          <MetricCard
            icon={Briefcase}
            value={teamMetrics.teamPendingTasks}
            label="Pendentes (Equipe)"
            color="yellow"
          />
        </div>
      )}

      {/* Gráfico + Próximas Reuniões */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="p-4 h-full">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Tarefas por Dia (últimos 7 dias)
            </h2>
            <DashboardTasksChart data={tasksPerDay} />
          </GlassCard>
        </div>

        <div>
          <GlassCard className="p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-purple-400" />
                Próximas Reuniões
              </h2>
              <button className="text-purple-300 text-sm hover:text-purple-200 transition flex items-center gap-1">
                Ver todas <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            {upcomingMeetings.length === 0 ? (
              <p className="text-purple-200/70 text-center py-8">Nenhuma reunião agendada</p>
            ) : (
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="border-b border-purple-800/30 pb-3 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-300 font-bold">
                          {meeting.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{meeting.title}</p>
                        <p className="text-xs text-purple-200/80 mt-0.5">
                          {new Date(meeting.date).toLocaleDateString("pt-BR")} •{" "}
                          {new Date(meeting.date).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="flex -space-x-1 mt-2">
                          {meeting.participants.slice(0, 3).map((p) => (
                            <div
                              key={p.user.id}
                              className="w-6 h-6 rounded-full bg-purple-600/40 border border-purple-800/50 flex items-center justify-center"
                              title={p.user.name || p.user.email}
                            >
                              <span className="text-xs text-white">
                                {p.user.name?.charAt(0).toUpperCase() || "U"}
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
          </GlassCard>
        </div>
      </div>

      {/* Tarefas Recentes */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-purple-400" />
            Tarefas Recentes
          </h2>
          <button className="text-purple-300 text-sm hover:text-purple-200 transition flex items-center gap-1">
            Ver todas <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        {recentTasks.length === 0 ? (
          <p className="text-purple-200/70 text-center py-8">Nenhuma tarefa registrada</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-800/20 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    task.status === "completed"
                      ? "bg-green-500"
                      : task.status === "in_progress"
                      ? "bg-blue-500"
                      : task.status === "blocked"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.title}</p>
                  <div className="flex gap-2 text-xs text-purple-200/80">
                    {task.project && <span>{task.project.name}</span>}
                    {task.assignee && (
                      <span>• {task.assignee.name || task.assignee.email}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    task.status === "completed"
                      ? "border-green-500 text-green-300"
                      : task.status === "in_progress"
                      ? "border-blue-500 text-blue-300"
                      : task.status === "blocked"
                      ? "border-red-500 text-red-300"
                      : "border-yellow-500 text-yellow-300"
                  }`}
                >
                  {task.status === "pending"
                    ? "Pendente"
                    : task.status === "in_progress"
                    ? "Em andamento"
                    : task.status === "completed"
                    ? "Concluída"
                    : "Bloqueada"}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// Componente auxiliar para os cards
function MetricCard({
  icon: Icon,
  value,
  label,
  color,
  isWarning = false,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: "purple" | "yellow" | "green" | "red";
  isWarning?: boolean;
}) {
  const colorClasses = {
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    green: "from-green-500/20 to-green-600/10 border-green-500/30",
    red: "from-red-500/20 to-red-600/10 border-red-500/30",
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm
        border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group
      `}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-3xl font-bold text-white ${isWarning ? "text-red-400" : ""}`}>
            {value}
          </p>
          <p className="text-purple-200/80 text-sm mt-1">{label}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
          <Icon className={`h-5 w-5 ${isWarning ? "text-red-400" : "text-purple-300"}`} />
        </div>
      </div>
      <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
    </div>
  );
}

// Componente GlassCard reutilizável
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 ${className}`}>
      {children}
    </div>
  );
}