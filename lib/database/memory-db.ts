// Sophisticated in-memory database with advanced querying and relationships

import type { User, Project, Task, Activity, Notification, Comment } from "./schema"

class InMemoryDatabase {
  private users: Map<string, User> = new Map()
  private projects: Map<string, Project> = new Map()
  private tasks: Map<string, Task> = new Map()
  private activities: Map<string, Activity> = new Map()
  private notifications: Map<string, Notification> = new Map()
  private sessions: Map<string, { userId: string; expiresAt: Date }> = new Map()

  // Advanced indexing for performance
  private usersByEmail: Map<string, string> = new Map()
  private tasksByProject: Map<string, Set<string>> = new Map()
  private tasksByAssignee: Map<string, Set<string>> = new Map()
  private projectsByOwner: Map<string, Set<string>> = new Map()
  private activitiesByProject: Map<string, string[]> = new Map()

  constructor() {
    this.seedData()
  }

  // User operations
  createUser(userData: Omit<User, "id" | "createdAt" | "lastActive">): User {
    const id = this.generateId()
    const user: User = {
      ...userData,
      id,
      createdAt: new Date(),
      lastActive: new Date(),
    }

    this.users.set(id, user)
    this.usersByEmail.set(user.email, id)
    return user
  }

  getUserById(id: string): User | null {
    return this.users.get(id) || null
  }

  getUserByEmail(email: string): User | null {
    const userId = this.usersByEmail.get(email)
    return userId ? this.users.get(userId) || null : null
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.users.get(id)
    if (!user) return null

    const updatedUser = { ...user, ...updates }
    this.users.set(id, updatedUser)
    return updatedUser
  }

  // Project operations with complex business logic
  createProject(projectData: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
    const id = this.generateId()
    const project: Project = {
      ...projectData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.projects.set(id, project)

    // Update indexes
    if (!this.projectsByOwner.has(project.ownerId)) {
      this.projectsByOwner.set(project.ownerId, new Set())
    }
    this.projectsByOwner.get(project.ownerId)!.add(id)
    this.tasksByProject.set(id, new Set())

    this.logActivity({
      userId: project.ownerId,
      projectId: id,
      type: "project_created",
      description: `Created project "${project.name}"`,
      metadata: { projectName: project.name },
    })

    return project
  }

  getProjectById(id: string): Project | null {
    return this.projects.get(id) || null
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id)
    if (!project) return null

    const updatedProject = { ...project, ...updates, updatedAt: new Date() }
    this.projects.set(id, updatedProject)
    return updatedProject
  }

  deleteProject(id: string): boolean {
    const project = this.projects.get(id)
    if (!project) return false

    // Delete all tasks in the project
    const taskIds = this.tasksByProject.get(id) || new Set()
    taskIds.forEach((taskId) => this.deleteTask(taskId))

    // Remove from indexes
    this.projects.delete(id)
    this.tasksByProject.delete(id)
    this.projectsByOwner.get(project.ownerId)?.delete(id)
    this.activitiesByProject.delete(id)

    return true
  }

