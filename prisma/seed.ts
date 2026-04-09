import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não encontrado no .env");
}

const url = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace("/", ""),
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const usersData = [
    {
      name: "Tayson Silva",
      email: "tayson.silva99@gmail.com",
      password: "taysonsilva15",
      role: Role.ADMIN,
    },
    {
      name: "Ian Thiago",
      email: "ianthigo13@gmail.com",
      password: "IanThiago2005",
      role: Role.ADMIN,
    },
    {
      name: "Eduardo Guilherme",
      email: "guiilopes1147@gmail.com",
      password: "bananilsonfarofa",
      role: Role.COLLABORATOR,
    },
    {
      name: "Deyvidy Alves",
      email: "deyvidyalvessilva@gmail.com",
      password: "Zpfwmrfd",
      role: Role.COLLABORATOR,
    },
    {
      name: "Maria Gabrielle",
      email: "Gabriellesouza1711@gmail.com",
      password: "vortex202G",
      role: Role.COLLABORATOR,
    },
    {
      name: "Guilherme Leite",
      email: "guilherm.eleitesouza2018@gmail.com",
      password: "guilherme24244",
      role: Role.COLLABORATOR,
    },
  ];

  const saltRounds = 10;

  for (const userData of usersData) {
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
      },
      create: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
      },
    });

    console.log(`✅ Usuário ${userData.email} processado com sucesso.`);
  }

  console.log("🎉 Seed finalizado.");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });