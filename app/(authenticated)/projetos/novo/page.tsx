import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { createProject, getAllUsers } from "../../../actions/projects";
import ProjectForm from "../../../components/ProjectForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { any } from "zod";

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/projetos");
  }

  const users = await getAllUsers();
  const usersFormatted = users.map(user => ({
    id: user.id,
    nome: user.name,
    email: user.email
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/projetos"
        className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-4 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para projetos
      </Link>

      <div className="rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Criar Novo Projeto</h1>
        <ProjectForm action={createProject} users={usersFormatted} />
      </div>
    </div>
  );
}