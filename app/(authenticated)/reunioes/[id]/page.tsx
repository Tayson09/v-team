import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import MeetingActions from '../../../components/MeetingActions';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');

  const { id } = await params;
  const meetingId = Number(id);

  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    notFound();
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
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
      comments: {
        orderBy: { createdAt: 'asc' },
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
  });

  if (!meeting) notFound();

  const userId = Number((session.user as any).id);
  const isAdmin = (session.user as any).role === 'ADMIN';

  if (!isAdmin && meeting.projectId) {
    const canAccess = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: meeting.projectId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!canAccess) redirect('/reunioes');
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
            <p className="mt-2 text-sm text-purple-200/80">
              Projeto: {meeting.project?.name ?? 'Sem projeto'}
            </p>
            <p className="mt-1 text-sm text-purple-200/80">
              Data: {new Date(meeting.date).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-purple-200/80">
              Duração: {meeting.duration ? `${meeting.duration} min` : 'Não informada'}
            </p>
          </div>

          <MeetingActions meetingId={meeting.id} />
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Descrição</h2>
            <p className="mt-2 whitespace-pre-wrap text-white/80">
              {meeting.description || 'Sem descrição.'}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Agenda</h2>
            <p className="mt-2 whitespace-pre-wrap text-white/80">
              {meeting.agenda || 'Sem agenda.'}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Minutas</h2>
            <p className="mt-2 whitespace-pre-wrap text-white/80">
              {meeting.minutes || 'Sem minutas.'}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Participantes</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {meeting.participants.length ? (
                meeting.participants.map((participant : any) => (
                  <span
                    key={participant.id}
                    className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm text-purple-100"
                  >
                    {participant.user.name || participant.user.email}
                  </span>
                ))
              ) : (
                <p className="text-sm text-purple-200/80">Nenhum participante definido.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-sm text-purple-200/80">
        <h2 className="mb-3 text-lg font-semibold text-white">Comentários</h2>
        {meeting.comments.length ? (
          <div className="space-y-4">
            {meeting.comments.map((comment : any) => (
              <div key={comment.id} className="rounded-lg border border-purple-500/10 bg-gray-800/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">
                    {comment.user.name || comment.user.email}
                  </p>
                  <span className="text-xs text-purple-200/60">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Sem comentários.</p>
        )}
      </div>
    </div>
  );
}