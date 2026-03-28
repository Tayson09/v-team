import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Bem-vindo, {session.user?.name || session.user?.email}!</p>
    </div>
  );
}