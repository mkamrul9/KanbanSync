import { BoardRole } from '../generated/prisma/client';

export type BoardAction =
    | 'CREATE_TASK'
    | 'ARCHIVE_TASK'
    | 'MOVE_TO_DONE'
    | 'PRIORITY_EDIT'
    | 'TASK_EDIT'
    | 'ASSIGN_TASK'
    | 'SUBTASK_MANAGE'
    | 'ATTACHMENT_MANAGE'
    | 'DEPENDENCY_MANAGE'
    | 'TIME_ENTRY_MANAGE'
    | 'INVITE_MEMBER'
    | 'EXPORT_DATA'
    | 'TEMPLATE_MANAGE';

const ACTION_MATRIX: Record<BoardAction, BoardRole[]> = {
    CREATE_TASK: [BoardRole.LEADER],
    ARCHIVE_TASK: [BoardRole.LEADER, BoardRole.REVIEWER],
    MOVE_TO_DONE: [BoardRole.LEADER, BoardRole.REVIEWER],
    PRIORITY_EDIT: [BoardRole.LEADER, BoardRole.REVIEWER],
    TASK_EDIT: [BoardRole.LEADER, BoardRole.REVIEWER],
    ASSIGN_TASK: [BoardRole.LEADER, BoardRole.REVIEWER],
    SUBTASK_MANAGE: [BoardRole.LEADER, BoardRole.REVIEWER],
    ATTACHMENT_MANAGE: [BoardRole.LEADER, BoardRole.REVIEWER],
    DEPENDENCY_MANAGE: [BoardRole.LEADER, BoardRole.REVIEWER],
    TIME_ENTRY_MANAGE: [BoardRole.LEADER, BoardRole.REVIEWER, BoardRole.MEMBER],
    INVITE_MEMBER: [BoardRole.LEADER],
    EXPORT_DATA: [BoardRole.LEADER, BoardRole.REVIEWER],
    TEMPLATE_MANAGE: [BoardRole.LEADER],
};

export function canPerformBoardAction(role: BoardRole | null, action: BoardAction) {
    if (!role) return false;
    return ACTION_MATRIX[action].includes(role);
}

export function listAllowedActions(role: BoardRole | null): BoardAction[] {
    if (!role) return [];
    return (Object.keys(ACTION_MATRIX) as BoardAction[]).filter((action) => ACTION_MATRIX[action].includes(role));
}
