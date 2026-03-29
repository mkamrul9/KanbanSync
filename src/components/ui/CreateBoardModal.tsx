'use client';

import { useState } from 'react';
import Modal from './Modal';
import { createBoard } from '../../actions/boardActions';

export default function CreateBoardModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                data-tour="create-board-button"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Create Board
            </button>

            <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-4xl">
                <div className="app-bg anim-panel-in">
                    <div className="ui-modal-header">
                        <h3 className="text-xl font-semibold text-gray-900 tracking-tight">Create New Board</h3>
                        <p className="text-sm text-gray-600 mt-1">Define board basics, workflow columns, and optional teammates.</p>
                    </div>

                    <form action={createBoard} onSubmit={() => setLoading(true)} aria-busy={loading} className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6">
                        <div className="md:col-span-2 flex flex-col gap-3 app-surface border border-slate-200/70 rounded-2xl p-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                                <input name="title" type="text" placeholder="e.g. Product Roadmap" required disabled={loading} className="ui-field mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
                                <textarea name="description" placeholder="What is this board for? (optional)" disabled={loading} className="ui-field mt-1 h-24 resize-none" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Columns <span className="text-gray-400 font-normal normal-case">(comma-separated)</span></label>
                                <input name="columns" type="text" placeholder="Backlog, To Do, In Progress, Review, Done" disabled={loading} className="ui-field mt-1" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 app-surface border border-slate-200/70 rounded-2xl p-4">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Invite members <span className="text-gray-400 font-normal normal-case">(emails, comma-separated)</span></label>
                                <textarea name="members" placeholder="alice@example.com, bob@example.com" disabled={loading} className="ui-field mt-1 h-32 resize-none" />
                            </div>

                            <div className="flex flex-col gap-2 mt-auto">
                                <button type="submit" disabled={loading} className="w-full ui-btn-primary disabled:opacity-70 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Board'
                                    )}
                                </button>
                                <button type="button" onClick={() => setOpen(false)} className="w-full ui-btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>
        </>
    );
}
