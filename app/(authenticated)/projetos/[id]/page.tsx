import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getProjectForView } from "../../../actions/projects";
import { ArrowLeft, Users, FolderKanban, CheckCircle, Clock, Edit } from "lucide-react";
import Link from "next/link";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

   const { id } = await params;
    const projectId = parseInt(id, 10);
    
    if (isNaN(projectId)) {
      notFound();
    }

    const project = await getProjectForView(projectId);
    if (!project) {
      notFound();
    }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">Projeto não encontrado ou você não tem permissão para visualizá-lo.</p>
        <Link href="/projetos" className="text-purple-400 hover:underline mt-4 inline-block">
          Voltar para projetos
        </Link>
      </div>
    );
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const totalTasks = project._count.tasks;
  const completedTasks = project.tasks.filter((t: any) => t.status === "completed").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusColor = {
    ativo: "bg-green-500/20 text-green-400 border-green-500",
    concluido: "bg-blue-500/20 text-blue-400 border-blue-500",
    cancelado: "bg-red-500/20 text-red-400 border-red-500",
  }[project.status as keyof typeof statusColorMap] || "bg-gray-500/20 text-gray-400 border-gray-500";

  const statusColorMap = {
    ativo: "bg-green-500/20 text-green-400 border-green-500",
    concluido: "bg-blue-500/20 text-blue-400 border-blue-500",
    cancelado: "bg-red-500/20 text-red-400 border-red-500",
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Botão voltar */}
      <Link
        href="/projetos"
        className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos os projetos
      </Link>

      {/* Cabeçalho do projeto */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                {project.status === "ativo" ? "Ativo" : project.status === "concluido" ? "Concluído" : "Cancelado"}
              </span>
            </div>
            <p className="text-purple-200/80 max-w-2xl">{project.description || "Sem descrição"}</p>
          </div>
          {isAdmin && (
            <Link
              href={`/projetos/editar/${project.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl text-purple-300 transition"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Link>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FolderKanban} label="Total de Tarefas" value={totalTasks} color="purple" />
        <MetricCard icon={CheckCircle} label="Concluídas" value={completedTasks} color="green" />
        <MetricCard icon={Clock} label="Em Andamento" value={totalTasks - completedTasks} color="yellow" />
        <MetricCard icon={Users} label="Membros" value={project.members.length} color="purple" />
      </div>

      {/* Barra de progresso */}
      <div className="rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 p-5">
        <div className="flex justify-between text-sm text-purple-200/80 mb-2">
          <span>Progresso do Projeto</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Membros da equipe */}
      <div className="rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 p-5">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-400" />
          Membros da Equipe
        </h2>
        <div className="flex flex-wrap gap-2">
          {project.members.map((member: any) => (
            <div key={member.user.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-800/30 border border-purple-500/30">
              <span className="text-sm text-white">{member.user.name || member.user.email}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tarefas recentes */}
      <div className="rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 p-5">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-purple-400" />
          Tarefas Recentes
        </h2>
        {project.tasks.length === 0 ? (
          <p className="text-purple-200/70">Nenhuma tarefa associada a este projeto.</p>
        ) : (
          <div className="space-y-3">
            {project.tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-800/10 border border-purple-500/20">
                <div>
                  <p className="text-white font-medium">{task.title}</p>
                  <p className="text-xs text-purple-200/60">
                    {task.assignee ? `Responsável: ${task.assignee.nome || task.assignee.email}` : "Sem responsável"}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  task.status === "completed" ? "border-green-500 text-green-300" :
                  task.status === "in_progress" ? "border-blue-500 text-blue-300" :
                  task.status === "blocked" ? "border-red-500 text-red-300" :
                  "border-yellow-500 text-yellow-300"
                }`}>
                  {task.status === "pending" ? "Pendente" :
                   task.status === "in_progress" ? "Em andamento" :
                   task.status === "completed" ? "Concluída" : "Bloqueada"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorClasses = {
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    green: "from-green-500/20 to-green-600/10 border-green-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
  }[color];

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${colorClasses} backdrop-blur-sm border p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-purple-200/80 text-sm">{label}</p>
        </div>
        <Icon className="h-6 w-6 text-purple-300" />
      </div>
    </div>
  );
}

function notFound() {
  throw new Error("Function not implemented.");
}
