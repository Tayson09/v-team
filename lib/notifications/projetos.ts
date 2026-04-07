import { prisma } from '@/lib/prisma';
import { notifyUser } from './index';
import { NotificationType } from '@prisma/client';

export async function notifyProjectCreated(projectId: number, memberIds: number[]) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const members = await prisma.user.findMany({ where: { id: { in: memberIds } } });
  for (const member of members) {
    if (!member.email) continue;
    await notifyUser({
      userId: member.id,
      email: member.email,
      title: `Novo projeto: ${project.name}`,
      message: `O projeto "${project.name}" foi criado.`,
      type: NotificationType.SYSTEM,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}

export async function notifyProjectEdited(projectId: number, memberIds: number[], changes: string[]) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const members = await prisma.user.findMany({ where: { id: { in: memberIds } } });
  for (const member of members) {
    if (!member.email) continue;
    await notifyUser({
      userId: member.id,
      email: member.email,
      title: `Projeto atualizado: ${project.name}`,
      message: `O projeto "${project.name}" foi alterado: ${changes.join(', ')}.`,
      type: NotificationType.SYSTEM,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}

export async function notifyProjectCompleted(projectId: number, memberIds: number[]) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const members = await prisma.user.findMany({ where: { id: { in: memberIds } } });
  for (const member of members) {
    if (!member.email) continue;
    await notifyUser({
      userId: member.id,
      email: member.email,
      title: `Projeto concluído: ${project.name}`,
      message: `O projeto "${project.name}" foi marcado como concluído.`,
      type: NotificationType.SYSTEM,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}

export async function notifyProjectDeleted(projectId: number, projectName: string, memberIds: number[]) {
  const members = await prisma.user.findMany({ where: { id: { in: memberIds } } });
  for (const member of members) {
    if (!member.email) continue;
    await notifyUser({
      userId: member.id,
      email: member.email,
      title: `Projeto removido: ${projectName}`,
      message: `O projeto "${projectName}" foi excluído.`,
      type: NotificationType.SYSTEM,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}

export async function notifyMemberAdded(projectId: number, projectName: string, newMemberId: number, existingMemberIds: number[]) {
  const newMember = await prisma.user.findUnique({ where: { id: newMemberId } });
  if (!newMember) return;

  const members = await prisma.user.findMany({ where: { id: { in: existingMemberIds } } });
  for (const member of members) {
    if (!member.email) continue;
    await notifyUser({
      userId: member.id,
      email: member.email,
      title: `Novo membro no projeto ${projectName}`,
      message: `${newMember.name} entrou no projeto "${projectName}".`,
      type: NotificationType.SYSTEM,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}

export async function notifyMemberRemoved(projectId: number, projectName: string, removedMemberId: number, existingMemberIds: number[]) {
  const removedMember = await prisma.user.findUnique({ where: { id: removedMemberId } });
  if (!removedMember) return;

  const members = await prisma.user.findMany({ where: { id: { in: existingMemberIds } } });
  for (const member of members) {
    if (!member.email) continue;
    await notifyUser({
      userId: member.id,
      email: member.email,
      title: `Membro removido do projeto ${projectName}`,
      message: `${removedMember.name} foi removido do projeto "${projectName}".`,
      type: NotificationType.SYSTEM,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}