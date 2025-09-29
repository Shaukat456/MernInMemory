"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { TaskCard } from "./task-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Filter, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TaskBoardProps {
  projectId: string
  tasks: any[]
  onTaskUpdate: (taskId: string, updates: any) => void
  onTaskCreate: (columnStatus: string) => void
  onTaskEdit: (task: any) => void
  onTaskDelete: (task: any) => void
}

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    color: "bg-gray-500/20 text-gray-400",
    count: 0,
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "bg-blue-500/20 text-blue-400",
    count: 0,
  },
  {
    id: "review",
    title: "Review",
    color: "bg-yellow-500/20 text-yellow-400",
    count: 0,
  },
  {
    id: "completed",
    title: "Completed",
    color: "bg-green-500/20 text-green-400",
    count: 0,
  },
]

export function TaskBoard({ projectId, tasks, onTaskUpdate, onTaskCreate, onTaskEdit, onTaskDelete }: TaskBoardProps) {
  const [filteredTasks, setFilteredTasks] = useState(tasks)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  // Get unique assignees for filter
  const assignees = Array.from(
    new Map(tasks.filter((task) => task.assignee).map((task) => [task.assignee.id, task.assignee])).values(),
  )

  // Filter tasks based on search and filters
  useEffect(() => {
    let filtered = tasks

    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((task) => task.priority === priorityFilter)
    }

    if (assigneeFilter !== "all") {
      filtered = filtered.filter((task) => task.assignee?.id === assigneeFilter)
    }

    setFilteredTasks(filtered)
  }, [tasks, searchQuery, priorityFilter, assigneeFilter])

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] = filteredTasks.filter((task) => task.status === column.id)
      return acc
    },
    {} as Record<string, any[]>,
  )

  // Update column counts
  const columnsWithCounts = COLUMNS.map((column) => ({
    ...column,
    count: tasksByStatus[column.id]?.length || 0,
  }))

  const handleDragStart = (start: any) => {
    setDraggedTaskId(start.draggableId)
  }

  const handleDragEnd = (result: DropResult) => {
    setDraggedTaskId(null)

    const { destination, source, draggableId } = result

    // Dropped outside the list
    if (!destination) {
      return
    }

    // Dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const taskId = draggableId
    const newStatus = destination.droppableId

    // Update task status
    onTaskUpdate(taskId, { status: newStatus })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-border/50"
          />
        </div>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 bg-background/50 border-border/50">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-40 bg-background/50 border-border/50">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.firstName} {assignee.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="border-border/50 bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Task Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="h-full flex gap-6 p-6 overflow-x-auto">
            {columnsWithCounts.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-80">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <Badge variant="secondary" className={cn("text-xs", column.color)}>
                      {column.count}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTaskCreate(column.id)}
                    className="h-8 w-8 p-0 hover:bg-accent/50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Column Content */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[200px] rounded-lg border-2 border-dashed transition-colors p-2",
                        snapshot.isDraggingOver ? "border-primary/50 bg-primary/5" : "border-border/30 bg-muted/20",
                      )}
                    >
                      <div className="space-y-3">
                        {tasksByStatus[column.id]?.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn("transition-transform", snapshot.isDragging && "rotate-2 scale-105")}
                              >
                                <TaskCard
                                  task={task}
                                  onEdit={onTaskEdit}
                                  onDelete={onTaskDelete}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}

                      {/* Empty State */}
                      {tasksByStatus[column.id]?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">No tasks in {column.title.toLowerCase()}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTaskCreate(column.id)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Add a task
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
