import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';
import '../index.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isClientResetPasswordRoute = router.pathname === '/client/reset-password';
  const isClientRoute = router.pathname.startsWith('/client');
  const isAdminRoute = router.pathname.startsWith('/admin');

  if (isClientRoute && !isClientResetPasswordRoute) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#0e2250] text-slate-100 font-sans antialiased">
        <ClientSidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <ClientHeader />
          <main className="flex-1 overflow-y-auto relative">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto relative">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    );
  }

  return <Component {...pageProps} />;
}
