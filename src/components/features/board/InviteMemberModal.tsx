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

const roleConfig: Record<string, { emoji: string; label: string; desc: string; color: string }> = {
    [BoardRole.MEMBER]: { emoji: '', label: 'Member', desc: 'Can work on tasks and move cards except for Done', color: 'text-blue-600 bg-blue-50 ring-blue-200' },
    [BoardRole.REVIEWER]: { emoji: '', label: 'Reviewer', desc: 'Can approve tasks to Done', color: 'text-amber-600 bg-amber-50 ring-amber-200' },
    [BoardRole.LEADER]: { emoji: '', label: 'Leader', desc: 'Full admin access to the board', color: 'text-violet-600 bg-violet-50 ring-violet-200' },
};

export default function InviteMemberModal({ isOpen, onClose, boardId }: InviteMemberModalProps) {
    const emailRef = useRef<HTMLInputElement>(null);
    const [role, setRole] = useState<BoardRole>(BoardRole.MEMBER);
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const selected = roleConfig[role];

    const handleClose = () => {
        setErrorMsg(null);
        setSuccess(false);
        if (emailRef.current) emailRef.current.value = '';
        onClose();
    };

    const handleInvite = () => {
        setErrorMsg(null);
        const email = emailRef.current?.value?.trim();

        if (!email || !email.includes('@')) {
            setErrorMsg('Please enter a valid email address.');
            return;
        }

        startTransition(async () => {
            const result = await inviteMember(boardId, email, role);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => { handleClose(); }, 1200);
            } else {
                setErrorMsg(result.error || 'Failed to invite member');
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md">
            <div className="p-7">

                {/* Header */}
                <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl mb-3">

                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
                    <p className="text-sm text-gray-500 mt-0.5">They&apos;ll get access to this board immediately.</p>
                </div>

                {/* Error */}
                {errorMsg && (
                    <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                        <span className="shrink-0"></span> {errorMsg}
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                        <span className="shrink-0"></span> Invite sent! Closing…
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Email Address
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></span>
                            <input
                                ref={emailRef}
                                type="email"
                                placeholder="colleague@example.com"
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400 transition-all outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Board Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as BoardRole)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800 cursor-pointer transition-all outline-none"
                        >
                            <option value={BoardRole.MEMBER}>  Member</option>
                            <option value={BoardRole.REVIEWER}> Reviewer</option>
                            <option value={BoardRole.LEADER}>  Leader</option>
                        </select>

                        {/* Role description chip */}
                        <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${selected.color}`}>
                            <span>{selected.emoji}</span>
                            <span>{selected.label}</span>
                            <span className="text-[11px] opacity-70">— {selected.desc}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-6 mt-5 border-t border-gray-100">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={isPending || success}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Inviting…
                            </span>
                        ) : ' Send Invite'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}