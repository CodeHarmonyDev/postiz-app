export const dynamic = 'force-dynamic';
import { ClerkAuthPanel } from '@gitroom/frontend/components/auth/clerk-auth-panel';
import { Login } from '@gitroom/frontend/components/auth/login';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Login`,
  description: '',
};
export default async function Auth() {
  if (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CONVEX_URL
  ) {
    return <ClerkAuthPanel mode="sign-in" />;
  }

  return <Login />;
}
