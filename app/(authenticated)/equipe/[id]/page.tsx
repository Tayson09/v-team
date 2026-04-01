import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import MemberActions from '../../../components/MemberActions';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const isAdmin = (session.user as any).role === 'ADMIN';

  if (!isAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const memberId = Number(id);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    notFound();
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: {
      _count: {
        select: {
          projects: true,
          tasks: true,
          tasksCreated: true,
          dailies: true,
          meetings: true,
          warnings: true,
          notifications: true,
          comments: true,
          timeEntries: true,
        },
      },
      projects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!member) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {member.name || 'Sem nome'}
            </h1>
            <p className="mt-2 text-sm text-purple-200/80">{member.email}</p>
            <p className="mt-1 text-sm text-purple-200/80">
              Tipo: {member.role === 'ADMIN' ? 'Admin' : 'Colaborador'}
            </p>
            <p className="mt-1 text-sm text-purple-200/80">
              Criado em: {new Date(member.createdAt).toLocaleString()}
            </p>
          </div>

          <MemberActions memberId={member.id} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-purple-500/10 bg-gray-800/70 p-4">
            <p className="text-sm text-purple-200/70">Projetos</p>
            <p className="mt-1 text-2xl font-bold text-white">{member._count.projects}</p>
          </div>

          <div className="rounded-xl border border-purple-500/10 bg-gray-800/70 p-4">
            <p className="text-sm text-purple-200/70">Tarefas atribuídas</p>
            <p className="mt-1 text-2xl font-bold text-white">{member._count.tasks}</p>
          </div>

          <div className="rounded-xl border border-purple-500/10 bg-gray-800/70 p-4">
            <p className="text-sm text-purple-200/70">Tarefas criadas</p>
            <p className="mt-1 text-2xl font-bold text-white">{member._count.tasksCreated}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-sm text-purple-200/80">
        <h2 className="mb-4 text-lg font-semibold text-white">Projetos vinculados</h2>

        {member.projects.length ? (
          <div className="space-y-3">
            {member.projects.map((item : any) => (
              <Link
                key={item.project.id}
                href={`/projetos/${item.project.id}`}
                className="block rounded-xl border border-purple-500/10 bg-gray-800/70 p-4 transition hover:border-purple-400/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-white">{item.project.name}</span>
                  <span className="text-xs text-purple-200/70">
                    {item.project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p>Este membro ainda não está vinculado a projetos.</p>
        )}
      </div>
    </div>
  );
}