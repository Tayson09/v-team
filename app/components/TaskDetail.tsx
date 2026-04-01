"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeTask } from "../actions/tasks";
import { ArrowLeft, Calendar, Flag, User } from "lucide-react";
import Link from "next/link";

export default function TaskDetail({ task, isAdmin, isOwner }) {
  const router = useRouter();
  const [justification, setJustification] = useState("");
  const [justificationType, setJustificationType] = useState("plausible");
  const [loading, setLoading] = useState(false);

  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
  const showJustification = isLate && task.status !== "completed" && isOwner;

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeTask(task.id, justification, justificationType);
      router.push("/tarefas");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/tarefas" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 p-6">
        <h1 className="text-2xl font-bold text-white">{task.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-purple-200/80">
          <div className="flex items-center gap-1"><Flag className="h-4 w-4" /> Prioridade: {task.priority}</div>
          <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Prazo: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Sem prazo"}</div>
          <div className="flex items-center gap-1"><User className="h-4 w-4" /> Responsável: {task.assignee?.name || task.assignee?.email}</div>
        </div>
        <p className="mt-4 text-white/80 whitespace-pre-wrap">{task.description || "Sem descrição"}</p>
        <p className="mt-2 text-sm text-purple-300">Status: {task.status}</p>

        {task.status !== "completed" && (isAdmin || isOwner) && (
          <div className="mt-6">
            {showJustification ? (
              <div className="space-y-4 border-t border-purple-800/30 pt-4">
                <p className="text-red-400">Esta tarefa está atrasada. Para concluí-la, é necessário justificar.</p>
                <textarea
                  className="w-full p-2 bg-gray-800 border border-purple-500/30 rounded text-white"
                  rows={3}
                  placeholder="Justifique o atraso..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-purple-200">Tipo de justificativa</label>
                  <select
                    className="mt-1 p-2 bg-gray-800 border border-purple-500/30 rounded text-white"
                    value={justificationType}
                    onChange={(e) => setJustificationType(e.target.value)}
                  >
                    <option value="plausible">Justificativa plausível</option>
                    <option value="medical">Atestado médico</option>
                  </select>
                </div>
                <button
                  onClick={handleComplete}
                  disabled={loading || !justification.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Concluir tarefa"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              >
                {loading ? "Salvando..." : "Marcar como concluída"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Regras de negócio claras */}
      <div className="rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-3">📋 Regras de prazos e advertências</h2>
        <ul className="list-disc list-inside space-y-2 text-purple-200/80 text-sm">
          <li>Se uma tarefa for concluída após o prazo, você deve fornecer uma justificativa.</li>
          <li>Se não houver justificativa em até <strong>2 dias corridos</strong> após o vencimento, você será <strong>desligado</strong> das atividades.</li>
          <li>A cada 3 atrasos com justificativa plausível, você recebe <strong>1 advertência</strong>.</li>
          <li>3 advertências levam ao <strong>desligamento</strong>.</li>
          <li>Após o terceiro atraso, apenas <strong>atestado médico</strong> será aceito como justificativa.</li>
        </ul>
      </div>
    </div>
  );
}