"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteButton({ id, onDelete }: { id: number; onDelete: (id: number) => void }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.")) {
      startTransition(() => {
        onDelete(id);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      title="Excluir"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}