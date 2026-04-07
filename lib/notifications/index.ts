import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

export async function createNotification({
  userId,
  title,
  message,
  type,           
  entityType,
  entityId,
  link,
}: {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;   // enum
  entityType?: string;
  entityId?: number;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type.toString(),        
      typeEnum: type,               
      entityType,
      entityId,
      link,
    },
  });
}

// Enviar e-mail via Google Apps Script (webhook)
export async function sendEmailViaGas(recipientEmail: string, subject: string, body: string) {
  const GAS_WEBHOOK_URL = process.env.GAS_NOTIFICATION_WEBHOOK_URL; // URL do seu script do Google
  if (!GAS_WEBHOOK_URL) return;

  await fetch(GAS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmail, subject, body }),
  }).catch(console.error);
}

// Função que registra + envia e-mail (opcional)
export async function notifyUser({
  userId,
  email,
  title,
  message,
  type,
  entityType,
  entityId,
  sendEmail = true,
}: {
  userId: number;
  email: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: number;
  sendEmail?: boolean;
}) {
  // 1. Salvar no banco
  await createNotification({ userId, title, message, type, entityType, entityId });

  // 2. Enviar e-mail se necessário
  if (sendEmail) {
    await sendEmailViaGas(email, title, message);
  }
}