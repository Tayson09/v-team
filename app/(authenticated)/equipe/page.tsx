import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import MemberActions from '../../components/MemberActions';

export default async function TeamPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const isAdmin = (session.user as any).role === 'ADMIN';

  if (!isAdmin) {
    redirect('/dashboard');
  }

  const members = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { name: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          projects: true,
          tasks: true,
          tasksCreated: true,
        },
      },
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Equipe
            </h1>
            <p className="text-purple-200/80 mt-2">
              {isAdmin
                ? "Gerencie todos os membros da equipe"
                : "Seus membros e prazos"}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/equipe/novo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Novo Membro
            </Link>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-purple-200/80">
          Nenhum membro cadastrado.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member : any) => (
            <Link
              key={member.id}
              href={`/equipe/${member.id}`}
              className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-5 backdrop-blur-sm transition hover:border-purple-400/40 hover:bg-gray-900/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {member.name || 'Sem nome'}
                  </h2>
                  <p className="text-sm text-purple-200/80">{member.email}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    member.role === 'ADMIN'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-blue-500/15 text-blue-300'
                  }`}
                >
                  {member.role === 'ADMIN' ? 'Admin' : 'Colaborador'}
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-purple-200/80">
                <p>Projetos: {member._count.projects}</p>
                <p>Tarefas atribuídas: {member._count.tasks}</p>
                <p>Tarefas criadas: {member._count.tasksCreated}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}