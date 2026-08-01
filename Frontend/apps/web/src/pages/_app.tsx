import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';
import '../index.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isClientRoute = router.pathname.startsWith('/client');
  const isAdminRoute = router.pathname.startsWith('/admin');

  if (isClientRoute) {
    return (
      <div className="flex min-h-[10vh] bg-[#070d19] text-slate-100 font-sans antialiased overflow-hidden">
        <ClientSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative overflow-y-auto z-10">
          <ClientHeader />
          <Component {...pageProps} />
        </div>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative overflow-y-auto">
          <AdminHeader />
          <Component {...pageProps} />
        </div>
      </div>
    );
  }

  return <Component {...pageProps} />;
}
