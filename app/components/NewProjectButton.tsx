"use client";

import { Plus } from "lucide-react";

interface NewProjectButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function NewProjectButton({ className, children }: NewProjectButtonProps) {
  const handleClick = () => {
    console.log("Botão clicado - redirecionando via window.location");
    window.location.href = "/projetos/novo";
  };

  return (
    <button
      onClick={handleClick}
      className={
        className ||
        "inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
      }
    >
      <Plus size={20} />
      {children || "Novo Projeto"}
    </button>
  );
}