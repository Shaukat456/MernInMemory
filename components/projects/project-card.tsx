"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, Calendar, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    status: "active" | "archived" | "completed"
    priority: "low" | "medium" | "high" | "critical"
    owner: {
      id: string
      firstName: string
      lastName: string
      avatar?: string
    }
    members: Array<{
      id: string
      firstName: string
      lastName: string
      avatar?: string
    }>
    taskCounts: {
      total: number
      completed: number
      inProgress: number
      todo: number
    }
    endDate?: string
    updatedAt: string
  }
  onEdit?: (project: any) => void
  onDelete?: (project: any) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const completionPercentage =
    project.taskCounts.total > 0 ? Math.round((project.taskCounts.completed / project.taskCounts.total) * 100) : 0

  const priorityColors = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/20 text-red-400 border-red-500/20",
  }

  const statusColors = {
    active: "bg-blue-500/20 text-blue-400 border-blue-500/20",
    completed: "bg-green-500/20 text-green-400 border-green-500/20",
    archived: "bg-gray-500/20 text-gray-400 border-gray-500/20",
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <Link href={`/projects/${project.id}`}>
              <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1">
                {project.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit?.(project)}>Edit Project</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(project)} className="text-destructive focus:text-destructive">
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className={cn("text-xs", statusColors[project.status])}>
            {project.status}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", priorityColors[project.priority])}>
            {project.priority}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center text-green-400">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">{project.taskCounts.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center text-blue-400">
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">{project.taskCounts.inProgress}</span>
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center text-muted-foreground">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">{project.taskCounts.todo}</span>
            </div>
            <p className="text-xs text-muted-foreground">To Do</p>
          </div>
        </div>

        {/* Team & Date */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {project.members.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary/20">
                    {member.firstName[0]}
                    {member.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">+{project.members.length - 3}</span>
                </div>
              )}
            </div>
          </div>

          {project.endDate && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(project.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
