"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Flag,
  User,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
} from "lucide-react";

import { completeTask } from "../actions/tasks";
import type { NormalizedTask } from "../../types/task";

interface TaskDetailProps {
  task: NormalizedTask;
  isAdmin: boolean;
  isOwner: boolean;
}

export default function TaskDetail({ task, isAdmin, isOwner }: TaskDetailProps) {
  const router = useRouter();
  const [justification, setJustification] = useState("");
  const [justificationType, setJustificationType] = useState("DELAY");
  const [loading, setLoading] = useState(false);

  const isCompleted = useMemo(() => {
    const status = (task.status ?? "").toLowerCase();
    return status === "done" || status === "completed";
  }, [task.status]);

  const isLate = useMemo(() => {
    if (!task.dueDate || isCompleted) return false;
    return new Date(task.dueDate) < new Date();
  }, [task.dueDate, isCompleted]);

  const showJustification = isLate && isOwner && !isCompleted;
  const canInteract = (isAdmin || isOwner) && !isCompleted;

  const handleComplete = async () => {
    setLoading(true);

    try {
      const result = await completeTask(task.id, justification, justificationType);

      if (!result.success) {
        alert(result.message);
        return;
      }

      router.push("/tarefas");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const priorityLabel = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    URGENT: "Urgente",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  }[String(task.priority)] || String(task.priority);

  const statusLabel = {
    pending: "Pendente",
    in_progress: "Em andamento",
    blocked: "Bloqueada",
    done: "Concluída",
    canceled: "Cancelada",
    completed: "Concluída",
  }[String(task.status).toLowerCase()] || String(task.status);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Link
          href="/tarefas"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para tarefas
        </Link>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/10 to-transparent px-6 py-6 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Detalhes da tarefa
                </div>

                <h1 className="max-w-3xl text-2xl font-bold tracking-tight text-white md:text-4xl">
                  {task.title}
                </h1>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                    Status: <strong className="text-white">{statusLabel}</strong>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                    Prioridade: <strong className="text-white">{priorityLabel}</strong>
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 md:min-w-[420px]">
                <InfoCard
                  icon={<Flag className="h-4 w-4" />}
                  label="Prioridade"
                  value={priorityLabel}
                />
                <InfoCard
                  icon={<Calendar className="h-4 w-4" />}
                  label="Prazo"
                  value={
                    task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString("pt-BR")
                      : "Sem prazo"
                  }
                />
                <InfoCard
                  icon={<User className="h-4 w-4" />}
                  label="Responsável"
                  value={task.assignee?.name || task.assignee?.email || "Não atribuído"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Descrição
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {task.description || "Sem descrição"}
                </p>
              </div>

              {canInteract && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-500/15 p-2 text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        Concluir tarefa
                      </h2>
                      <p className="text-sm text-slate-400">
                        {showJustification
                          ? "Esta tarefa está atrasada e exige justificativa para ser concluída."
                          : "Marque sua tarefa como concluída quando terminar."}
                      </p>
                    </div>
                  </div>

                  {showJustification ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <p>
                            Esta tarefa passou do prazo. Para concluir, informe a justificativa.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">
                          Justificativa
                        </label>
                        <textarea
                          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                          placeholder="Explique o motivo do atraso..."
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">
                          Tipo de justificativa
                        </label>
                        <select
                          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                          value={justificationType}
                          onChange={(e) => setJustificationType(e.target.value)}
                        >
                          <option value="DELAY">Atraso</option>
                          <option value="BLOCKER">Bloqueio</option>
                          <option value="SCOPE_CHANGE">Mudança de escopo</option>
                          <option value="OTHER">Outro</option>
                        </select>
                      </div>

                      <button
                        onClick={handleComplete}
                        disabled={loading || !justification.trim()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {loading ? "Salvando..." : "Concluir tarefa"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleComplete}
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {loading ? "Salvando..." : "Marcar como concluída"}
                    </button>
                  )}
                </div>
              )}

              {isCompleted && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-emerald-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <h2 className="font-semibold">Tarefa concluída</h2>
                      <p className="mt-1 text-sm text-emerald-100/80">
                        Esta tarefa já foi finalizada.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Resumo
                </h2>

                <div className="space-y-3 text-sm text-slate-300">
                  <Row label="Título" value={task.title} />
                  <Row label="Status" value={statusLabel} />
                  <Row label="Prioridade" value={priorityLabel} />
                  <Row
                    label="Prazo"
                    value={
                      task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString("pt-BR")
                        : "Sem prazo"
                    }
                  />
                  <Row
                    label="Responsável"
                    value={task.assignee?.name || task.assignee?.email || "Não atribuído"}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <div className="mb-3 flex items-center gap-2 text-slate-200">
                  <Info className="h-4 w-4 text-purple-300" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide">
                    Regras
                  </h2>
                </div>

                <ul className="space-y-3 text-sm leading-6 text-slate-300">
                  <li>
                    Se a tarefa for concluída após o prazo, será exigida justificativa.
                  </li>
                  <li>
                    Apenas o responsável da tarefa pode marcá-la como concluída.
                  </li>
                  <li>
                    Ao completar uma tarefa atrasada, use um tipo de justificativa coerente.
                  </li>
                  <li>
                    O status final da tarefa aparece como <strong className="text-white">Concluída</strong>.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="text-purple-300">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-none last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}