'use client';

import { useState } from 'react';
import Link from 'next/link';

type Board = {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
};

const PAGE_SIZE = 6;

export default function BoardsGrid({ boards }: { boards: Board[] }) {
    const [showAll, setShowAll] = useState(false);

    const visible = showAll ? boards : boards.slice(0, PAGE_SIZE);
    const hidden = boards.length - PAGE_SIZE;

    return (
        <>
            {visible.map((board) => (
                <Link
                    href={`/board/${board.id}`}
                    key={board.id}
                    data-tour={board.id === visible[0]?.id ? 'open-board-card' : undefined}
                    className="app-surface p-6 rounded-2xl shadow-sm border border-slate-200/70 hover:shadow-md hover:border-cyan-300 transition-all group h-36 flex flex-col justify-between"
                >
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors line-clamp-1 tracking-tight">
                            {board.title}
                        </h2>
                        {board.description && (
                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{board.description}</p>
                        )}
                    </div>
                    <span className="text-sm text-slate-500 group-hover:text-cyan-700 transition-colors">Open board &rarr;</span>
                </Link>
            ))}

            {/* Show-more / show-less spanning full row */}
            {boards.length > PAGE_SIZE && (
                <div className="col-span-1 md:col-span-3 flex justify-center">
                    <button
                        onClick={() => setShowAll((v) => !v)}
                        className="text-sm text-cyan-700 hover:underline font-medium"
                    >
                        {showAll
                            ? 'Show fewer boards ↑'
                            : `See ${hidden} previous board${hidden !== 1 ? 's' : ''} ↓`}
                    </button>
                </div>
            )}
        </>
    );
}
