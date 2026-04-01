import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import MemberForm from '../../../components/MemberFom';

export default async function NewMemberPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');

  if ((session.user as any).role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <MemberForm mode="create" />
    </div>
  );
}