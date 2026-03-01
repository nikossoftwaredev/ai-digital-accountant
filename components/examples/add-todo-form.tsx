"use client";

import { useState } from "react";
import { createTodo } from "@/server_actions/todos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddTodoFormProps {
  onTodoAdded: () => void;
}

export const AddTodoForm = ({ onTodoAdded }: AddTodoFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createTodo(title, description || undefined);
      if (result.success) {
        setTitle("");
        setDescription("");
        onTodoAdded();
        toast({
          title: "Success",
          description: "Todo created successfully",
        });
      } else
        toast({
          title: "Error",
          description: result.error || "Failed to create todo",
          variant: "destructive",
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Todo title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSubmitting}
        required
      />
      <Textarea
        placeholder="Description (optional)..."
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        disabled={isSubmitting}
        className="min-h-20"
      />
      <Button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Todo
      </Button>
    </form>
  );
};