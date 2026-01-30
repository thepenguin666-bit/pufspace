export const metadata = {
    title: 'Retro Ship Game',
    description: 'A retro shooter game built with Phaser and Next.js',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
            </head>
            <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>{children}</body>
        </html>
    )
}
