import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { getTaskById } from "../../../actions/tasks";
import { Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DeleteTaskButton from "./DeleteTaskButton";
import { Prisma } from "@prisma/client";

// Tipo exato da tarefa retornada por getTaskById
type TaskWithDetails = Prisma.TaskGetPayload<{
  include: {
    project: {
      select: {
        id: true;
        name: true;
        status: true;
        statusEnum: true;
        progress: true;
      };
    };
    assignee: {
      select: { id: true; name: true; email: true };
    };
    createdBy: {
      select: { id: true; name: true; email: true };
    };
    history: {
      orderBy: { createdAt: "desc" };
    };
  };
}>;

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const taskId = parseInt(params.id);
  if (isNaN(taskId)) notFound();

  const result = await getTaskById(taskId);
  if (!result.success || !result.data) notFound();

  const task = result.data as TaskWithDetails;
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const dueDateFormatted = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("pt-BR")
    : "Sem prazo";
  const createdAtFormatted = new Date(task.createdAt).toLocaleDateString("pt-BR");

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho com navegação e ações */}
      <div className="flex items-center justify-between">
        <Link
          href="/tarefas"
          className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para lista
        </Link>

        {/* Ações exclusivas para admin */}
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/tarefas/editar/${task.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              <Pencil size={18} />
              Editar
            </Link>
            <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
          </div>
        )}
      </div>

      {/* Card principal da tarefa */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{task.title}</h1>
            <p className="text-purple-200/80 mt-1">
              Projeto:{" "}
              <Link
                href={`/projetos/${task.project.id}`}
                className="hover:underline"
              >
                {task.project.name}
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-purple-300">Status:</span>{" "}
              <span className="font-medium text-white">{task.status}</span>
            </div>
            <div>
              <span className="text-purple-300">Prioridade:</span>{" "}
              <span className="font-medium text-white">{task.priority}</span>
            </div>
            <div>
              <span className="text-purple-300">Responsável:</span>{" "}
              <span className="font-medium text-white">
                {task.assignee?.name || "Não atribuído"}
              </span>
            </div>
            <div>
              <span className="text-purple-300">Criado por:</span>{" "}
              <span className="font-medium text-white">
                {task.createdBy?.name || "—"}
              </span>
            </div>
            <div>
              <span className="text-purple-300">Prazo:</span>{" "}
              <span className="font-medium text-white">{dueDateFormatted}</span>
            </div>
            <div>
              <span className="text-purple-300">Criado em:</span>{" "}
              <span className="font-medium text-white">{createdAtFormatted}</span>
            </div>
          </div>

          {task.description && (
            <div className="pt-4 border-t border-purple-500/20">
              <h2 className="text-lg font-semibold text-white mb-2">Descrição</h2>
              <p className="text-purple-100 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {task.justification && (
            <div className="pt-4 border-t border-purple-500/20">
              <h2 className="text-lg font-semibold text-white mb-2">
                Justificativa
              </h2>
              <p className="text-purple-100">{task.justification}</p>
              {task.justificationType && (
                <p className="text-sm text-purple-300 mt-1">
                  Tipo: {task.justificationType}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Histórico de alterações */}
      {task.history.length > 0 && (
        <div className="rounded-xl bg-gray-900/50 border border-purple-500/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Histórico de alterações
          </h2>
          <div className="space-y-3">
            {task.history.map((entry) => (
              <div
                key={entry.id}
                className="text-sm border-b border-gray-800 pb-2 last:border-0"
              >
                <p className="text-purple-300">
                  <span className="font-medium text-white">{entry.field}</span>{" "}
                  alterado de{" "}
                  <span className="text-red-300">
                    {entry.oldValue || "vazio"}
                  </span>{" "}
                  para{" "}
                  <span className="text-green-300">
                    {entry.newValue || "vazio"}
                  </span>
                </p>
                <p className="text-gray-500 text-xs">
                  {new Date(entry.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}