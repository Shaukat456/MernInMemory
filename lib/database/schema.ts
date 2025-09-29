// In-memory database schema with complex relationships and business logic

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  role: "admin" | "manager" | "member"
  createdAt: Date
  lastActive: Date
  preferences: {
    theme: "light" | "dark"
    notifications: boolean
    timezone: string
  }
}

export interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  memberIds: string[]
  status: "active" | "archived" | "completed"
  priority: "low" | "medium" | "high" | "critical"
  startDate: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
  settings: {
    isPublic: boolean
    allowGuestAccess: boolean
    autoArchive: boolean
  }
}

export interface Task {
  id: string
  title: string
  description: string
  projectId: string
  assigneeId?: string
  creatorId: string
  status: "todo" | "in-progress" | "review" | "completed"
  priority: "low" | "medium" | "high" | "critical"
  tags: string[]
  dependsOn: string[] // Task IDs this task depends on
  blockedBy: string[] // Task IDs that block this task
  estimatedHours?: number
  actualHours?: number
  dueDate?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  position: number // For drag & drop ordering
  comments: Comment[]
  attachments: Attachment[]
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
  mentions: string[] // User IDs mentioned in comment
}

export interface Attachment {
  id: string
  taskId: string
  userId: string
  filename: string
  url: string
  size: number
  mimeType: string
  createdAt: Date
}

export interface Activity {
  id: string
  userId: string
  projectId?: string
  taskId?: string
  type: "task_created" | "task_updated" | "task_completed" | "comment_added" | "user_assigned" | "project_created"
  description: string
  metadata: Record<string, any>
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: "mention" | "assignment" | "due_date" | "project_invite" | "task_completed"
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  createdAt: Date
}
