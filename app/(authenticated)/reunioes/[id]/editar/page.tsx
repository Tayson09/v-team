import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import MeetingForm from '../../../../components/MeetingForm';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMeetingPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');

  const { id } = await params;
  const meetingId = Number(id);

  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    notFound();
  }

  const userId = Number((session.user as any).id);
  const isAdmin = (session.user as any).role === 'ADMIN';

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      project: {
        include: {
          members: {
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
  });

  if (!meeting) notFound();

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

  const projects = await prisma.project.findMany({
    where: isAdmin
      ? undefined
      : {
          members: {
            some: {
              userId,
            },
          },
        },
    select: {
      id: true,
      name: true,
      members: {
        select: {
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
      name: 'asc',
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <MeetingForm
        mode="edit"
        meeting={meeting as any}
        projects={projects}
      />
    </div>
  );
}