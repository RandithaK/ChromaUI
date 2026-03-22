'use client';

export default function PreviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Isolated layout for the preview - no SocketProvider, no IDE chrome
    return (
        <html lang="en">
            <body style={{ margin: 0, padding: 0, height: '100vh', width: '100vw' }}>
                {children}
            </body>
        </html>
    );
}
