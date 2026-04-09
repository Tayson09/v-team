"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTask } from "../../../actions/tasks";

export default function DeleteTaskButton({
  taskId,
  taskTitle,
}: {
  taskId: number;
  taskTitle: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteTask(taskId);
      if (result.success) {
        router.push("/tarefas");
        router.refresh();
      } else {
        alert(result.message);
        setIsConfirming(false);
      }
    } catch (error) {
      alert("Erro ao excluir tarefa.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConfirming) {
    return (
      <button
        onClick={() => setIsConfirming(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
      >
        <Trash2 size={18} />
        Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300">
        Excluir "{taskTitle}"?
      </span>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium disabled:opacity-50"
      >
        {isLoading ? "..." : "Sim"}
      </button>
      <button
        onClick={() => setIsConfirming(false)}
        disabled={isLoading}
        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
      >
        Não
      </button>
    </div>
  );
}