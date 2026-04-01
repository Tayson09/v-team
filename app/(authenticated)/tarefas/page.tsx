import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaskCard from "../../components/TaskCard";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = parseInt((session.user as any).id);
  const isAdmin = (session.user as any).role === "ADMIN";

  const tasks = await prisma.task.findMany({
    where: isAdmin ? {} : { assigneeId: userId },
    include: { project: true, assignee: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Tarefas
            </h1>
            <p className="text-purple-200/80 mt-2">
              {isAdmin
                ? "Gerencie todas as tarefas da equipe"
                : "Suas tarefas e prazos"}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/tarefas/nova"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Nova Tarefa
            </Link>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-purple-200/60">
          Nenhuma tarefa encontrada.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
{tasks.map((task: any) => (
            <TaskCard key={task.id} task={task} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}