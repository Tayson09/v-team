import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { updateProject, getAllUsers } from "../../../../actions/projects";
import ProjectForm from "../../../../components/ProjectForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/projetos");
  }

  // Aguarda params
  const resolvedParams = await params;
  const projectId = parseInt(resolvedParams.id, 10);
  if (isNaN(projectId)) {
    redirect("/projetos");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
    },
  });

  if (!project) {
    redirect("/projetos");
  }

  const users = await getAllUsers();
  const mappedUsers = users.map((user) => ({
    id: user.id,
    nome: user.name,
    email: user.email,
  }));

  const initialData = {
    id: project.id,
    nome: project.name,           // mapeia para o formulário que espera 'nome'
    descricao: project.description,
    status: project.status,
    membros: project.members.map((m) => m.userId), // ajuste para o nome do campo na tabela de junção
  };

  const updateWithId = async (formData: FormData) => {
    "use server";
    await updateProject(projectId, formData);
  };

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
        <h1 className="text-2xl font-bold text-white mb-6">Editar Projeto</h1>
        <ProjectForm initialData={initialData} action={updateWithId} users={mappedUsers} />
      </div>
    </div>
  );
}