  getProjectsByUser(userId: string): Project[] {
    const projects: Project[] = []

    // Get owned projects
    const ownedProjectIds = this.projectsByOwner.get(userId) || new Set()
    ownedProjectIds.forEach((id) => {
      const project = this.projects.get(id)
      if (project) projects.push(project)
    })

    // Get member projects
    this.projects.forEach((project) => {
      if (project.memberIds.includes(userId) && !ownedProjectIds.has(project.id)) {
        projects.push(project)
      }
    })

    return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  // Task operations with dependency management
  createTask(taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "attachments">): Task {
    const id = this.generateId()
    const task: Task = {
      ...taskData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
      attachments: [],
    }

    // Validate dependencies
    if (task.dependsOn.length > 0) {
      const hasCircularDependency = this.checkCircularDependency(id, task.dependsOn)
      if (hasCircularDependency) {
        throw new Error("Circular dependency detected")
      }
    }

    this.tasks.set(id, task)

    // Update indexes
    if (!this.tasksByProject.has(task.projectId)) {
      this.tasksByProject.set(task.projectId, new Set())
    }
    this.tasksByProject.get(task.projectId)!.add(id)

    if (task.assigneeId) {
      if (!this.tasksByAssignee.has(task.assigneeId)) {
        this.tasksByAssignee.set(task.assigneeId, new Set())
      }
      this.tasksByAssignee.get(task.assigneeId)!.add(id)
    }

    this.logActivity({
      userId: task.creatorId,
      projectId: task.projectId,
      taskId: id,
      type: "task_created",
      description: `Created task "${task.title}"`,
      metadata: { taskTitle: task.title },
    })

    return task
  }

  getTaskById(id: string): Task | null {
    return this.tasks.get(id) || null
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(id)
    if (!task) return null

    const updatedTask = { ...task, ...updates, updatedAt: new Date() }
    this.tasks.set(id, updatedTask)

    // Update indexes if assignee changed
    if (updates.assigneeId !== undefined) {
      if (task.assigneeId) {
        this.tasksByAssignee.get(task.assigneeId)?.delete(id)
      }
      if (updates.assigneeId) {
        if (!this.tasksByAssignee.has(updates.assigneeId)) {
          this.tasksByAssignee.set(updates.assigneeId, new Set())
        }
        this.tasksByAssignee.get(updates.assigneeId)!.add(id)
      }
    }

    this.logActivity({
      userId: updates.assigneeId || task.creatorId,
      projectId: task.projectId,
      taskId: id,
      type: "task_updated",
      description: `Updated task "${task.title}"`,
      metadata: { changes: updates },
    })

    return updatedTask
  }

  deleteTask(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    // Remove from indexes
    this.tasks.delete(id)
    this.tasksByProject.get(task.projectId)?.delete(id)
    if (task.assigneeId) {
      this.tasksByAssignee.get(task.assigneeId)?.delete(id)
    }

    // Remove dependencies
    this.tasks.forEach((otherTask) => {
      if (otherTask.dependsOn.includes(id)) {
        otherTask.dependsOn = otherTask.dependsOn.filter((depId) => depId !== id)
      }
      if (otherTask.blockedBy.includes(id)) {
        otherTask.blockedBy = otherTask.blockedBy.filter((blockerId) => blockerId !== id)
      }
    })

    return true
  }

  getTasksByProject(
    projectId: string,
    filters?: {
      status?: string
      assigneeId?: string
      priority?: string
      tags?: string[]
    },
  ): Task[] {
    const taskIds = this.tasksByProject.get(projectId) || new Set()
    let tasks = Array.from(taskIds)
      .map((id) => this.tasks.get(id)!)
      .filter(Boolean)

    if (filters) {
      if (filters.status) {
        tasks = tasks.filter((task) => task.status === filters.status)
      }
      if (filters.assigneeId) {
        tasks = tasks.filter((task) => task.assigneeId === filters.assigneeId)
      }
      if (filters.priority) {
        tasks = tasks.filter((task) => task.priority === filters.priority)
      }
      if (filters.tags && filters.tags.length > 0) {
        tasks = tasks.filter((task) => filters.tags!.some((tag) => task.tags.includes(tag)))
      }
    }

    return tasks.sort((a, b) => a.position - b.position)
  }

  // Comment operations
  addComment(
    taskId: string,
    commentData: {
      userId: string
      content: string
      mentions: string[]
    },
  ): Comment {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error("Task not found")
    }

    const comment: Comment = {
      id: this.generateId(),
      taskId,
      userId: commentData.userId,
      content: commentData.content,
      mentions: commentData.mentions,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    task.comments.push(comment)
    this.tasks.set(taskId, task)

    // Log activity
    this.logActivity({
      userId: commentData.userId,
      projectId: task.projectId,
      taskId,
      type: "comment_added",
      description: `Added a comment to "${task.title}"`,
      metadata: { commentId: comment.id },
    })

    return comment
  }

  updateComment(commentId: string, taskId: string, userId: string, content: string): Comment | null {
    const task = this.tasks.get(taskId)
    if (!task) return null

    const commentIndex = task.comments.findIndex((c) => c.id === commentId)
    if (commentIndex === -1) return null

    const comment = task.comments[commentIndex]
    if (comment.userId !== userId) return null // Only comment author can edit

    comment.content = content
    comment.updatedAt = new Date()
    comment.mentions = this.extractMentions(content)

    this.tasks.set(taskId, task)
    return comment
  }

  deleteComment(commentId: string, taskId: string, userId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    const commentIndex = task.comments.findIndex((c) => c.id === commentId)
    if (commentIndex === -1) return false

    const comment = task.comments[commentIndex]
    if (comment.userId !== userId) return false // Only comment author can delete

    task.comments.splice(commentIndex, 1)
    this.tasks.set(taskId, task)
    return true
  }

  // Advanced dependency checking
  private checkCircularDependency(taskId: string, dependencies: string[], visited: Set<string> = new Set()): boolean {
    if (visited.has(taskId)) return true
    visited.add(taskId)

    for (const depId of dependencies) {
      const depTask = this.tasks.get(depId)
      if (depTask && this.checkCircularDependency(depId, depTask.dependsOn, new Set(visited))) {
        return true
      }
    }

    return false
  }

  // Activity logging
  private logActivity(activityData: Omit<Activity, "id" | "createdAt">): void {
    const id = this.generateId()
    const activity: Activity = {
      ...activityData,
      id,
      createdAt: new Date(),
    }

    this.activities.set(id, activity)

    if (activity.projectId) {
      if (!this.activitiesByProject.has(activity.projectId)) {
        this.activitiesByProject.set(activity.projectId, [])
      }
      this.activitiesByProject.get(activity.projectId)!.unshift(id)
    }
  }

  getActivitiesByProject(projectId: string, limit = 50): Activity[] {
    const activityIds = this.activitiesByProject.get(projectId) || []
    return activityIds
      .slice(0, limit)
      .map((id) => this.activities.get(id)!)
      .filter(Boolean)
  }

  // Notification operations
  createNotification(notificationData: Omit<Notification, "id" | "isRead" | "createdAt">): Notification {
    const id = this.generateId()
    const notification: Notification = {
      ...notificationData,
      id,
      isRead: false,
      createdAt: new Date(),
    }

    this.notifications.set(id, notification)
    return notification
  }

  getNotificationsByUser(
    userId: string,
    options?: {
      unreadOnly?: boolean
      limit?: number
    },
  ): Notification[] {
    const allNotifications = Array.from(this.notifications.values()).filter((n) => n.userId === userId)

    let filtered = allNotifications
    if (options?.unreadOnly) {
      filtered = allNotifications.filter((n) => !n.isRead)
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, options?.limit || 50)
  }

  markNotificationAsRead(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId)
    if (!notification || notification.userId !== userId) return false

    notification.isRead = true
    this.notifications.set(notificationId, notification)
    return true
  }

