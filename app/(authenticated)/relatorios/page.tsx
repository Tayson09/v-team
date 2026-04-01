import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { buildTeamReport, resolveReportRange } from '../../actions/reports';

type SearchParams = Promise<{
  period?: string;
  start?: string;
  end?: string;
}>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const isAdmin = (session.user as any).role === 'ADMIN';

  if (!isAdmin) {
    redirect('/dashboard');
  }

  const params = (await searchParams) ?? {};
  const range = resolveReportRange(params);
  const report = await buildTeamReport(range);

  const exportUrl = `/api/relatorios/export?start=${encodeURIComponent(
    range.startDate.toISOString()
  )}&end=${encodeURIComponent(range.endDate.toISOString())}`;

  const periodLinks = [
    { label: '7 dias', period: '7d' },
    { label: '30 dias', period: '30d' },
    { label: '90 dias', period: '90d' },
  ];

  const metricCards = [
    { label: 'Membros', value: report.summary.memberCount },
    { label: 'Score médio', value: report.summary.averageScore.toFixed(1) },
    { label: 'Tarefas concluídas', value: report.summary.totalTasksCompleted },
    { label: 'Tarefas com atraso', value: report.summary.totalLateTasks },
    { label: 'Horas trabalhadas', value: report.summary.totalHoursWorked.toFixed(2) },
    { label: 'Daily média', value: `${report.summary.averageDailyConsistency.toFixed(1)}%` },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-purple-200/80">
            Visão geral da equipe no período {range.label}.
          </p>
        </div>

        <a
          href={exportUrl}
          className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          Exportar CSV da equipe
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {periodLinks.map((item) => (
          <Link
            key={item.period}
            href={`/relatorios?period=${item.period}`}
            className="rounded-full border border-purple-500/20 bg-gray-900/60 px-4 py-2 text-sm text-purple-100 hover:bg-gray-900/80"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-5 backdrop-blur-sm"
          >
            <p className="text-sm text-purple-200/70">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Ranking individual</h2>
          <p className="text-sm text-purple-200/70">
            Ordenado por score, depois por entregas.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-purple-200/70">
              <tr className="border-b border-purple-500/10">
                <th className="py-3 pr-4">Membro</th>
                <th className="py-3 pr-4">Cargo</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Concluídas</th>
                <th className="py-3 pr-4">Atrasadas</th>
                <th className="py-3 pr-4">Horas</th>
                <th className="py-3 pr-4">Daily</th>
                <th className="py-3 pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {report.members.map((member) => (
                <tr key={member.user.id} className="border-b border-purple-500/10 text-white/90">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{member.user.name || 'Sem nome'}</div>
                    <div className="text-xs text-purple-200/70">{member.user.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {member.user.role === 'ADMIN' ? 'Admin' : 'Colaborador'}
                  </td>
                  <td className="py-3 pr-4">{member.metrics.score.toFixed(1)}</td>
                  <td className="py-3 pr-4">{member.metrics.tasksCompleted}</td>
                  <td className="py-3 pr-4">{member.metrics.lateTasks}</td>
                  <td className="py-3 pr-4">{member.metrics.hoursWorked.toFixed(2)}</td>
                  <td className="py-3 pr-4">{member.metrics.dailyConsistency.toFixed(1)}%</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/relatorios/${member.user.id}?period=${params.period ?? '30d'}${
                          params.start && params.end
                            ? `&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`
                            : ''
                        }`}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Ver
                      </Link>
                      <a
                        href={`/api/relatorios/export?memberId=${member.user.id}&start=${encodeURIComponent(
                          range.startDate.toISOString()
                        )}&end=${encodeURIComponent(range.endDate.toISOString())}`}
                        className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                      >
                        CSV
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}