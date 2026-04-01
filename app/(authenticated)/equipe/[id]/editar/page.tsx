import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import MemberForm from '../../../../components/MemberFom';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMemberPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');

  if ((session.user as any).role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const memberId = Number(id);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    notFound();
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!member) notFound();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <MemberForm mode="edit" member={member} />
    </div>
  );
}