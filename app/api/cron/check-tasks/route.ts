import { NextResponse } from 'next/server';
import { checkAllPendingTasks } from '@/lib/notifications/individual';

export async function GET(request: Request) {
  // 1. Verificar token de autorização (proteção contra chamadas externas)
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error('CRON_SECRET não configurada no ambiente.');
    return NextResponse.json(
      { error: 'Servidor mal configurado.' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    // 2. Executar a verificação de todas as tarefas pendentes
    await checkAllPendingTasks();

    // 3. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Verificação de tarefas concluída.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro no cron de tarefas:', error);
    return NextResponse.json(
      {
        error: 'Erro interno ao processar notificações.',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}