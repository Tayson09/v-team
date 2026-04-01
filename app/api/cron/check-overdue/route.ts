import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(now.getDate() - 2);

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: twoDaysAgo },
      status: { not: "completed" },
      justification: null,
    },
    include: { assignee: true },
  });

  for (const task of overdueTasks) {
    if (task.assignee) {
      // Desligar usuário
      await prisma.user.update({
        where: { id: task.assignee.id },
        data: { active: false },
      });
      // Opcional: enviar notificação
    }
  }

  return NextResponse.json({ processed: overdueTasks.length });
}