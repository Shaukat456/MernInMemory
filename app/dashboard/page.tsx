"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sidebar } from "@/components/layout/sidebar"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { RealtimeProvider } from "@/components/realtime/realtime-provider"
import { LayoutDashboard, FolderKanban, CheckCircle2, Clock, AlertTriangle, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId")
      if (!sessionId) {
        window.location.href = "/"
        return
      }

      console.log("[v0] Loading dashboard data with sessionId:", sessionId)

      // Load user profile
      const userResponse = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${sessionId}` },
      })

      console.log("[v0] User response status:", userResponse.status)

      if (userResponse.ok) {
        const userData = await userResponse.json()
        console.log("[v0] User data loaded:", userData)
        setUser(userData.data)
      } else {
        console.log("[v0] User authentication failed, redirecting to login")
        localStorage.removeItem("sessionId")
        window.location.href = "/"
        return
      }

      // Load projects
      const projectsResponse = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${sessionId}` },
      })

      console.log("[v0] Projects response status:", projectsResponse.status)

      let loadedProjects: any[] = []
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        console.log("[v0] Projects data loaded:", projectsData)
        loadedProjects = projectsData.data
        setProjects(loadedProjects)
      }

      // Load notifications
      const notificationsResponse = await fetch("/api/notifications?limit=5", {
        headers: { Authorization: `Bearer ${sessionId}` },
      })
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.data)
      }

      const allTasks: any[] = []
      for (const project of loadedProjects) {
        const tasksResponse = await fetch(`/api/projects/${project.id}/tasks`, {
          headers: { Authorization: `Bearer ${sessionId}` },
        })
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json()
          allTasks.push(...tasksData.data)
        }
      }

      setTasks(allTasks.slice(0, 10)) // Show recent 10 tasks

      const overdueTasks = allTasks.filter(
        (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed",
      )

      setStats({
        totalProjects: loadedProjects.length,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter((task) => task.status === "completed").length,
        overdueTasks: overdueTasks.length,
      })

      console.log("[v0] Dashboard data loaded successfully")
    } catch (error) {
      console.error("[v0] Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    window.location.href = "/"
    return null
  }

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

  return (
    <RealtimeProvider userId={user.id}>
      <div className="flex h-screen bg-background grid-background">
        <Sidebar user={user} projects={projects} notifications={notifications} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {user.firstName}! Here's what's happening with your projects.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationCenter userId={user.id} />
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProjects}</div>
                    <p className="text-xs text-muted-foreground">Active projects</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalTasks}</div>
                    <p className="text-xs text-muted-foreground">Across all projects</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{completionRate}%</div>
                    <Progress value={completionRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.overdueTasks}</div>
                    <p className="text-xs text-muted-foreground">Need attention</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Projects & Tasks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Projects */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Projects</CardTitle>
                      <Link href="/projects">
                        <Button variant="ghost" size="sm">
                          View all
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {projects.slice(0, 3).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <div>
                            <Link href={`/projects/${project.id}`}>
                              <h4 className="font-medium hover:text-primary transition-colors">{project.name}</h4>
                            </Link>
                            <p className="text-xs text-muted-foreground">{project.taskCounts.total} tasks</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {project.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recent Tasks */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Tasks</CardTitle>
                      <Button variant="ghost" size="sm">
                        View all
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                      >
                        <div className="flex items-center gap-3">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-400" />
                          )}
                          <div>
                            <h4 className="font-medium text-sm line-clamp-1">{task.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RealtimeProvider>
  )
}
