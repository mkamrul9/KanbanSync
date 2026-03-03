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
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group h-32 flex flex-col justify-between"
                >
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {board.title}
                        </h2>
                        {board.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{board.description}</p>
                        )}
                    </div>
                    <span className="text-sm text-gray-400">Open board →</span>
                </Link>
            ))}

            {/* Show-more / show-less spanning full row */}
            {boards.length > PAGE_SIZE && (
                <div className="col-span-1 md:col-span-3 flex justify-center">
                    <button
                        onClick={() => setShowAll((v) => !v)}
                        className="text-sm text-blue-600 hover:underline"
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
