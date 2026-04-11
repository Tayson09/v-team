"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTask } from "../../../../actions/tasks";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

type TaskData = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: number | null;
  parentTaskId: number | null;
  justification: string | null;
  justificationType: string | null;
};

type Member = { id: number; name: string };
type ParentTask = { id: number; title: string };

export default function EditTaskForm({
  task,
  projectMembers,
  availableParentTasks,
}: {
  task: TaskData;
  projectMembers: Member[];
  availableParentTasks: ParentTask[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    // Garantir que o ID está presente
    formData.append("id", task.id.toString());

    const result = await updateTask(formData);

    if (result.success) {
      router.push(`/tarefas/${task.id}`);
      router.refresh();
    } else {
      if (result.errors) {
        console.log(result.errors); // 👈 DEBUG
        setError(JSON.stringify(result.errors, null, 2));
      } else {
        setError(result.message);
      }
    }
    setIsLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1">
          Título *
        </label>
        <input
          type="text"
          name="title"
          defaultValue={task.title}
          required
          minLength={3}
          className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1">
          Descrição
        </label>
        <textarea
          name="description"
          defaultValue={task.description || ""}
          rows={4}
          className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1">
            Status
          </label>
          <select
            name="status"
            defaultValue={task.status}
            className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {Object.values(TaskStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Prioridade */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1">
            Prioridade
          </label>
          <select
            name="priority"
            defaultValue={task.priority}
            className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1">
            Prazo
          </label>
          <input
            type="date"
            name="dueDate"
            defaultValue={formatDateForInput(task.dueDate)}
            className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1">
            Responsável
          </label>
          <select
            name="assigneeId"
            defaultValue={task.assigneeId?.toString() || ""}
            className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Nenhum</option>
            {projectMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tarefa Pai */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-purple-200 mb-1">
            Tarefa Pai (Subtarefa de)
          </label>
          <select
            name="parentTaskId"
            defaultValue={task.parentTaskId?.toString() || ""}
            className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Nenhuma</option>
            {availableParentTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Justificativa */}
      <div className="border-t border-purple-500/20 pt-4">
        <h3 className="text-lg font-medium text-white mb-3">
          Justificativa (se necessário)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">
              Tipo de Justificativa
            </label>
            <select
              name="justificationType"
              defaultValue={task.justificationType || ""}
              className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Nenhum</option>
              <option value="DELAY">Atraso</option>
              <option value="BLOCKER">Bloqueio</option>
              <option value="SCOPE_CHANGE">Mudança de Escopo</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-purple-200 mb-1">
              Justificativa
            </label>
            <textarea
              name="justification"
              defaultValue={task.justification || ""}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {isLoading ? "Salvando..." : "Salvar Alterações"}
        </button>
        <Link
          href={`/tarefas/${task.id}`}
          className="inline-flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          Cancelar
        </Link>
      </div>
    </form>
  );
}