import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTaskById } from "../../../../actions/tasks";
import EditTaskForm from "./EditTaskForm";
import { Prisma } from "@prisma/client";

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

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) redirect("/tarefas");

  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) notFound();

  const result = await getTaskById(taskId);
  if (!result.success || !result.data) notFound();

  const task = result.data as TaskWithDetails;

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: task.projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const availableParentTasks = await prisma.task.findMany({
    where: {
      projectId: task.projectId,
      id: { not: task.id },
    },
    select: { id: true, title: true },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20 mb-6">
        <h1 className="text-2xl font-bold text-white">Editar Tarefa</h1>
        <p className="text-purple-200/80">Atualize os dados da tarefa</p>
      </div>

      <EditTaskForm
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          assigneeId: task.assigneeId,
          parentTaskId: task.parentTaskId,
          justification: task.justification,
          justificationType: task.justificationType,
        }}
        projectMembers={projectMembers.map((m) => ({
          id: m.user.id,
          name: m.user.name || m.user.email,
        }))}
        availableParentTasks={availableParentTasks}
      />
    </div>
  );
}