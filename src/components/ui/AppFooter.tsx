import Link from 'next/link';

export default function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p>© {year} KanbanSync. Built for focused team delivery.</p>
                <nav className="flex items-center gap-3">
                    <Link href="/help" className="hover:text-cyan-700 transition-colors">Help</Link>
                    <Link href="/about" className="hover:text-cyan-700 transition-colors">About</Link>
                    <Link href="/contact" className="hover:text-cyan-700 transition-colors">Contact</Link>
                </nav>
            </div>
        </footer>
    );
}
