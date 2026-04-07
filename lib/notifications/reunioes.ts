import { prisma } from '@/lib/prisma';
import { notifyUser } from './index';
import { NotificationType } from '@prisma/client';

export async function notifyMeetingCreated(meetingId: number, participantIds: number[]) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { project: true },
  });
  if (!meeting) return;

  const participants = await prisma.user.findMany({ where: { id: { in: participantIds } } });
  for (const p of participants) {
    if (!p.email) continue;
    await notifyUser({
      userId: p.id,
      email: p.email,
      title: `Nova reunião: ${meeting.title}`,
      message: `Data: ${meeting.date.toLocaleString()}. Projeto: ${meeting.project?.name || 'Sem projeto'}.`,
      type: NotificationType.MEETING_REMINDER,
      entityType: 'Meeting',
      entityId: meetingId,
    });
  }
}

export async function notifyMeetingEdited(meetingId: number, participantIds: number[], changes: string[]) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { project: true },
  });
  if (!meeting) return;

  const participants = await prisma.user.findMany({ where: { id: { in: participantIds } } });
  for (const p of participants) {
    if (!p.email) continue;
    await notifyUser({
      userId: p.id,
      email: p.email,
      title: `Reunião atualizada: ${meeting.title}`,
      message: `A reunião foi alterada: ${changes.join(', ')}. Nova data: ${meeting.date.toLocaleString()}.`,
      type: NotificationType.SYSTEM,
      entityType: 'Meeting',
      entityId: meetingId,
    });
  }
}

export async function notifyMeetingDeleted(meetingId: number, meetingTitle: string, participantIds: number[]) {
  const participants = await prisma.user.findMany({ where: { id: { in: participantIds } } });
  for (const p of participants) {
    if (!p.email) continue;
    await notifyUser({
      userId: p.id,
      email: p.email,
      title: `Reunião cancelada: ${meetingTitle}`,
      message: `A reunião "${meetingTitle}" foi cancelada/excluída.`,
      type: NotificationType.SYSTEM,
      entityType: 'Meeting',
      entityId: meetingId,
    });
  }
}