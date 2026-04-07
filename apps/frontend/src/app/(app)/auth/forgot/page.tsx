export const dynamic = 'force-dynamic';
import { ClerkAuthPanel } from '@gitroom/frontend/components/auth/clerk-auth-panel';
import { Forgot } from '@gitroom/frontend/components/auth/forgot';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Forgot Password`,
  description: '',
};
export default async function Auth() {
  if (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CONVEX_URL
  ) {
    return <ClerkAuthPanel mode="forgot" />;
  }

  return <Forgot />;
}
