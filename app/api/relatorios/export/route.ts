import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Role } from '@prisma/client';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  buildMemberReport,
  buildTeamReport,
  reportColumns,
  resolveReportRange,
} from '../../../actions/reports';
import { prisma } from '@/lib/prisma';

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[;\n"]/.test(escaped) ? `"${escaped}"` : escaped;
}

function memberRow(report: Awaited<ReturnType<typeof buildMemberReport>>) {
  return {
    name: report.user.name || '',
    email: report.user.email,
    role: report.user.role === Role.ADMIN ? 'ADMIN' : 'COLLABORATOR',
    score: report.metrics.score,
    tasksCompleted: report.metrics.tasksCompleted,
    completionRate: report.metrics.completionRate,
    throughput: report.metrics.throughput,
    tasksCreated: report.metrics.tasksCreated,
    lateRate: report.metrics.lateRate,
    lateTasks: report.metrics.lateTasks,
    leadTimeHours: report.metrics.leadTimeHours ?? '',
    cycleTimeHours: report.metrics.cycleTimeHours ?? '',
    hoursWorked: report.metrics.hoursWorked,
    timeEfficiency: report.metrics.timeEfficiency ?? '',
    avgHoursPerTask: report.metrics.avgHoursPerTask ?? '',
    productivityPerHour: report.metrics.productivityPerHour ?? '',
    tasksInProgress: report.metrics.tasksInProgress,
    tasksBlocked: report.metrics.tasksBlocked,
    historyChanges: report.metrics.historyChanges,
    dailyConsistency: report.metrics.dailyConsistency,
  };
}

function buildCsv(rows: Array<Record<string, unknown>>) {
  const header = reportColumns.map((column : any) => column.label).join(';');
  const body = rows
    .map((row : any) =>
      reportColumns
        .map((column : any) => escapeCsv(row[column.key]))
        .join(';')
    )
    .join('\n');

  return `\uFEFF${header}\n${body}`;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const viewer = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
    },
  });

  if (!viewer) {
    return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
  }

  const url = new URL(request.url);
  const memberIdParam = url.searchParams.get('memberId');

  const range = resolveReportRange({
    period: url.searchParams.get('period'),
    start: url.searchParams.get('start'),
    end: url.searchParams.get('end'),
  });

  if (memberIdParam) {
    const memberId = Number(memberIdParam);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return NextResponse.json({ message: 'Usuário inválido.' }, { status: 400 });
    }

    if (viewer.role !== Role.ADMIN && viewer.id !== memberId) {
      return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
    }

    const report = await buildMemberReport(memberId, range);
    const csv = buildCsv([memberRow(report)]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-membro-${memberId}.csv"`,
      },
    });
  }

  if (viewer.role !== Role.ADMIN) {
    return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
  }

  const report = await buildTeamReport(range);
  const rows = report.members.map((member : any) => memberRow({
    user: member.user,
    range: member.range,
    metrics: member.metrics,
  }));

  const csv = buildCsv(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="relatorio-equipe.csv"',
    },
  });
}