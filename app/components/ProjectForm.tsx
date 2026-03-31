"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

interface ProjectFormProps {
  initialData?: {
    id?: number;
    nome: string;
    descricao: string | null;
    status: string;
    membros: number[];
  };
  action: (formData: FormData) => Promise<void>;
  users: Array<{ id: number; nome: string | null; email: string }>;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
    >
      {pending ? "Salvando..." : isEditing ? "Atualizar Projeto" : "Criar Projeto"}
    </button>
  );
}

export default function ProjectForm({ initialData, action, users }: ProjectFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;
  const [selectedMembers, setSelectedMembers] = useState<number[]>(initialData?.membros || []);

  // Função para submeter o form com os membros serializados
  const handleSubmit = async (formData: FormData) => {
    formData.append("membros", JSON.stringify(selectedMembers));
    await action(formData);
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-purple-200 mb-1">
          Nome do Projeto *
        </label>
        <input
          type="text"
          id="nome"
          name="nome"
          required
          defaultValue={initialData?.nome}
          className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ex: V-Team App"
        />
      </div>

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-purple-200 mb-1">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={initialData?.descricao || ""}
          className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Descreva o objetivo do projeto..."
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-purple-200 mb-1">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initialData?.status || "ativo"}
          className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ativo">Ativo</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1">
          Membros da Equipe
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-purple-500/30 rounded-xl bg-gray-800/30">
          {users.map((user) => (
            <label key={user.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={user.id}
                checked={selectedMembers.includes(user.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMembers([...selectedMembers, user.id]);
                  } else {
                    setSelectedMembers(selectedMembers.filter((id) => id !== user.id));
                  }
                }}
                className="rounded border-purple-500 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-white">{user.nome || user.email}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition"
        >
          Cancelar
        </button>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}