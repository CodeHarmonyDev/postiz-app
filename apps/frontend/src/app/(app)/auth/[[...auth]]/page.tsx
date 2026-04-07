export const dynamic = 'force-dynamic';
import { Register } from '@gitroom/frontend/components/auth/register';
import { ClerkConfigRequired } from '@gitroom/frontend/components/auth/clerk-config-required';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Register`,
  description: '',
};

export default async function Auth() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <ClerkConfigRequired mode="sign-up" />;
  }

  return (
    <Register registrationDisabled={process.env.DISABLE_REGISTRATION === 'true'} />
  );
}
