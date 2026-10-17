'use client';

export interface AvatarMember {
    id?: string;
    user?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

interface AvatarStackProps {
    members?: AvatarMember[];
    max?: number;
    className?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
    if (name) {
        return name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }
    if (email) {
        return email[0].toUpperCase();
    }
    return '?';
}

export default function AvatarStack({ members = [], max = 3, className = '' }: AvatarStackProps) {
    if (!members || members.length === 0) {
        return (
            <div className={`flex items-center ${className}`}>
                <span className="w-5 h-5 rounded-full bg-[--ks-bg-overlay] border border-[--ks-border] flex items-center justify-center text-[9px] text-[--ks-text-muted]">
                    —
                </span>
            </div>
        );
    }

    const visibleMembers = members.slice(0, max);
    const overflowCount = members.length - max;

    return (
        <div className={`flex items-center -space-x-1.5 overflow-hidden ${className}`}>
            {visibleMembers.map((member, index) => {
                const user = member.user ?? member;
                const name = user.name ?? user.email ?? 'Member';
                const initials = getInitials(user.name, user.email);
                const memberKey = member.user?.id ?? member.id ?? user.email ?? String(index);

                return (
                    <div
                        key={memberKey}
                        title={name}
                        className="relative inline-block w-5 h-5 rounded-full ring-2 ring-[--ks-bg-card] shrink-0 overflow-hidden bg-[--ks-primary-subtle]"
                    >
                        {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.image}
                                alt={name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="w-full h-full flex items-center justify-center text-[9px] font-semibold text-[--ks-primary] bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                                {initials}
                            </span>
                        )}
                    </div>
                );
            })}

            {overflowCount > 0 && (
                <div
                    title={`${overflowCount} more member${overflowCount === 1 ? '' : 's'}`}
                    className="relative inline-flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-[--ks-bg-card] bg-[--ks-bg-overlay] text-[9px] font-medium text-[--ks-text-muted] shrink-0"
                >
                    +{overflowCount}
                </div>
            )}
        </div>
    );
}
