export const dynamic = 'force-dynamic';
import { ClerkConfigRequired } from '@gitroom/frontend/components/auth/clerk-config-required';
import { Forgot } from '@gitroom/frontend/components/auth/forgot';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Forgot Password`,
  description: '',
};
export default async function Auth() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <ClerkConfigRequired mode="forgot" />;
  }

  return <Forgot />;
}
