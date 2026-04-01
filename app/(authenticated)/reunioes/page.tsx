import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = Number((session.user as any).id);
  const isAdmin = (session.user as any).role === 'ADMIN';

  const meetings = await prisma.meeting.findMany({
    where: isAdmin
      ? undefined
      : {
          project: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Reuniões
            </h1>
            <p className="text-purple-200/80 mt-2">
              {isAdmin
                ? "Gerencie todas as reuniões da equipe"
                : "Suas reuniões e prazos"}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/reunioes/novo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Nova Reunião
            </Link>
          )}
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-purple-200/80">
          Nenhuma reunião encontrada.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
{meetings.map((meeting: any) => (
            <Link
              key={meeting.id}
              href={`/reunioes/${meeting.id}`}
              className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-5 backdrop-blur-sm transition hover:border-purple-400/40 hover:bg-gray-900/80"
            >
              <h2 className="text-lg font-semibold text-white">{meeting.title}</h2>
              <p className="mt-1 text-sm text-purple-200/80">
                {meeting.project?.name ?? 'Sem projeto'}
              </p>
              <p className="mt-3 text-sm text-white/80">
                {new Date(meeting.date).toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-purple-200/80">
                Participantes: {meeting.participants.length}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}