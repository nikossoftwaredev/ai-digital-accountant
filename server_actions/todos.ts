"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

export const createTodo = async (title: string, description?: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        userId: session.user.id,
      },
    });

    revalidatePath("/");
    return { success: true, todo };
  } catch (error) {
    console.error("Error creating todo:", error);
    return { success: false, error: "Failed to create todo" };
  }
};

export const updateTodo = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    completed?: boolean;
  }
) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    // First check if the todo belongs to the user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTodo)
      return { success: false, error: "Todo not found or unauthorized" };

    const todo = await prisma.todo.update({
      where: { id },
      data,
    });

    revalidatePath("/");
    return { success: true, todo };
  } catch (error) {
    console.error("Error updating todo:", error);
    return { success: false, error: "Failed to update todo" };
  }
};

export const deleteTodo = async (id: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    // First check if the todo belongs to the user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTodo)
      return { success: false, error: "Todo not found or unauthorized" };

    await prisma.todo.delete({
      where: { id },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting todo:", error);
    return { success: false, error: "Failed to delete todo" };
  }
};

export const getTodos = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id)
    return { success: false, error: "Unauthorized", todos: [] };

  try {
    const todos = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, todos };
  } catch (error) {
    console.error("Error fetching todos:", error);
    return { success: false, error: "Failed to fetch todos", todos: [] };
  }
};

export const toggleTodoComplete = async (id: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    // First get the current todo state
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTodo)
      return { success: false, error: "Todo not found or unauthorized" };

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        completed: !existingTodo.completed,
      },
    });

    revalidatePath("/");
    return { success: true, todo };
  } catch (error) {
    console.error("Error toggling todo:", error);
    return { success: false, error: "Failed to toggle todo" };
  }
};