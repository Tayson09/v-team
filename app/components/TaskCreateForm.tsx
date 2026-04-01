"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Flag, User } from "lucide-react";
import { createTask } from "../actions/tasks";

type ProjectOption = {
  id: number;
  name: string;
  members: {
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  }[];
};

type CreateTaskResult =
  | {
      success: true;
      message: string;
      data?: { id: number };
    }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[]>;
    };

export default function TaskCreateForm({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id?.toString() ?? ""
  );
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id.toString() === selectedProjectId);
  }, [projects, selectedProjectId]);

  const assignees = selectedProject?.members.map((member) => member.user) ?? [];

  useEffect(() => {
    setSelectedAssigneeId("");
  }, [selectedProjectId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      if (formData.get("assigneeId") === "") {
        formData.delete("assigneeId");
      }

      if (formData.get("dueDate") === "") {
        formData.delete("dueDate");
      }

      const result = (await createTask(formData)) as CreateTaskResult;

      if (!result.success) {
        throw new Error(result.message);
      }

      router.push(`/tarefas/${result.data?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tarefa.");
    } finally {
      setLoading(false);
    }
  };

  if (!projects.length) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-white">
        <h1 className="text-2xl font-bold">Nova tarefa</h1>
        <p className="mt-3 text-sm text-purple-200/80">
          Você ainda não tem acesso a nenhum projeto para criar tarefas.
        </p>
        <Link
          href="/projetos"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tarefas"
        className="inline-flex items-center gap-2 text-purple-300 transition hover:text-purple-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">Nova tarefa</h1>
        <p className="mt-2 text-sm text-purple-200/80">
          Preencha os dados abaixo para criar uma nova tarefa.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">
              Título
            </label>
            <input
              name="title"
              required
              minLength={3}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              placeholder="Ex.: Implementar login"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">
              Descrição
            </label>
            <textarea
              name="description"
              rows={4}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              placeholder="Detalhe o escopo da tarefa..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">
                Projeto
              </label>
              <select
                name="projectId"
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">
                Responsável
              </label>
              <select
                name="assigneeId"
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              >
                <option value="">Sem responsável</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">
                Prioridade
              </label>
              <select
                name="priority"
                defaultValue="MEDIUM"
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">
                Prazo
              </label>
              <input
                name="dueDate"
                type="datetime-local"
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Criar tarefa"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-sm text-purple-200/80">
        <h2 className="mb-3 text-lg font-semibold text-white">Regras rápidas</h2>
        <div className="space-y-2">
          <p className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            A prioridade é enviada em enum e normalizada no servidor.
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            O prazo é opcional.
          </p>
          <p className="flex items-center gap-2">
            <User className="h-4 w-4" />
            O responsável precisa pertencer ao projeto selecionado.
          </p>
        </div>
      </div>
    </div>
  );
}