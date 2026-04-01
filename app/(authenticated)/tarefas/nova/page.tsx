import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import TaskCreateForm from "../../../components/TaskCreateForm";

type ProjectOption = {
  id: number;
  name: string;
  members: {
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  }[];
};

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number((session.user as any).id);
  const isAdmin = (session.user as any).role === "ADMIN";

  if (!Number.isInteger(userId)) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: isAdmin
      ? undefined
      : {
          members: {
            some: {
              userId,
            },
          },
        },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <TaskCreateForm projects={projects as ProjectOption[]} />
    </div>
  );
}