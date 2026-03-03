'use server'; // Run on the server, not the client

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import { TaskStatus, TaskCategory } from '../generated/prisma/client';
// import { auth } from '../../auth';
import { pusherServer } from '../lib/pusher-server';
import { getUserRole } from '../lib/permission';
import { BoardRole } from '../generated/prisma/client';
import { auth } from '../../auth';
import { notifyAssignedUser } from './notificationActions';

export async function moveTask(
    taskId: string,
    newColumnId: string,
    newOrder: number,
    boardId: string
) {
    const role = await getUserRole(boardId);
    if (!role) return { success: false, error: 'Unauthorized' };
    try {
        if (!taskId || !newColumnId || newOrder < 0) {
            return { success: false, error: 'Invalid input' };
        }
        // // Update the database
        // await prisma.$transaction([
        //     // Shift other tasks up
        //     prisma.task.updateMany({
        //         where: { columnId: newColumnId, order: { gte: newOrder }, id: { not: taskId } },
        //         data: { order: { increment: 1 } },
        //     }),

        // Find out which column they are dragging into
        const targetColumn = await prisma.column.findUnique({ where: { id: newColumnId } });
        if (!targetColumn) throw new Error("Column not found");

        // GUARD: If a normal MEMBER tries to drag into "Done", reject it!
        if (targetColumn.title === 'Done' && role === BoardRole.MEMBER) {
            return { success: false, error: 'Unauthorized: Only Reviewers and Leaders can approve tasks to Done.' };
        }

        // Update the task (Notice we use targetColumn.title for the status string)
        await prisma.task.update({
            where: { id: taskId },
            data: {
                columnId: newColumnId,
                order: newOrder,
                status: targetColumn.title
            },
        });

        // Broadcast the change to the specific board's channel
        // Fire Pusher
        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task moved' });
        revalidatePath(`/board/${boardId}`);

        // Revalidate the cache
        // This tells Next.js: "The data changed, throw away the cached HTML for the board page"
        revalidatePath(`/board/${boardId}`);
        return { success: true };

    } catch (error) {
        console.error("Failed to move task:", error);
        return { success: false, error: 'Failed to update task position' };
    }
}

export async function createTask(
    boardId: string,
    columnId: string,
    title: string,
    status: string,
    category: string,
    description?: string,
    assigneeId?: string
) {
    const role = await getUserRole(boardId);
    if (role !== BoardRole.LEADER) {
        return { success: false, error: 'Unauthorized: Only Leaders can create tasks.' };
    }

    // const session = await auth();
    // if (!session?.user) return { success: false, error: 'Unauthorized' };

    try {
        // Enforce WIP limit server-side
        const column = await prisma.column.findUnique({
            where: { id: columnId },
            include: { _count: { select: { tasks: true } } },
        });
        if (column?.wipLimit !== null && column?.wipLimit !== undefined) {
            if (column._count.tasks >= column.wipLimit) {
                return { success: false, error: `WIP limit of ${column.wipLimit} reached for "${column.title}"` };
            }
        }

        // Get the highest order number in the column to place the new task at the bottom
        const lastTask = await prisma.task.findFirst({
            where: { columnId },
            orderBy: { order: 'desc' },
        });
        const newOrder = lastTask ? lastTask.order + 1 : 0;

        const task = await prisma.task.create({
            data: {
                title,
                status: status as TaskStatus,
                category: category as TaskCategory,
                order: newOrder,
                columnId,
                ...(description ? { description } : {}),
                ...(assigneeId ? { assigneeId } : {}),
            },
        });

        await pusherServer.trigger(`board-${boardId}`, 'board-updated', { message: 'Task created' });

        // Notify the assignee (if someone was assigned and it's not the creator)
        if (assigneeId) {
            const session = await auth();
            const board = await prisma.board.findUnique({ where: { id: boardId }, select: { title: true } });
            await notifyAssignedUser(
                assigneeId,
                session?.user?.id ?? null,
                task.id,
                title,
                boardId,
                board?.title ?? null,
            );
        }

        revalidatePath(`/board/${boardId}`);
        return { success: true, task };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to create task:", message);
        return { success: false, error: message };
    }
}


export async function deleteTask(taskId: string, boardId: string) {
    try {
        await prisma.task.delete({
            where: { id: taskId },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete task:", error);
        return { success: false, error: 'Failed to delete task' };
    }
}

export async function updateTask(
    taskId: string,
    boardId: string,
    title: string,
    category: string
) {
    try {
        await prisma.task.update({
            where: { id: taskId },
            data: { title, category: category as TaskCategory },
        });

        revalidatePath(`/board/${boardId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update task:", error);
        return { success: false, error: 'Failed to update task' };
    }
}