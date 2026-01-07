import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Library from '@/components/Library';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${locale}/auth/signin`);
  }

  return <Library />;
}


