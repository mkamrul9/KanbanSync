'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import './cmdk.css';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="cmdk-dialog"
        >
            <Command.Input placeholder="Type a command or search..." className="cmdk-input" />
            <Command.List className="cmdk-list">
                <Command.Empty className="cmdk-empty">No results found.</Command.Empty>

                <Command.Group heading="Navigation" className="cmdk-group">
                    <Command.Item className="cmdk-item" onSelect={() => { setOpen(false); router.push('/dashboard'); }}>
                        Dashboard
                    </Command.Item>
                    <Command.Item className="cmdk-item" onSelect={() => { setOpen(false); router.push('/dashboard/profile'); }}>
                        Profile Settings
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Actions" className="cmdk-group">
                    <Command.Item className="cmdk-item" onSelect={() => {
                        setOpen(false);
                        // Trigger create board modal if in dashboard
                        window.dispatchEvent(new CustomEvent('ks-open-create-board'));
                    }}>
                        Create New Board
                    </Command.Item>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
}
