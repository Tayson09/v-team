import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { getTaskById, addTaskFile, completeTask } from "../../../actions/tasks";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  History,
  Paperclip,
  Pencil,
  Shield,
  Sparkles,
  UploadCloud,
  User2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import DeleteTaskButton from "./DeleteTaskButton";
import TaskFiles from "./TaskFiles";
import { Prisma } from "@prisma/client";

type TaskWithDetails = Prisma.TaskGetPayload<{
  include: {
    project: true;
    assignee: true;
    createdBy: true;
    history: {
      orderBy: { createdAt: "desc" };
    };
    files: true;
  };
}>;

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR");
}

function getStatusLabel(status?: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "pending":
      return "Pendente";
    case "in_progress":
      return "Em andamento";
    case "blocked":
      return "Bloqueada";
    case "done":
      return "Concluída";
    case "canceled":
      return "Cancelada";
    default:
      return status ?? "—";
  }
}

function getPriorityLabel(priority?: string | null) {
  switch ((priority ?? "").toLowerCase()) {
    case "low":
    case "baixa":
      return "Baixa";
    case "medium":
    case "media":
      return "Média";
    case "high":
    case "alta":
      return "Alta";
    case "urgent":
    case "urgente":
      return "Urgente";
    default:
      return priority ?? "—";
  }
}

