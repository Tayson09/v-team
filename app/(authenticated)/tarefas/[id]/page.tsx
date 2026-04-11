import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import {
  getTaskById,
  addTaskFile,
  completeTask,
  deleteTaskFile,
} from "../../../actions/tasks";
import { Pencil, ArrowLeft, UploadCloud, CheckCircle } from "lucide-react";
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

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const taskId = Number(id);
  if (Number.isNaN(taskId)) notFound();

  const result = await getTaskById(taskId);
  if (!result.success || !result.data) notFound();

  const task = result.data as TaskWithDetails;

  const sessionUserId = (session.user as any)?.id
    ? Number((session.user as any).id)
    : null;

  const sessionUserRole = (session.user as any)?.role;
  const isAdmin = sessionUserRole === "ADMIN";

  const isAssignee =
    sessionUserId !== null
      ? sessionUserId === task.assigneeId
      : session.user?.email === task.assignee?.email;

  const taskStatus =
    task.statusEnum ??
    (task.status?.toUpperCase() as
      | "PENDING"
      | "IN_PROGRESS"
      | "BLOCKED"
      | "DONE"
      | "CANCELED"
      | undefined);

  const isDone = taskStatus === "DONE" || task.status?.toLowerCase() === "done";

  const dueDateFormatted = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("pt-BR")
    : "Sem prazo";

  const createdAtFormatted = new Date(task.createdAt).toLocaleDateString("pt-BR");

  const completedAtFormatted = task.completedAt
    ? new Date(task.completedAt).toLocaleString("pt-BR")
    : null;

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
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <Link
          href="/tarefas"
          className="inline-flex items-center gap-2 text-purple-300 hover:text-white"
        >
          <ArrowLeft size={20} />
          Voltar
        </Link>

        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/tarefas/editar/${task.id}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              <Pencil size={18} />
            </Link>
            <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
          </div>
        )}
      </div>

      {isDone && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-200">
                Tarefa concluída com sucesso 🎉
              </p>
              <p className="text-xs text-emerald-300/70">
                Finalizada por {task.assignee?.name}
                {completedAtFormatted && ` em ${completedAtFormatted}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-purple-500/20 bg-purple-900/20 p-6">
        <h1 className="text-2xl font-bold text-white">{task.title}</h1>

        <div className="grid gap-2 text-sm text-purple-200 md:grid-cols-2">
          <p>Status: {task.status}</p>
          <p>Prioridade: {task.priority}</p>
          <p>Responsável: {task.assignee?.name ?? "Não atribuído"}</p>
          <p>Criado por: {task.createdBy?.name ?? "Não informado"}</p>
          <p>Prazo: {dueDateFormatted}</p>
          <p>Criado em: {createdAtFormatted}</p>
        </div>

        {task.description && (
          <div>
            <h2 className="font-semibold text-white">Descrição</h2>
            <p className="text-purple-100">{task.description}</p>
          </div>
        )}
      </div>

      {!isDone && isAssignee && (
        <form
          action={async () => {
            "use server";
            await completeTask(task.id);
          }}
          className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
        >
          <span className="text-emerald-200">Marcar como concluída</span>

          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
            Concluir
          </button>
        </form>
      )}

      <TaskFiles
        files={normalizedFiles}
        isAdmin={isAdmin}
        isTaskDone={isDone}
        onDelete={async (fileId) => {
          "use server";
          await deleteTaskFile(fileId);
        }}
      />

      {isAssignee && !isDone && (
        <form
          action={async (formData) => {
            "use server";
            await addTaskFile(formData);
          }}
          className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-slate-950/60 p-6 shadow-lg shadow-black/20"
        >
          <input type="hidden" name="taskId" value={task.id} />

          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-200">
              <UploadCloud size={22} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">Enviar arquivo</h2>
              <p className="text-sm text-purple-200/80">
                Envie documentos, imagens ou anexos relacionados à tarefa.
              </p>
            </div>
          </div>

          <label
            htmlFor="file"
            className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-400/30 bg-white/5 px-6 py-10 text-center transition hover:border-purple-300 hover:bg-white/10"
          >
            <UploadCloud
              className="mb-3 text-purple-300 transition group-hover:scale-110"
              size={34}
            />
            <p className="font-medium text-white">Clique para selecionar o arquivo</p>
            <p className="mt-1 text-sm text-purple-200/70">
              PDF, DOC, DOCX, PNG, JPG ou outros formatos permitidos
            </p>
            <p className="mt-2 text-xs text-purple-200/50">
              Limite recomendado: até 10MB
            </p>
          </label>

          <input id="file" type="file" name="file" required className="sr-only" />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-purple-200/70">
              O arquivo será vinculado automaticamente a esta tarefa.
            </span>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white transition hover:bg-purple-700 active:scale-[0.98]"
            >
              Enviar arquivo
            </button>
          </div>
        </form>
      )}

      {task.history.length > 0 && (
        <div className="rounded-xl border border-purple-500/20 bg-gray-900/50 p-6">
          <h2 className="mb-3 font-semibold text-white">Histórico</h2>

          <div className="space-y-2">
            {task.history.map((h) => (
              <div key={h.id} className="text-sm text-purple-300">
                {h.field}: {h.oldValue ?? "—"} → {h.newValue ?? "—"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}