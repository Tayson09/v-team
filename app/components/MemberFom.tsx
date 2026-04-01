"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { createMember, updateMember } from '../actions/teams';

type Member = {
  id: number;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'COLLABORATOR';
};

type Props =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      member: Member;
    };

export default function MemberForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults =
    props.mode === 'edit'
      ? {
          name: props.member.name ?? '',
          email: props.member.email,
          role: props.member.role,
        }
      : {
          name: '',
          email: '',
          role: 'COLLABORATOR' as const,
        };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      if (props.mode === 'create') {
        const result = await createMember(formData);
        if (!result.success) throw new Error(result.message);
        router.push('/equipe');
        router.refresh();
        return;
      }

      const result = await updateMember(formData);
      if (!result.success) throw new Error(result.message);
      router.push('/equipe');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar membro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/equipe"
        className="inline-flex items-center gap-2 text-purple-300 transition hover:text-purple-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">
          {props.mode === 'create' ? 'Novo membro' : 'Editar membro'}
        </h1>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {props.mode === 'edit' && (
            <input type="hidden" name="id" value={props.member.id} />
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Nome</label>
            <input
              name="name"
              required
              defaultValue={defaults.name}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">E-mail</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={defaults.email}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Senha</label>
            <input
              name="password"
              type="password"
              placeholder={props.mode === 'edit' ? 'Deixe em branco para manter' : 'Senha'}
              required={props.mode === 'create'}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Tipo de usuário</label>
            <select
              name="role"
              defaultValue={defaults.role}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            >
              <option value="COLLABORATOR">Colaborador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar membro'}
          </button>
        </form>
      </div>
    </div>
  );
}