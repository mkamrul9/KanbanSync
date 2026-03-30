'use client';

import { useState, useRef } from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export default function Tooltip({ text, children, position = 'top', delay = 500 }: TooltipProps) {
    const [show, setShow] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => setShow(true), delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setShow(false);
    };

    const positionClasses = {
        top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
        left: 'right-full mr-2 top-1/2 -translate-y-1/2',
        right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    };

    const arrowClasses = {
        top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700',
        bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-700',
        left: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-slate-700',
        right: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-slate-700',
    };

    return (
        <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
            {show && (
                <div className={`absolute ${positionClasses[position]} z-40 bg-slate-700 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap pointer-events-none`}>
                    {text}
                    <div className={`absolute ${arrowClasses[position]}`} />
                </div>
            )}
        </div>
    );
}
