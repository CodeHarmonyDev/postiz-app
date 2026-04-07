export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Activate } from '@gitroom/frontend/components/auth/activate';
import { ClerkAuthPanel } from '@gitroom/frontend/components/auth/clerk-auth-panel';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'Postiz' : 'Gitroom'
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  if (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CONVEX_URL
  ) {
    return <ClerkAuthPanel mode="activate" />;
  }

  return <Activate />;
}