function isTaskDone(status?: string | null) {
  return (status ?? "").trim().toLowerCase() === "done";
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (Number.isNaN(taskId)) notFound();

  const result = await getTaskById(taskId);
  if (!result.success || !result.data) notFound();

  const task = result.data as TaskWithDetails;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const isAssignee = session.user?.email === task.assignee?.email;

  const dueDateFormatted = formatDate(task.dueDate) ?? "Sem prazo";
  const createdAtFormatted = formatDate(task.createdAt) ?? "—";
  const completedAtFormatted = formatDateTime(task.completedAt);

  const taskDone = isTaskDone(task.status);
  const isLate = !!task.dueDate && new Date(task.dueDate) < new Date() && !taskDone;

  const normalizedFiles = (task.files || []).map((file) => ({
    id: file.id,
    fileName: file.fileName,
    originalName: file.originalName,
    path: file.filePath,
    mimeType: file.mimeType,
    size: file.fileSize,
    createdAt: file.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/tarefas"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista
          </Link>

          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/tarefas/editar/${task.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
              <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
            </div>
          )}
        </div>

        {taskDone && (
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 shadow-lg shadow-emerald-950/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%)]" />
            <div className="relative flex items-start gap-4">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/15 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-emerald-100">
                  Tarefa concluída com sucesso
                </h2>
                <p className="text-sm text-emerald-100/80">
                  Esta tarefa foi finalizada por{" "}
                  <span className="font-medium text-white">
                    {task.assignee?.name || "usuário"}
                  </span>
                  {completedAtFormatted && <> em {completedAtFormatted}</>}.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLate && !taskDone && (
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-100">Tarefa atrasada</p>
                <p className="text-sm text-amber-100/80">
                  Para concluir, o responsável precisa informar uma justificativa.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/10 to-transparent px-6 py-6 md:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Detalhes da tarefa
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white md:text-4xl">
                    {task.title}
                  </h1>

                  <p className="text-sm text-slate-300 md:text-base">
                    Projeto:{" "}
                    <Link
                      href={`/projetos/${task.project.id}`}
                      className="font-medium text-purple-200 transition hover:text-white hover:underline"
                    >
                      {task.project.name}
                    </Link>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge label={`Status: ${getStatusLabel(task.status)}`} />
                  <Badge label={`Prioridade: ${getPriorityLabel(task.priority)}`} />
                  <Badge label={`Prazo: ${dueDateFormatted}`} />
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[420px] lg:grid-cols-2">
                <MiniInfoCard
                  icon={<Flag className="h-4 w-4" />}
                  label="Prioridade"
                  value={getPriorityLabel(task.priority)}
                />
                <MiniInfoCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Prazo"
                  value={dueDateFormatted}
                />
                <MiniInfoCard
                  icon={<User2 className="h-4 w-4" />}
                  label="Responsável"
                  value={task.assignee?.name || "Não atribuído"}
                />
                <MiniInfoCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Criado por"
                  value={task.createdBy?.name || "—"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <CardBlock title="Descrição" icon={<FileText className="h-4 w-4" />}>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {task.description || "Sem descrição"}
                </p>
              </CardBlock>

              {task.justification && (
                <CardBlock title="Justificativa" icon={<AlertTriangle className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {task.justification}
                  </p>
                </CardBlock>
              )}

              {!taskDone && isAssignee && (
                <CardBlock title="Concluir tarefa" icon={<CheckCircle2 className="h-4 w-4" />}>
                  <form
                    action={async (formData) => {
                      "use server";

                      const justification = String(formData.get("justification") ?? "");
                      const justificationType = String(formData.get("justificationType") ?? "");

                      const response = await completeTask(
                        task.id,
                        justification,
                        justificationType
                      );

                      if (!response.success) {
                        throw new Error(response.message);
                      }
                    }}
                    className="space-y-4"
                  >
                    {isLate && (
                      <>
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                          Esta tarefa está atrasada. A justificativa é obrigatória para concluir.
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-200">
                            Justificativa
                          </label>
                          <textarea
                            name="justification"
                            rows={4}
                            required
                            placeholder="Explique o motivo do atraso..."
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-200">
                            Tipo de justificativa
                          </label>
                          <select
                            name="justificationType"
                            required
                            defaultValue="DELAY"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                          >
                            <option value="DELAY">Atraso</option>
                            <option value="BLOCKER">Bloqueio</option>
                            <option value="SCOPE_CHANGE">Mudança de escopo</option>
                            <option value="OTHER">Outro</option>
                          </select>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Concluir tarefa
                    </button>
                  </form>
                </CardBlock>
              )}

              {!taskDone && !isAssignee && (
                <CardBlock title="Concluir tarefa" icon={<CheckCircle2 className="h-4 w-4" />}>
                  <p className="text-sm text-slate-300">
                    Somente o responsável pode concluir esta tarefa.
                  </p>
                </CardBlock>
              )}

              {isAssignee && !taskDone && (
                <CardBlock title="Arquivos" icon={<Paperclip className="h-4 w-4" />}>
                  <form
                    action={addTaskFile}
                    className="group space-y-5"
                  >
                    <input type="hidden" name="taskId" value={task.id} />

                    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/25 via-zinc-900/40 to-transparent p-5 text-center transition group-hover:border-purple-400/40">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
                        <UploadCloud className="h-8 w-8 text-purple-200" />
                      </div>

                      <div className="mt-4 space-y-1">
                        <p className="font-medium text-white">
                          Enviar arquivo para esta tarefa
                        </p>
                        <p className="text-sm text-purple-200/70">
                          Selecione um arquivo do seu computador
                        </p>
                      </div>

                      <input
                        type="file"
                        name="file"
                        required
                        className="mt-5 block w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/60 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-purple-700"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-950/20 transition hover:brightness-110"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Enviar arquivo
                    </button>
                  </form>
                </CardBlock>
              )}
            </div>

            <aside className="space-y-6">
              <CardBlock title="Resumo rápido" icon={<Sparkles className="h-4 w-4" />}>
                <div className="space-y-3 text-sm">
                  <SummaryRow label="Status" value={getStatusLabel(task.status)} />
                  <SummaryRow label="Prioridade" value={getPriorityLabel(task.priority)} />
                  <SummaryRow label="Responsável" value={task.assignee?.name || "Não atribuído"} />
                  <SummaryRow label="Criado por" value={task.createdBy?.name || "—"} />
                  <SummaryRow label="Prazo" value={dueDateFormatted} />
                  <SummaryRow label="Criado em" value={createdAtFormatted} />
                  <SummaryRow label="Concluída em" value={completedAtFormatted || "—"} />
                </div>
              </CardBlock>

              <CardBlock title="Regras" icon={<Shield className="h-4 w-4" />}>
                <ul className="space-y-3 text-sm leading-6 text-slate-300">
                  <li>Somente o responsável pode concluir a tarefa.</li>
                  <li>Se a tarefa estiver atrasada, a justificativa será obrigatória.</li>
                  <li>Arquivos só podem ser enviados enquanto a tarefa estiver aberta.</li>
                  <li>O histórico registra as alterações mais importantes.</li>
                </ul>
              </CardBlock>
            </aside>
          </div>

          {task.history.length > 0 && (
            <div className="border-t border-white/10 bg-slate-950/30 p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-purple-300" />
                <h2 className="text-lg font-semibold text-white">
                  Histórico de alterações
                </h2>
              </div>

              <div className="space-y-3">
                {task.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm text-slate-200">
                      <span className="font-semibold text-white">{entry.field}</span>{" "}
                      alterado de{" "}
                      <span className="text-red-300">{entry.oldValue || "vazio"}</span>{" "}
                      para{" "}
                      <span className="text-emerald-300">{entry.newValue || "vazio"}</span>
                    </p>

                    {entry.changeReason && (
                      <p className="mt-1 text-xs text-slate-400">
                        Motivo: {entry.changeReason}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
      {label}
    </span>
  );
}

function MiniInfoCard({
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

function CardBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-purple-300">{icon}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-none last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}