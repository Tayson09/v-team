import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import MeetingForm from '../../../components/MeetingForm';

export default async function NewMeetingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = Number((session.user as any).id);
  const isAdmin = (session.user as any).role === 'ADMIN';

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
      <MeetingForm mode="create" projects={projects} />
    </div>
  );
}