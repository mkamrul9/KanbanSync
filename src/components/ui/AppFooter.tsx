import Link from 'next/link';

export default function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-[--ks-border] bg-[--ks-bg-elevated]/90 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-[--ks-text-muted] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-center sm:text-left">© {year} KanbanSync. Built for focused team delivery.</p>
                <nav className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
                    <Link href="/help" className="hover:text-[--ks-primary] transition-colors">Help</Link>
                    <Link href="/about" className="hover:text-[--ks-primary] transition-colors">About</Link>
                    <Link href="/contact" className="hover:text-[--ks-primary] transition-colors">Contact</Link>
                </nav>
            </div>
        </footer>
    );
}
