'use client';

interface KanbanSyncLogoProps {
    showText?: boolean;
    className?: string;
    textClassName?: string;
}

export default function KanbanSyncLogo({
    showText = true,
    className = 'w-8 h-8',
    textClassName = 'text-xl font-bold text-slate-900 tracking-tight hidden sm:block'
}: KanbanSyncLogoProps) {
    return (
        <div className="flex items-center gap-3">
            <div className={`${className} bg-blue-600 rounded-lg flex items-center justify-center shadow`}>
                {/* Board grid icon */}
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                    <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                    <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                    <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                </svg>
            </div>
            {showText && <span className={textClassName}>KanbanSync</span>}
        </div>
    );
}
