'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '../../ui/Modal';
import { updateBoardSettings } from '../../../actions/boardActions';

type EditableColumn = {
    id?: string;
    title: string;
    wipLimit: string;
};

interface BoardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    initialTitle: string;
    initialDescription?: string | null;
    initialColumns: Array<{
        id: string;
        title: string;
        wipLimit?: number | null;
    }>;
}

function toEditableColumns(
    source: Array<{
        id: string;
        title: string;
        wipLimit?: number | null;
    }>
): EditableColumn[] {
    return source.map((column) => ({
        id: column.id,
        title: column.title,
        wipLimit: column.wipLimit ? String(column.wipLimit) : '',
    }));
}

export default function BoardSettingsModal({
    isOpen,
    onClose,
    boardId,
    initialTitle,
    initialDescription,
    initialColumns,
}: BoardSettingsModalProps) {
    const router = useRouter();
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription ?? '');
    const [columns, setColumns] = useState<EditableColumn[]>(() => toEditableColumns(initialColumns));
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const columnCountText = useMemo(() => {
        const count = columns.length;
        return `${count} active ${count === 1 ? 'column' : 'columns'}`;
    }, [columns]);

    const updateColumn = (index: number, next: Partial<EditableColumn>) => {
        setColumns((prev) => prev.map((col, idx) => (idx === index ? { ...col, ...next } : col)));
    };

    const moveColumn = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= columns.length) return;
        setColumns((prev) => {
            const copy = [...prev];
            const temp = copy[index];
            copy[index] = copy[target];
            copy[target] = temp;
            return copy;
        });
    };

    const removeColumn = (index: number) => {
        if (columns.length <= 1) {
            setErrorMsg('At least one active column is required.');
            return;
        }
        setColumns((prev) => prev.filter((_, idx) => idx !== index));
    };

    const addColumn = () => {
        setColumns((prev) => [...prev, { title: '', wipLimit: '' }]);
    };

    const handleSave = () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!title.trim()) {
            setErrorMsg('Board title is required.');
            return;
        }

        startTransition(async () => {
            const result = await updateBoardSettings(boardId, {
                title: title.trim(),
                description: description.trim() || null,
                columns: columns.map((column) => {
                    const raw = column.wipLimit.trim();
                    const parsed = raw ? Number(raw) : null;
                    return {
                        id: column.id,
                        title: column.title,
                        wipLimit: parsed && Number.isFinite(parsed) ? parsed : null,
                    };
                }),
            });

            if (!result.success) {
                setErrorMsg(result.error || 'Failed to update board settings.');
                return;
            }

            setSuccessMsg('Board settings updated successfully.');
            router.refresh();
            setTimeout(() => {
                onClose();
            }, 700);
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
            <div className="app-bg anim-panel-in" data-tour="board-settings-modal">
                <div className="ui-modal-header">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center text-emerald-700 mb-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Board Settings</h2>
                    <p className="text-sm text-gray-600 mt-0.5">Edit board details and maintain your active workflow columns.</p>
                </div>

                <div className="p-6 sm:p-7 space-y-5 max-h-[70vh] overflow-y-auto">
                    {errorMsg && (
                        <div className="px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div className="px-3 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                            {successMsg}
                        </div>
                    )}

                    <section className="app-surface border border-slate-200/70 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-800">Board Details</h3>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Board Title
                            </label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={120}
                                className="ui-field"
                                placeholder="Engineering Sprint Board"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className="ui-field resize-y"
                                placeholder="Describe this board's goal and scope"
                            />
                        </div>
                    </section>

                    <section className="app-surface border border-slate-200/70 rounded-2xl p-4 space-y-3" data-tour="board-settings-columns">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Workflow Columns</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{columnCountText}. Deleting a non-empty column is blocked for safety.</p>
                            </div>
                            <button
                                type="button"
                                onClick={addColumn}
                                className="ui-btn-secondary text-xs px-3 py-2"
                            >
                                + Add Column
                            </button>
                        </div>

                        <div className="space-y-2">
                            {columns.map((column, index) => (
                                <div key={column.id ?? `new-${index}`} className="grid grid-cols-12 gap-2 items-center border border-slate-200 rounded-xl p-2.5 bg-white">
                                    <div className="col-span-12 sm:col-span-6">
                                        <input
                                            value={column.title}
                                            onChange={(e) => updateColumn(index, { title: e.target.value })}
                                            placeholder="Column name"
                                            className="ui-field"
                                        />
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <input
                                            type="number"
                                            min={1}
                                            value={column.wipLimit}
                                            onChange={(e) => updateColumn(index, { wipLimit: e.target.value })}
                                            placeholder="WIP"
                                            className="ui-field"
                                        />
                                    </div>
                                    <div className="col-span-6 sm:col-span-4 flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => moveColumn(index, -1)}
                                            className="ui-btn-secondary text-xs px-2.5 py-2"
                                            disabled={index === 0}
                                        >
                                            Up
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveColumn(index, 1)}
                                            className="ui-btn-secondary text-xs px-2.5 py-2"
                                            disabled={index === columns.length - 1}
                                        >
                                            Down
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeColumn(index)}
                                            className="text-xs px-2.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="ui-modal-footer pt-1">
                        <button
                            onClick={onClose}
                            className="ui-btn-secondary"
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending}
                            className="ui-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                            type="button"
                        >
                            {isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
