"use client";

import { useState, useEffect, useCallback } from "react";
import { getTodos } from "@/server_actions/todos";
import { TodoItem } from "./todo-item";
import { AddTodoForm } from "./add-todo-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TypographyRegular } from "@/components/ui/typography";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    const result = await getTodos();
    if (result.success) setTodos(result.todos);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTodos();
  }, [fetchTodos]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>My Todos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddTodoForm onTodoAdded={fetchTodos} />

        {loading && (
          <TypographyRegular className="text-center text-muted-foreground">
            Loading todos...
          </TypographyRegular>
        )}

        {!loading && todos.length === 0 && (
          <TypographyRegular className="text-center text-muted-foreground">
            No todos yet. Create your first todo above!
          </TypographyRegular>
        )}

        {!loading && todos.length > 0 && (
          <div className="space-y-2">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onUpdate={fetchTodos}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};