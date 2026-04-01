import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getProjects } from "../../actions/projects";
import ProjectCard from "../../components/ProjectCard";
import { deleteProject } from "../../actions/projects";
import NewProjectButton from "../../components/NewProjectButton";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = (session.user as any).role === "ADMIN";
  const projects = await getProjects();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-transparent p-6 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Projetos
            </h1>
            <p className="text-purple-200/80 mt-2">
              {isAdmin
                ? "Gerencie todos os projetos da equipe"
                : "Visualize os projetos em que você está envolvido"}
            </p>
          </div>
          {isAdmin && <NewProjectButton />}
        </div>
      </div>

      {/* Grid de projetos */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-purple-200/60 text-lg">
            Nenhum projeto encontrado.
            {isAdmin && (
              <NewProjectButton className="text-purple-400 hover:underline ml-2 bg-transparent p-0 hover:bg-transparent">
                Crie o primeiro projeto
              </NewProjectButton>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project: any) => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={isAdmin}
              onDelete={async (id) => {
                "use server";
                await deleteProject(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}