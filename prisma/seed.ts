import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client'; 
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'vteam',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const colaboradorPassword = await bcrypt.hash('colab123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vteam.com' },
    update: {},
    create: {
      email: 'admin@vteam.com',
      name: 'Administrador',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const colaborador = await prisma.user.upsert({
    where: { email: 'colaborador@vteam.com' },
    update: {},
    create: {
      email: 'colaborador@vteam.com',
      name: 'João Silva',
      password: colaboradorPassword,
      role: 'COLLABORATOR',
    },
  });

  const projeto = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Sistema V-Team',
      description: 'Projeto principal',
      status: 'active',
      progress: 0,
    },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: projeto.id, userId: admin.id, role: 'manager' },
      { projectId: projeto.id, userId: colaborador.id, role: 'member' },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  