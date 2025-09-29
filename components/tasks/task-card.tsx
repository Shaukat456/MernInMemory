"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MoreHorizontal, Calendar, MessageSquare, Paperclip, Clock, AlertTriangle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: {
    id: string
    title: string
    description: string
    status: "todo" | "in-progress" | "review" | "completed"
    priority: "low" | "medium" | "high" | "critical"
    tags: string[]
    assignee?: {
      id: string
      firstName: string
      lastName: string
      avatar?: string
    }
    dueDate?: string
    commentCount: number
    attachmentCount: number
    estimatedHours?: number
    dependencies?: Array<{
      id: string
      title: string
      status: string
    }>
  }
  onEdit?: (task: any) => void
  onDelete?: (task: any) => void
  onStatusChange?: (taskId: string, status: string) => void
  isDragging?: boolean
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, isDragging = false }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const priorityColors = {
    low: "bg-gray-500/20 text-gray-400 border-gray-500/20",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/20 text-red-400 border-red-500/20",
  }

  const statusColors = {
    todo: "bg-gray-500/20 text-gray-400",
    "in-progress": "bg-blue-500/20 text-blue-400",
    review: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-green-500/20 text-green-400",
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"
  const hasBlockedDependencies = task.dependencies?.some((dep) => dep.status !== "completed")

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:shadow-md",
        isDragging && "opacity-50 rotate-2 scale-105",
        isOverdue && "border-red-500/30",
        hasBlockedDependencies && "border-yellow-500/30",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h4 className="font-medium text-sm line-clamp-2 text-balance">{task.title}</h4>
            {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-6 w-6 p-0 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit?.(task)}>Edit Task</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-destructive focus:text-destructive">
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0 h-5 bg-secondary/50">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0 h-5 bg-secondary/50">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Priority & Status */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", statusColors[task.status])}>
            {task.status.replace("-", " ")}
          </Badge>
        </div>

        {/* Warnings */}
        {(isOverdue || hasBlockedDependencies) && (
          <div className="space-y-1">
            {isOverdue && (
              <div className="flex items-center text-xs text-red-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </div>
            )}
            {hasBlockedDependencies && (
              <div className="flex items-center text-xs text-yellow-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Blocked by dependencies
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center space-x-3">
            {task.commentCount > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3 mr-1" />
                {task.commentCount}
              </div>
            )}
            {task.attachmentCount > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3 mr-1" />
                {task.attachmentCount}
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {task.estimatedHours}h
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {task.dueDate && (
              <div className={cn("flex items-center text-xs", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
            {task.assignee && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/20">
                  {task.assignee.firstName[0]}
                  {task.assignee.lastName[0]}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
