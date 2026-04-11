"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import {
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { deleteTask } from "../actions/tasks";

// Tipo exato da tarefa com project e assignee incluídos
type TaskWithProjectAndAssignee = Prisma.TaskGetPayload<{
  include: {
    project: true;
    assignee: true;
  };
}>;

interface TaskCardProps {
  task: TaskWithProjectAndAssignee;
  isAdmin: boolean;
}

const priorityStyles = {
  baixa: {
    label: "Baixa",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    accent: "from-emerald-500/60 to-emerald-400/0",
    dot: "bg-emerald-400",
  },
  media: {
    label: "Média",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    accent: "from-amber-500/60 to-amber-400/0",
    dot: "bg-amber-400",
  },
  alta: {
    label: "Alta",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    accent: "from-rose-500/60 to-rose-400/0",
    dot: "bg-rose-400",
  },
  urgente: {
    label: "Urgente",
    chip: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
    accent: "from-fuchsia-500/60 to-fuchsia-400/0",
    dot: "bg-fuchsia-400",
  },
  low: {
    label: "Low",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    accent: "from-emerald-500/60 to-emerald-400/0",
    dot: "bg-emerald-400",
  },
  medium: {
    label: "Medium",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    accent: "from-amber-500/60 to-amber-400/0",
    dot: "bg-amber-400",
  },
  high: {
    label: "High",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    accent: "from-rose-500/60 to-rose-400/0",
    dot: "bg-rose-400",
  },
  urgent: {
    label: "Urgent",
    chip: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
    accent: "from-fuchsia-500/60 to-fuchsia-400/0",
    dot: "bg-fuchsia-400",
  },
} as const;

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
  blocked: "Bloqueada",
  canceled: "Cancelada",
};

const statusStyles: Record<
  string,
  {
    chip: string;
    dot: string;
  }
> = {
  pending: {
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    dot: "bg-amber-400",
  },
  in_progress: {
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    dot: "bg-sky-400",
  },
  done: {
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-400",
  },
  blocked: {
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    dot: "bg-rose-400",
  },
  canceled: {
    chip: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
    dot: "bg-zinc-400",
  },
};

function formatDate(date?: Date | string | null) {
  if (!date) return "Sem prazo";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function TaskCard({ task, isAdmin }: TaskCardProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLate =
    !!task.dueDate &&
    new Date(task.dueDate).getTime() < Date.now() &&
    task.status !== "done";

  const isCompleted = task.status === "done";

  const priorityKey = String(task.priority || "media").toLowerCase();
  const priority =
    priorityStyles[priorityKey as keyof typeof priorityStyles] ??
    priorityStyles.media;

  const statusLabel = statusLabels[task.status] ?? task.status;
  const statusStyle = statusStyles[task.status] ?? statusStyles.pending;

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteTask(task.id);

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message);
      }
    } catch {
      alert("Erro ao excluir tarefa.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const stopCardNavigation = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <article className="group relative h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-400/30 hover:shadow-[0_18px_45px_rgba(124,58,237,0.14)]">
        {/* faixa superior */}
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${priority.accent}`}
        />

        {/* brilho suave no hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-purple-500/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* ações de admin */}
        {isAdmin && (
          <div className="absolute right-3 top-3 z-20">
            {!showDeleteConfirm ? (
              <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-zinc-950/85 p-1.5 shadow-lg backdrop-blur-md">
                <Link
                  href={`/tarefas/editar/${task.id}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200 transition hover:bg-sky-500/25 hover:text-white"
                  title="Editar tarefa"
                  aria-label="Editar tarefa"
                >
                  <Pencil size={15} />
                </Link>

                <button
                  type="button"
                  onClick={(e) => {
                    stopCardNavigation(e);
                    setShowDeleteConfirm(true);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200 transition hover:bg-rose-500/25 hover:text-white"
                  title="Excluir tarefa"
                  aria-label="Excluir tarefa"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-zinc-950/90 px-3 py-2 shadow-lg backdrop-blur-md">
                <span className="text-xs font-medium text-white">Excluir?</span>

                <button
                  type="button"
                  onClick={(e) => {
                    stopCardNavigation(e);
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "..." : "Sim"}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    stopCardNavigation(e);
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/15"
                >
                  Não
                </button>
              </div>
            )}
          </div>
        )}

        {/* link principal do card */}
        <Link
          href={`/tarefas/${task.id}`}
          className="relative z-10 block h-full outline-none"
        >
          <div className="relative flex h-full flex-col p-5">
            {/* cabeçalho */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${priority.dot}`} />
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${priority.chip}`}
                  >
                    {priority.label}
                  </span>
                </div>

                <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-white transition-colors group-hover:text-purple-100">
                  {task.title}
                </h3>
              </div>

              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyle.chip}`}
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                />
                {statusLabel}
              </span>
            </div>

            {/* descrição */}
            <p className="mb-4 line-clamp-3 text-sm leading-6 text-zinc-300/80">
              {task.description || "Sem descrição"}
            </p>

            {/* metadados */}
            <div className="grid gap-2 text-sm text-zinc-300/85">
              {task.project && (
                <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <span className="text-base">📁</span>
                  <span className="truncate">
                    <span className="text-zinc-400">Projeto:</span>{" "}
                    {task.project.name}
                  </span>
                </div>
              )}

              {task.assignee && (
                <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span className="truncate">
                    <span className="text-zinc-400">Responsável:</span>{" "}
                    {task.assignee.name || task.assignee.email}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-400">Prazo:</span>
                  <span>{formatDate(task.dueDate)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isLate && !isCompleted && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Atrasada
                    </span>
                  )}

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Concluída
                    </span>
                  )}

                  {!isLate && !isCompleted && task.status === "in_progress" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-200">
                      <Clock className="h-3.5 w-3.5" />
                      Em andamento
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* rodapé */}
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-zinc-400">
                Clique para abrir os detalhes
              </span>

              <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-300 transition-transform duration-300 group-hover:translate-x-0.5">
                Ver tarefa
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}