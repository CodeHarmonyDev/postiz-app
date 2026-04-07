export const dynamic = 'force-dynamic';

import { Login } from '@gitroom/frontend/components/auth/login';
import { ClerkConfigRequired } from '@gitroom/frontend/components/auth/clerk-config-required';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Login`,
  description: '',
};

export default async function Auth() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <ClerkConfigRequired mode="sign-in" />;
  }

  return <Login />;
}
