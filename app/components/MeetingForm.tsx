"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { createMeeting, updateMeeting } from '../actions/meetings';

type MemberUser = {
  id: number;
  name: string | null;
  email: string;
};

type ProjectOption = {
  id: number;
  name: string;
  members: {
    user: MemberUser;
  }[];
};

type MeetingData = {
  id: number;
  title: string;
  description: string | null;
  date: string | Date;
  duration: number | null;
  agenda: string | null;
  minutes: string | null;
  project: ProjectOption;
  participants: {
    user: MemberUser;
  }[];
};

type Props =
  | {
      mode: 'create';
      projects: ProjectOption[];
    }
  | {
      mode: 'edit';
      meeting: MeetingData;
      projects: ProjectOption[];
    };

function toDateTimeLocal(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function MeetingForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialProjectId =
    props.mode === 'edit'
      ? String(props.meeting.project?.id ?? '')
      : String(props.projects[0]?.id ?? '');

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    props.mode === 'edit'
      ? props.meeting.participants.map((p : any) => String(p.user.id))
      : []
  );

  const selectedProject = useMemo(() => {
    return props.projects.find((project) => String(project.id) === selectedProjectId);
  }, [props.projects, selectedProjectId]);

  const availableUsers = selectedProject?.members.map((member : any) => member.user) ?? [];

  useEffect(() => {
    setSelectedParticipantIds([]);
  }, [selectedProjectId]);

  const defaults =
    props.mode === 'edit'
      ? {
          title: props.meeting.title,
          description: props.meeting.description ?? '',
          date: toDateTimeLocal(props.meeting.date),
          duration: props.meeting.duration?.toString() ?? '',
          agenda: props.meeting.agenda ?? '',
          minutes: props.meeting.minutes ?? '',
        }
      : {
          title: '',
          description: '',
          date: '',
          duration: '',
          agenda: '',
          minutes: '',
        };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      if (formData.get('description') === '') formData.delete('description');
      if (formData.get('duration') === '') formData.delete('duration');
      if (formData.get('agenda') === '') formData.delete('agenda');
      if (formData.get('minutes') === '') formData.delete('minutes');

      const result =
        props.mode === 'create'
          ? await createMeeting(formData)
          : await updateMeeting(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

      const id = (result.data as any)?.id;
      if (!id) {
        throw new Error('A reunião foi salva, mas o ID não foi retornado.');
      }

      router.push(`/reunioes/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar reunião.');
    } finally {
      setLoading(false);
    }
  };

  if (!props.projects.length) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 text-white">
        <h1 className="text-2xl font-bold">Nova reunião</h1>
        <p className="mt-3 text-sm text-purple-200/80">
          Você ainda não tem acesso a nenhum projeto para criar reuniões.
        </p>
        <Link
          href="/projetos"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/reunioes"
        className="inline-flex items-center gap-2 text-purple-300 transition hover:text-purple-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="rounded-2xl border border-purple-500/20 bg-gray-900/60 p-6 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">
          {props.mode === 'create' ? 'Nova reunião' : 'Editar reunião'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {props.mode === 'edit' && (
            <input type="hidden" name="id" value={props.meeting.id} />
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Título</label>
            <input
              name="title"
              required
              minLength={3}
              defaultValue={defaults.title}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Descrição</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={defaults.description}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">Projeto</label>
              <select
                name="projectId"
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              >
                {props.projects.map((project : any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">Data e hora</label>
              <input
                name="date"
                type="datetime-local"
                required
                defaultValue={defaults.date}
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">Duração (min)</label>
              <input
                name="duration"
                type="number"
                min={1}
                defaultValue={defaults.duration}
                className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-200">Participantes</label>
              <select
                name="participantIds"
                multiple
                value={selectedParticipantIds}
                onChange={(e) =>
                  setSelectedParticipantIds(
                    Array.from(e.target.selectedOptions).map((option : any) => option.value)
                  )
                }
                className="min-h-[140px] w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
              >
                {availableUsers.map((user : any) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-purple-200/70">
                Use Ctrl/Cmd para selecionar mais de um participante.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Agenda</label>
            <textarea
              name="agenda"
              rows={3}
              defaultValue={defaults.agenda}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">Ata / Minutas</label>
            <textarea
              name="minutes"
              rows={5}
              defaultValue={defaults.minutes}
              className="w-full rounded-lg border border-purple-500/30 bg-gray-800 p-3 text-white outline-none transition focus:border-purple-400"
            />
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
            {loading ? 'Salvando...' : 'Salvar reunião'}
          </button>
        </form>
      </div>
    </div>
  );
}