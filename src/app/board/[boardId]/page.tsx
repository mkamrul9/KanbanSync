// OR extract the header into its own Client Component (e.g., BoardHeader.tsx).
// Assuming you extract it to keep the page a Server Component:


import { getBoardData } from '../../../lib/dataAccessLayer';
import KanbanBoard from '../../../components/features/board/KanbanBoard';
import { notFound } from 'next/navigation';
import { getUserRole } from '../../../lib/permission';
import BoardHeader from '../../../components/features/board/BoardHeader';

// Never pre-render at build time — this page queries the database at runtime
export const dynamic = 'force-dynamic';


export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {

    // 1. Fetch data on the server
    const { boardId } = await params;
    // Fetch data AND the current user's role simultaneously 
    const [board, userRole] = await Promise.all([
        getBoardData(boardId),
        getUserRole(boardId)
    ]);

    // Fallback in case the DAL didn't throw but returned null
    if (!board) notFound();

    return (
        <main className="min-h-screen bg-gray-50 p-8 flex flex-col">
            <BoardHeader board={board} userRole={userRole} />

            <div className="flex-1 overflow-hidden">
                {/* Pass the role into the board! */}
                <KanbanBoard initialBoard={board} userRole={userRole} />
            </div>
        </main>
    );
}