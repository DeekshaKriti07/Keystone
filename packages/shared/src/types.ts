// ─── Enums ───────────────────────────────────────────────────────────
export const TaskStatus = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const WorkspaceRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const ActivityAction = {
  CREATED: 'created',
  UPDATED: 'updated',
  MOVED: 'moved',
  ASSIGNED: 'assigned',
  COMMENTED: 'commented',
  DELETED: 'deleted',
} as const;
export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];

// ─── Models ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  user?: User;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  project?: Project;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  action: ActivityAction;
  detail: string;
  timestamp: string;
  user?: User;
}

// ─── API payloads ────────────────────────────────────────────────────
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  projectId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position?: number;
}

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  status: number;
}

// ─── Socket events ───────────────────────────────────────────────────
export interface ServerToClientEvents {
  'task:created': (task: Task) => void;
  'task:updated': (task: Task) => void;
  'task:deleted': (data: { id: string }) => void;
  'task:moved': (data: { id: string; status: TaskStatus; position: number }) => void;
  'presence:join': (data: { userId: string; taskId?: string }) => void;
  'presence:leave': (data: { userId: string }) => void;
}

export interface ClientToServerEvents {
  'presence:viewing': (data: { taskId: string | null }) => void;
}

