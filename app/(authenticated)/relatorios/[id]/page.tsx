import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { buildMemberReport, resolveReportRange } from '../../../actions/reports';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  period?: string;
  start?: string;
  end?: string;
}>;

export default async function MemberReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      role: true,
    },
  });

  if (!currentUser) {
    redirect('/login');
  }

  const { id } = await params;
  const memberId = Number(id);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    notFound();
  }

  if (currentUser.role !== 'ADMIN' && currentUser.id !== memberId) {
    redirect('/dashboard');
  }

  const paramsSearch = (await searchParams) ?? {};
  const range = resolveReportRange(paramsSearch);

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!member) {
    notFound();
  }

  const report = await buildMemberReport(memberId, range);

  const exportUrl = `/api/relatorios/export?memberId=${memberId}&start=${encodeURIComponent(
    range.startDate.toISOString()
  )}&end=${encodeURIComponent(range.endDate.toISOString())}`;

  const cards = [
    { label: 'Score', value: report.metrics.score.toFixed(1) },
    { label: 'Tarefas concluídas', value: report.metrics.tasksCompleted },
    { label: 'Taxa de conclusão', value: `${report.metrics.completionRate.toFixed(1)}%` },
    { label: 'Throughput', value: report.metrics.throughput.toFixed(2) },
    { label: 'Tarefas criadas', value: report.metrics.tasksCreated },
    { label: 'Taxa de atraso', value: `${report.metrics.lateRate.toFixed(1)}%` },
    { label: 'Tarefas atrasadas', value: report.metrics.lateTasks },
    { label: 'Lead time', value: report.metrics.leadTimeHours !== null ? `${report.metrics.leadTimeHours.toFixed(2)}h` : '-' },
    { label: 'Cycle time', value: report.metrics.cycleTimeHours !== null ? `${report.metrics.cycleTimeHours.toFixed(2)}h` : '-' },
    { label: 'Horas trabalhadas', value: `${report.metrics.hoursWorked.toFixed(2)}h` },
    { label: 'Eficiência de tempo', value: report.metrics.timeEfficiency !== null ? `${report.metrics.timeEfficiency.toFixed(1)}%` : '-' },
    { label: 'Tempo médio por tarefa', value: report.metrics.avgHoursPerTask !== null ? `${report.metrics.avgHoursPerTask.toFixed(2)}h` : '-' },
    { label: 'Produtividade por hora', value: report.metrics.productivityPerHour !== null ? report.metrics.productivityPerHour.toFixed(2) : '-' },
    { label: 'Tarefas em andamento', value: report.metrics.tasksInProgress },
    { label: 'Tarefas bloqueadas', value: report.metrics.tasksBlocked },
    { label: 'Mudanças registradas', value: report.metrics.historyChanges },
    { label: 'Consistência daily', value: `${report.metrics.dailyConsistency.toFixed(1)}%` },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/relatorios" className="text-sm text-purple-300 hover:text-purple-200">
            ← Voltar para relatórios
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Relatório de {member.name || member.email}
          </h1>
          <p className="text-sm text-purple-200/80">
            Período {range.label}
          </p>
        </div>

        <a
          href={exportUrl}
          className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          Exportar CSV individual
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
{cards.map((card: any) => (
          <div
            key={card.label}
            className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-5 backdrop-blur-sm"
          >
            <p className="text-sm text-purple-200/70">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}