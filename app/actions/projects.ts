"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Verifica se o usuário é admin (lança erro se não for)
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Acesso negado. Apenas administradores.");
  }
}

// Verifica se o usuário tem acesso ao projeto (admin ou membro)
async function canAccessProject(projectId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return false;

  const userId = parseInt((session.user as any).id, 10);
  const userRole = (session.user as any).role;

  if (userRole === "ADMIN") return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: userId,
      },
    },
  });
  return !!member;
}

// Criar projeto (admin)
export async function createProject(formData: FormData) {
   console.log("createProject chamada");
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const descricao = formData.get("descricao") as string;
  const status = formData.get("status") as "ativo" | "concluido" | "cancelado";
  const membros = JSON.parse(formData.get("membros") as string) as number[];

  const projeto = await prisma.project.create({
    data: {
      name: nome,
      description: descricao,
      status,
      progress: 0,
      members: {
        create: membros.map((usuarioId : any) => ({ user: { connect: { id: usuarioId } } })),
      },
    },
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${projeto.id}`);
}

// Atualizar projeto (admin)
export async function updateProject(id: number, formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const descricao = formData.get("descricao") as string;
  const status = formData.get("status") as "ativo" | "concluido" | "cancelado";
  const membros = JSON.parse(formData.get("membros") as string) as number[];

  // Atualiza membros: remove todos e adiciona os novos
  await prisma.project.update({
    where: { id },
    data: {
      name: nome,
      description: descricao,
      status,
      members: {
        deleteMany: {},
        create: membros.map((usuarioId : any) => ({ user: { connect: { id: usuarioId } } })),
      },
    },
  });

  revalidatePath(`/projetos/${id}`);
  redirect(`/projetos/${id}`);
}

// Excluir projeto (admin)
export async function deleteProject(id: number) {
  await requireAdmin();

  await prisma.project.delete({
    where: { id },
  });

  revalidatePath("/projetos");
  redirect("/projetos");
}

// Buscar projeto para visualização (com verificação de acesso)
export async function getProjectForView(id: number) {
  // Validação adicional
  if (!id || isNaN(id)) {
    console.error("ID inválido fornecido:", id);
    return null;
  }

  const session = await getServerSession(authOptions);
  if (!session) return null;

  const hasAccess = await canAccessProject(id);
  if (!hasAccess) return null;

  const projeto = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
      },
      tasks: {
        include: { assignee: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (projeto) {
    const totalTarefas = projeto._count.tasks;
    const tarefasConcluidas = projeto.tasks.filter(t => t.status === "completed").length;
    projeto.progress = totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;
  }

  return projeto;
}

// Buscar todos os projetos com base no perfil
export async function getProjects() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const userId = parseInt((session.user as any).id, 10);
  const userRole = (session.user as any).role;

  if (userRole === "ADMIN") {
    return await prisma.project.findMany({
      include: {
        members: { include: { user: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    // Colaborador: apenas projetos onde é membro
    const projetosDoUsuario = await prisma.project.findMany({
      where: {
        members: {
          some: { userId: userId },
        },
      },
      include: {
        members: { include: { user: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return projetosDoUsuario;
  }
}

// Buscar todos os usuários (para seleção de membros, apenas admin)
export async function getAllUsers() {
  await requireAdmin();
  return await prisma.user.findMany({
    select: { id: true, name: true, email: true},
    orderBy: { name: "asc" },
  });
}