'use client';

import SocketProvider from "@/components/SocketProvider";

export default function IDELayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SocketProvider>
            <div className="bg-zinc-950 text-zinc-100">
                {children}
            </div>
        </SocketProvider>
    );
}
