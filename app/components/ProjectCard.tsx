"use client";

import Link from "next/link";
import { FolderKanban, Users, Edit, Trash2, Eye } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    _count: { tasks: number };
    members: Array<{ user: { id: number; name: string | null } }>;
  };
  isAdmin: boolean;
  onDelete?: (id: number) => void;
}

export default function ProjectCard({ project, isAdmin, onDelete }: ProjectCardProps) {
  // Garantir valores padrão (fallback seguro)
  const members = project.members ?? [];
  const totalTasks = project._count?.tasks ?? 0;
  const progress = project.progress ?? 0;
  const status = project.status ?? "ativo";
  const name = project.name ?? "Sem nome";
  const description = project.description ?? "Sem descrição";

  const statusColor = {
    ativo: "border-green-500 text-green-400",
    concluido: "border-blue-500 text-blue-400",
    cancelado: "border-red-500 text-red-400",
  }[status] || "border-gray-500 text-gray-400";

  const statusLabel = {
    ativo: "Ativo",
    concluido: "Concluído",
    cancelado: "Cancelado",
  }[status] || status;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-500/0 to-purple-400/0 group-hover:from-purple-600/10 group-hover:via-purple-500/5 group-hover:to-purple-400/0 transition-all duration-500" />

      <div className="relative p-5">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-600/20">
              <FolderKanban className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white truncate max-w-[180px]">
              {name}
            </h3>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Descrição */}
        <p className="text-purple-200/70 text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Progresso */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-purple-200/80 mb-1">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-4 text-sm text-purple-200/70 mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{members.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <FolderKanban className="h-4 w-4" />
            <span>{totalTasks} tarefas</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 border-t border-purple-800/30 pt-3">
          <Link
            href={`/projetos/${project.id}`}
            className="p-1.5 rounded-lg text-purple-300 hover:bg-purple-600/20 transition-colors"
            title="Visualizar"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {isAdmin && (
            <>
              <Link
                href={`/projetos/editar/${project.id}`}
                className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() => onDelete?.(project.id)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}