'use client';

interface KanbanSyncLogoProps {
    showText?: boolean;
    className?: string;
    textClassName?: string;
}

export default function KanbanSyncLogo({
    showText = true,
    className = 'w-7 h-7',
    textClassName = 'text-[15px] font-semibold text-[--ks-text-primary] tracking-tight hidden md:inline-block'
}: KanbanSyncLogoProps) {
    return (
        <div className="flex items-center gap-2.5">
            <div className={`${className} bg-[--ks-primary] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 select-none`}>
                <span className="font-bold tracking-tight">K</span>
            </div>
            {showText && <span className={textClassName}>KanbanSync</span>}
        </div>
    );
}
