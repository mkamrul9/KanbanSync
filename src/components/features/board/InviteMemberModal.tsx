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
    [BoardRole.MEMBER]: { emoji: 'M', label: 'Member', desc: 'Can work on tasks and move cards except for Done', color: 'text-blue-600 bg-blue-50 ring-blue-200' },
    [BoardRole.REVIEWER]: { emoji: 'R', label: 'Reviewer', desc: 'Can approve tasks to Done', color: 'text-amber-600 bg-amber-50 ring-amber-200' },
    [BoardRole.LEADER]: { emoji: 'L', label: 'Leader', desc: 'Full admin access to the board', color: 'text-violet-600 bg-violet-50 ring-violet-200' },
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
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg">
            <div className="app-bg anim-panel-in">
                <div className="ui-modal-header">

                    {/* Header */}
                    <div className="w-12 h-12 rounded-2xl bg-white border border-cyan-200 shadow-sm flex items-center justify-center text-cyan-700 mb-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
                    <p className="text-sm text-gray-600 mt-0.5">They&apos;ll get board access with the role you choose.</p>
                </div>

                <div className="p-7">

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

                    <div className="flex flex-col gap-4 app-surface border border-slate-200/70 rounded-2xl p-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                                <input
                                    ref={emailRef}
                                    type="email"
                                    placeholder="colleague@example.com"
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                    className="ui-field pl-9"
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
                                className="ui-field cursor-pointer"
                            >
                                <option value={BoardRole.MEMBER}>M Member</option>
                                <option value={BoardRole.REVIEWER}>R Reviewer</option>
                                <option value={BoardRole.LEADER}>L Leader</option>
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
                    <div className="ui-modal-footer">
                        <button
                            onClick={handleClose}
                            className="ui-btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleInvite}
                            disabled={isPending || success}
                            className="ui-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Inviting…
                                </span>
                            ) : 'Send Invite'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}