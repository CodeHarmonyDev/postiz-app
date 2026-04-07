export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PublicPostPreview } from '@gitroom/frontend/components/preview/public-post-preview';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Preview`,
  description: '',
};

export default async function Auth(props: {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    share?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  return <PublicPostPreview postId={params.id} share={!!searchParams?.share} />;
}
