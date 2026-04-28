import { Providers } from './providers';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
        <title>v-team</title>
      </head>
      <body className="bg-gradient-to-br from-[#1a0b2e] via-[#2e1a4a] to-[#3c1e5e] text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}