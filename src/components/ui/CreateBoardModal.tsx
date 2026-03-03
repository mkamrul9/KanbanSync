'use client';

import { useState } from 'react';
import Modal from './Modal';
import { createBoard } from '../../actions/boardActions';

export default function CreateBoardModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Create Board</button>

            <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-3xl">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Create new board</h3>
                    <form action={createBoard} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-sm text-gray-600">Title</label>
                            <input name="title" type="text" placeholder="Project board title" required className="w-full mt-1 p-2 border rounded" />

                            <label className="text-sm text-gray-600 mt-3">Description</label>
                            <textarea name="description" placeholder="Short board description (optional)" className="w-full mt-1 p-2 border rounded h-24" />

                            <label className="text-sm text-gray-600 mt-3">Columns (comma-separated)</label>
                            <input name="columns" type="text" placeholder="Backlog,To Do,In Progress,Review,Done" className="w-full mt-1 p-2 border rounded" />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">Invite members (comma-separated emails)</label>
                            <textarea name="members" placeholder="alice@example.com, bob@example.com" className="w-full mt-1 p-2 border rounded h-40 text-sm" />

                            <div className="mt-4">
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Create Board</button>
                                <button type="button" onClick={() => setOpen(false)} className="w-full mt-2 border rounded py-2">Cancel</button>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>
        </>
    );
}
