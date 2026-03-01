"use client";

import { useState } from "react";
import { deleteTodo, toggleTodoComplete, updateTodo } from "@/server_actions/todos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Check, X } from "lucide-react";
import { TypographyRegular, TypographySmallReg } from "@/components/ui/typography";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/general/utils";

interface TodoItemProps {
  todo: {
    id: string;
    title: string;
    description: string | null;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
  };
  onUpdate: () => void;
}

export const TodoItem = ({ todo, onUpdate }: TodoItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      const result = await toggleTodoComplete(todo.id);
      if (result.success)
        onUpdate();
      else
        toast({
          title: "Error",
          description: result.error || "Failed to update todo",
          variant: "destructive",
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    setIsUpdating(true);
    try {
      const result = await deleteTodo(todo.id);
      if (result.success) {
        onUpdate();
        toast({
          title: "Success",
          description: "Todo deleted successfully",
        });
      } else
        toast({
          title: "Error",
          description: result.error || "Failed to delete todo",
          variant: "destructive",
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;

    setIsUpdating(true);
    try {
      const result = await updateTodo(todo.id, {
        title: editTitle,
        description: editDescription || undefined,
      });
      if (result.success) {
        setIsEditing(false);
        onUpdate();
        toast({
          title: "Success",
          description: "Todo updated successfully",
        });
      } else
        toast({
          title: "Error",
          description: result.error || "Failed to update todo",
          variant: "destructive",
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
  };

  if (isEditing)
    return (
      <Card className="p-4 space-y-3">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          disabled={isUpdating}
          placeholder="Todo title..."
        />
        <Textarea
          value={editDescription}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
          disabled={isUpdating}
          placeholder="Description (optional)..."
          className="min-h-[80px]"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSaveEdit}
            disabled={isUpdating || !editTitle.trim()}
            size="sm"
            variant="default"
          >
            <Check className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            onClick={handleCancelEdit}
            disabled={isUpdating}
            size="sm"
            variant="outline"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </Card>
    );

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={handleToggleComplete}
          disabled={isUpdating}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <TypographyRegular
            className={cn(
              "break-words",
              todo.completed && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </TypographyRegular>
          {todo.description && (
            <TypographySmallReg className="text-muted-foreground mt-1 break-words">
              {todo.description}
            </TypographySmallReg>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            onClick={() => setIsEditing(true)}
            disabled={isUpdating}
            size="icon"
            variant="ghost"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isUpdating}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};