import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';
import { Toaster } from '@/components/ui/sonner';
import { installAuthApiInterceptor } from '@/lib/authApiInterceptor';
import { fetchClientDocuments, fetchClientProfile } from '@/lib/apiClient';
import '../index.css';

const KYC_APPROVED_STATUSES = new Set(['approved', 'verified']);
const CLIENT_KYC_GATE_PREFIX = 'client-kyc-gate-approved:';

const isFilled = (value: unknown) => String(value ?? '').trim().length > 0;

const isApprovedStatus = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return KYC_APPROVED_STATUSES.has(normalized);
};

const hasRequiredClientProfileData = (profile: any) => {
  if (!profile) return false;

  const hasCoreIdentity =
    isFilled(profile.full_name) &&
    isFilled(profile.email) &&
    isFilled(profile.phone);
  const hasLocation = isFilled(profile.city) || isFilled(profile.address);
  const isProfileMarkedComplete =
    !isFilled(profile.kyc_status) || isApprovedStatus(profile.kyc_status);

  return hasCoreIdentity && hasLocation && isProfileMarkedComplete;
};

const hasRequiredKycDocuments = (documents: any) => {
  const identity = documents?.identity;
  const address = documents?.address;

  const identityComplete =
    (isFilled(identity?.file_path) || isFilled(identity?.file_name)) &&
    isApprovedStatus(identity?.status);
  const addressComplete =
    (isFilled(address?.file_path) || isFilled(address?.file_name)) &&
    isApprovedStatus(address?.status);

  return identityComplete && addressComplete;
};

const getCookieValue = (cookieName: string) => {
  if (typeof document === 'undefined') return '';

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${cookieName}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isClientResetPasswordRoute = router.pathname === '/client/reset-password';
  const isClientProfileRoute = router.pathname === '/client/profile';
  const isClientRoute = router.pathname.startsWith('/client');
  const isAdminRoute = router.pathname.startsWith('/admin');
  const clientGateStorageKey =
    typeof window !== 'undefined'
      ? `${CLIENT_KYC_GATE_PREFIX}${getCookieValue('user_id') || 'anonymous'}`
      : CLIENT_KYC_GATE_PREFIX;
  const shouldEnforceClientKycGate =
    isClientRoute && !isClientResetPasswordRoute && !isClientProfileRoute;
  const [clientKycGateState, setClientKycGateState] = useState<'checking' | 'allowed'>(
    shouldEnforceClientKycGate && typeof window !== 'undefined' && sessionStorage.getItem(clientGateStorageKey) === 'allowed'
      ? 'allowed'
      : shouldEnforceClientKycGate
        ? 'checking'
        : 'allowed',
  );

  useEffect(() => {
    installAuthApiInterceptor();
  }, []);

  useEffect(() => {
    let active = true;

    if (!shouldEnforceClientKycGate) {
      setClientKycGateState('allowed');
      return () => {
        active = false;
      };
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem(clientGateStorageKey) === 'allowed') {
      setClientKycGateState('allowed');
      return () => {
        active = false;
      };
    }

    const loadClientKycGate = async () => {
      try {
        const [profile, documents] = await Promise.all([
          fetchClientProfile(),
          fetchClientDocuments(),
        ]);

        if (!active) return;

        const isProfileComplete = hasRequiredClientProfileData(profile);
        const isDocumentsComplete = hasRequiredKycDocuments(documents);

        if (isProfileComplete && isDocumentsComplete) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(clientGateStorageKey, 'allowed');
          }
          setClientKycGateState('allowed');
          return;
        }

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(clientGateStorageKey);
        }
        setClientKycGateState('checking');
        await router.replace('/client/profile');
      } catch (error) {
        console.error('Failed to validate client KYC gate:', error);
        if (active) {
          setClientKycGateState('allowed');
        }
      }
    };

    setClientKycGateState('checking');
    void loadClientKycGate();

    return () => {
      active = false;
    };
  }, [router.pathname, router, shouldEnforceClientKycGate, clientGateStorageKey]);

  const shouldBlockClientPage = shouldEnforceClientKycGate && clientKycGateState !== 'allowed';

  return (
    <>
      <Toaster richColors position="top-right" />
      {isClientRoute && !isClientResetPasswordRoute ? (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0e2250] text-slate-100 font-sans antialiased">
          <ClientSidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            <ClientHeader />
            <main className="flex-1 overflow-y-auto relative">
              {shouldBlockClientPage ? (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#071532]/85 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/10 bg-[#0b1f4d] px-8 py-7 text-center shadow-2xl">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
                        Verifying KYC
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        Redirecting to your profile until identity and address details are complete.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Component {...pageProps} />
              )}
            </main>
          </div>
        </div>
      ) : isAdminRoute ? (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
          <AdminSidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto relative">
              <Component {...pageProps} />
            </main>
          </div>
        </div>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
}
