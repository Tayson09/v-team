"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteMember } from '../actions/teams';

export default function MemberActions({ memberId }: { memberId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm('Tem certeza que deseja excluir este membro?');
    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await deleteMember({ id: memberId });

      if (!result.success) {
        throw new Error(result.message);
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao excluir membro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={`/equipe/${memberId}/editar`}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Editar
      </Link>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Excluindo...' : 'Excluir'}
      </button>
    </div>
  );
}