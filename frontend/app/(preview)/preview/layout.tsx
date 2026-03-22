export default function PreviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Isolated layout for the preview - no SocketProvider, clean CSS reset
    return (
        <div className="h-screen w-screen overflow-hidden">
            {children}
        </div>
    );
}
