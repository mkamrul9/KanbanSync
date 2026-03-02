'use client';

import { useRef, useTransition, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { inviteMember } from '../../../actions/memberActions';
import { BoardRole } from '../../../generated/prisma/enums';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
}

export default function InviteMemberModal({ isOpen, onClose, boardId }: InviteMemberModalProps) {
    const emailRef = useRef<HTMLInputElement>(null);
    const roleRef = useRef<HTMLSelectElement>(null);
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleInvite = () => {
        setErrorMsg(null);
        const email = emailRef.current?.value;
        const role = roleRef.current?.value as BoardRole;

        if (!email || !email.includes('@')) {
            setErrorMsg("Please enter a valid email address.");
            return;
        }

        startTransition(async () => {
            const result = await inviteMember(boardId, email, role);
            if (result.success) {
                if (emailRef.current) emailRef.current.value = '';
                onClose();
            } else {
                setErrorMsg(result.error || "Failed to invite member");
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Invite Team Member</h2>

            <div className="flex flex-col gap-4">
                {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                    <input
                        ref={emailRef}
                        type="email"
                        placeholder="colleague@example.com"
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Board Role</label>
                    <select
                        ref={roleRef}
                        defaultValue={BoardRole.MEMBER}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-blue-500 bg-white"
                    >
                        <option value={BoardRole.MEMBER}>👨‍💻 Member (Can work on tasks)</option>
                        <option value={BoardRole.REVIEWER}>🔎 Reviewer (Can approve to Done)</option>
                        <option value={BoardRole.LEADER}>👑 Leader (Full Admin Access)</option>
                    </select>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isPending ? 'Inviting...' : 'Send Invite'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}