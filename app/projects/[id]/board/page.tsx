"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { TaskBoard } from "@/components/tasks/task-board"
import { TaskCreateModal } from "@/components/tasks/task-create-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Settings, Users, Calendar } from "lucide-react"
import Link from "next/link"

export default function ProjectBoardPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createModalStatus, setCreateModalStatus] = useState("todo")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadProject()
    loadTasks()
  }, [projectId])

  const loadProject = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId")
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProject(data.data)
      } else {
        setError("Failed to load project")
      }
    } catch (error) {
      setError("Network error")
    }
  }

  const loadTasks = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId")
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data.data)
      } else {
        setError("Failed to load tasks")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      const sessionId = localStorage.getItem("sessionId")
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...data.data } : task)))
      }
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const handleTaskCreate = (status: string) => {
    setCreateModalStatus(status)
    setIsCreateModalOpen(true)
  }

  const handleTaskSubmit = async (taskData: any) => {
    const sessionId = localStorage.getItem("sessionId")
    const response = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(taskData),
    })

    if (response.ok) {
      const data = await response.json()
      setTasks((prev) => [...prev, data.data])
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create task")
    }
  }

  const handleTaskEdit = (task: any) => {
    // TODO: Implement task edit modal
    console.log("Edit task:", task)
  }

  const handleTaskDelete = async (task: any) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        const sessionId = localStorage.getItem("sessionId")
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        })

        if (response.ok) {
          setTasks((prev) => prev.filter((t) => t.id !== task.id))
        }
      } catch (error) {
        console.error("Failed to delete task:", error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const priorityColors = {
    low: "bg-gray-500/20 text-gray-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  }

  const statusColors = {
    active: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    archived: "bg-gray-500/20 text-gray-400",
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={statusColors[project.status]}>
                  {project.status}
                </Badge>
                <Badge variant="outline" className={priorityColors[project.priority]}>
                  {project.priority} priority
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {project.members.length + 1} members
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {project.taskCounts.total} tasks
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Task Board */}
      <div className="flex-1 overflow-hidden">
        <TaskBoard
          projectId={projectId}
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDelete}
        />
      </div>

      {/* Create Task Modal */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleTaskSubmit}
        projectMembers={project.members}
        availableTasks={tasks.filter((task) => task.status !== "completed")}
        initialStatus={createModalStatus}
      />
    </div>
  )
}
