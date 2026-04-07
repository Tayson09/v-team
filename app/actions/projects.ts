"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  notifyProjectCreated,
  notifyProjectEdited,
  notifyProjectDeleted,
  notifyMemberAdded,
  notifyMemberRemoved,
  notifyProjectCompleted,
} from "@/lib/notifications/projetos";

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

  // Mapear status para enum (se usar statusEnum no schema)
  const statusEnum = status === "ativo" ? "ACTIVE" : status === "concluido" ? "COMPLETED" : "ARCHIVED";

  const projeto = await prisma.project.create({
    data: {
      name: nome,
      description: descricao,
      status: status, // campo legado string
      statusEnum: statusEnum,
      progress: 0,
      members: {
        create: membros.map((usuarioId) => ({ user: { connect: { id: usuarioId } } })),
      },
    },
  });

  // Notificar todos os membros (incluindo o admin criador)
  await notifyProjectCreated(projeto.id, membros).catch(console.error);

  revalidatePath("/projetos");
  redirect(`/projetos/${projeto.id}`);
}

// Atualizar projeto (admin)
export async function updateProject(id: number, formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const descricao = formData.get("descricao") as string;
  const status = formData.get("status") as "ativo" | "concluido" | "cancelado";
  const novosMembrosIds = JSON.parse(formData.get("membros") as string) as number[];

  // Buscar dados atuais do projeto (incluindo membros) para comparar
  const projetoAtual = await prisma.project.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  });
  if (!projetoAtual) throw new Error("Projeto não encontrado.");

  const membrosAntigosIds = projetoAtual.members.map(m => m.userId);
  const membrosAdicionados = novosMembrosIds.filter(id => !membrosAntigosIds.includes(id));
  const membrosRemovidos = membrosAntigosIds.filter(id => !novosMembrosIds.includes(id));

  // Detectar mudanças de campos relevantes
  const changes: string[] = [];
  if (projetoAtual.name !== nome) changes.push("nome");
  if (projetoAtual.description !== descricao) changes.push("descrição");
  if (projetoAtual.status !== status) {
    changes.push(`status: ${projetoAtual.status} → ${status}`);
  }

  const statusEnum = status === "ativo" ? "ACTIVE" : status === "concluido" ? "COMPLETED" : "ARCHIVED";

  // Atualizar projeto: remove todos os membros e adiciona os novos
  await prisma.project.update({
    where: { id },
    data: {
      name: nome,
      description: descricao,
      status: status,
      statusEnum: statusEnum,
      members: {
        deleteMany: {},
        create: novosMembrosIds.map((usuarioId) => ({ user: { connect: { id: usuarioId } } })),
      },
    },
  });

  // Disparar notificações (após a atualização)
  // 1. Notificar sobre membros adicionados
  for (const newMemberId of membrosAdicionados) {
    await notifyMemberAdded(id, nome, newMemberId, novosMembrosIds).catch(console.error);
  }
  // 2. Notificar sobre membros removidos
  for (const removedMemberId of membrosRemovidos) {
    await notifyMemberRemoved(id, nome, removedMemberId, novosMembrosIds).catch(console.error);
  }
  // 3. Notificar sobre edição do projeto (se houver mudanças)
  if (changes.length > 0) {
    await notifyProjectEdited(id, novosMembrosIds, changes).catch(console.error);
  }
  // 4. Notificar se o projeto foi concluído (status mudou para "concluido")
  if (status === "concluido" && projetoAtual.status !== "concluido") {
    await notifyProjectCompleted(id, novosMembrosIds).catch(console.error);
  }

  revalidatePath(`/projetos/${id}`);
  redirect(`/projetos/${id}`);
}

// Excluir projeto (admin)
export async function deleteProject(id: number) {
  await requireAdmin();

  // Buscar dados do projeto e seus membros ANTES de deletar
  const projeto = await prisma.project.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  });
  if (!projeto) throw new Error("Projeto não encontrado.");

  const membrosIds = projeto.members.map(m => m.userId);
  const projectName = projeto.name;

  // Deletar o projeto (e dependências em cascata? O schema tem onDelete? Vamos manter como estava)
  await prisma.project.delete({
    where: { id },
  });

  // Notificar todos os membros sobre a exclusão
  await notifyProjectDeleted(id, projectName, membrosIds).catch(console.error);

  revalidatePath("/projetos");
  redirect("/projetos");
}

// Buscar projeto para visualização (com verificação de acesso)
export async function getProjectForView(id: number) {
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
    const tarefasConcluidas = projeto.tasks.filter(t => t.status === "done").length; // ajuste: status "done" no enum
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
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}