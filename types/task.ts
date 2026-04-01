export interface NormalizedTask {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: number;
    name: string;
    description: string | null;
    status: string;
    statusEnum: string;
    progress: number;
    createdAt: string;
    updatedAt: string;
  };
  assignee: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  createdBy: {
    id: number;
    name: string | null;
    email: string;
  } | null;
}

export function normalizeTask(prismaTask: any): NormalizedTask {
  return {
    ...prismaTask,
    dueDate: prismaTask.dueDate?.toISOString() ?? null,
    completedAt: prismaTask.completedAt?.toISOString() ?? null,
    createdAt: prismaTask.createdAt.toISOString(),
    updatedAt: prismaTask.updatedAt.toISOString(),
    project: {
      ...prismaTask.project,
      createdAt: prismaTask.project.createdAt.toISOString(),
      updatedAt: prismaTask.project.updatedAt.toISOString(),
    },
    assignee: prismaTask.assignee ? {
      ...prismaTask.assignee,
      // assignee fields don't have dates
    } : null,
    createdBy: prismaTask.createdBy ? {
      ...prismaTask.createdBy,
    } : null,
  };
}