  markAllNotificationsAsRead(userId: string): number {
    let count = 0
    this.notifications.forEach((notification) => {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true
        count++
      }
    })
    return count
  }

  // Session management
  createSession(userId: string): string {
    const sessionId = this.generateId()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour sessions

    this.sessions.set(sessionId, { userId, expiresAt })
    return sessionId
  }

  validateSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId)
    if (!session || session.expiresAt < new Date()) {
      this.sessions.delete(sessionId)
      return null
    }
    return session.userId
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  // User lookup by username for mentions
  getUserByUsername(username: string): User | null {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user
      }
    }
    return null
  }

  // Extract mentions from text
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1]
      const user = this.getUserByUsername(username)
      if (user) {
        mentions.push(user.id)
      }
    }

    return [...new Set(mentions)] // Remove duplicates
  }

  // Seed data for development
  private seedData(): void {
    // Create demo users
    const admin = this.createUser({
      email: "admin@taskflow.com",
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      preferences: {
        theme: "dark",
        notifications: true,
        timezone: "UTC",
      },
    })

    const manager = this.createUser({
      email: "manager@taskflow.com",
      username: "manager",
      firstName: "Project",
      lastName: "Manager",
      role: "manager",
      preferences: {
        theme: "light",
        notifications: true,
        timezone: "UTC",
      },
    })

    const developer = this.createUser({
      email: "dev@taskflow.com",
      username: "developer",
      firstName: "John",
      lastName: "Developer",
      role: "member",
      preferences: {
        theme: "dark",
        notifications: true,
        timezone: "UTC",
      },
    })

    // Create demo project
    const project = this.createProject({
      name: "TaskFlow Development",
      description: "Building the next-generation task management system",
      ownerId: manager.id,
      memberIds: [admin.id, developer.id],
      status: "active",
      priority: "high",
      startDate: new Date(),
      settings: {
        isPublic: false,
        allowGuestAccess: false,
        autoArchive: false,
      },
    })

    // Create demo tasks with dependencies
    const backendTask = this.createTask({
      title: "Setup Backend Architecture",
      description: "Design and implement the core backend infrastructure",
      projectId: project.id,
      assigneeId: developer.id,
      creatorId: manager.id,
      status: "completed",
      priority: "high",
      tags: ["backend", "architecture"],
      dependsOn: [],
      blockedBy: [],
      estimatedHours: 16,
      actualHours: 14,
      position: 1,
    })

    const apiTask = this.createTask({
      title: "Implement REST APIs",
      description: "Create all necessary API endpoints for the application",
      projectId: project.id,
      assigneeId: developer.id,
      creatorId: manager.id,
      status: "in-progress",
      priority: "high",
      tags: ["backend", "api"],
      dependsOn: [backendTask.id],
      blockedBy: [],
      estimatedHours: 24,
      position: 2,
    })

    this.createTask({
      title: "Design User Interface",
      description: "Create mockups and designs for the user interface",
      projectId: project.id,
      assigneeId: admin.id,
      creatorId: manager.id,
      status: "review",
      priority: "medium",
      tags: ["frontend", "design"],
      dependsOn: [],
      blockedBy: [],
      estimatedHours: 12,
      position: 3,
    })

    this.createTask({
      title: "Implement Frontend Components",
      description: "Build React components based on the designs",
      projectId: project.id,
      creatorId: manager.id,
      status: "todo",
      priority: "medium",
      tags: ["frontend", "react"],
      dependsOn: [apiTask.id],
      blockedBy: [],
      estimatedHours: 32,
      position: 4,
    })
  }
}

// Singleton instance
export const db = new InMemoryDatabase()
