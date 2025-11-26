import './globals.css';
import { TRPCProvider } from '@/lib/trpc';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Generador XBRL - SSPD',
  description: 'Sistema de generación de taxonomías XBRL para empresas de servicios públicos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <TRPCProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TRPCProvider>
      </body>
    </html>
  );
}
