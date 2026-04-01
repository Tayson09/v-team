import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaskDetail from "../../../components/TaskDetail";
import type { NormalizedTask } from "../../../../types/task";
import { normalizeTask } from "../../../../types/task";


type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const taskId = Number(id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    notFound();
  }

  const rawTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      project: true, 
      assignee: true,
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    },
  });

  if (!rawTask) notFound();

  const task: NormalizedTask = normalizeTask(rawTask);

  const isAdmin = (session.user as any).role === "ADMIN";
  const isOwner = task.assignee?.id === Number((session.user as any).id);

  return <TaskDetail task={task} isAdmin={isAdmin} isOwner={isOwner} />;
}