"use client";

import Link from "next/link";
import { Calendar, Flag, User, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    dueDate: Date | null;
    project: { id: number; name: string } | null;
    assignee: { id: number; name: string | null; email: string } | null;
  };
  isAdmin: boolean;
}

export default function TaskCard({ task, isAdmin }: TaskCardProps) {
  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
  const isCompleted = task.status === "completed";

  // Cores e ícones por prioridade
  const priorityConfig = {
    baixa: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: "🔽" },
    media: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: "▶" },
    alta: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: "🔺" },
  } as const;
  const priorityKey = task.priority.toLowerCase() as keyof typeof priorityConfig;
  const priorityStyle = priorityConfig[priorityKey] || priorityConfig.media;

  // Status em português
  const statusLabel = {
    pending: "Pendente",
    in_progress: "Em andamento",
    completed: "Concluída",
    blocked: "Bloqueada",
  }[task.status] || task.status;

  return (
    <Link
      href={`/tarefas/${task.id}`}
      className="group block relative overflow-hidden rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-500/0 to-purple-400/0 group-hover:from-purple-600/10 group-hover:via-purple-500/5 group-hover:to-purple-400/0 transition-all duration-500" />

      <div className="relative p-5">
        {/* Cabeçalho com título e prioridade */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white truncate max-w-[200px]">
            {task.title}
          </h3>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.color} ${priorityStyle.bg} border ${priorityStyle.border}`}>
            {priorityStyle.icon} {task.priority}
          </div>
        </div>

        {/* Descrição (curta) */}
        <p className="text-purple-200/70 text-sm mb-3 line-clamp-2">
          {task.description || "Sem descrição"}
        </p>

        {/* Métricas */}
        <div className="space-y-2 text-sm">
          {task.project && (
            <div className="flex items-center gap-2 text-purple-200/80">
              <span className="text-xs">📁</span>
              <span className="truncate">{task.project.name}</span>
            </div>
          )}

          {task.assignee && (
            <div className="flex items-center gap-2 text-purple-200/80">
              <User className="h-3 w-3" />
              <span>{task.assignee.name || task.assignee.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-200/80">
              <Calendar className="h-3 w-3" />
              <span>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("pt-BR")
                  : "Sem prazo"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isLate && !isCompleted && (
                <span className="flex items-center gap-1 text-red-400 text-xs">
                  <AlertCircle className="h-3 w-3" /> Atrasada
                </span>
              )}
              {isCompleted && (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <CheckCircle className="h-3 w-3" /> Concluída
                </span>
              )}
              {!isLate && !isCompleted && task.status === "in_progress" && (
                <span className="flex items-center gap-1 text-blue-400 text-xs">
                  <Clock className="h-3 w-3" /> Em andamento
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status visual no canto inferior direito */}
        <div className="absolute bottom-3 right-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              task.status === "completed"
                ? "border-green-500 text-green-300 bg-green-500/10"
                : task.status === "in_progress"
                ? "border-blue-500 text-blue-300 bg-blue-500/10"
                : task.status === "blocked"
                ? "border-red-500 text-red-300 bg-red-500/10"
                : "border-yellow-500 text-yellow-300 bg-yellow-500/10"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}