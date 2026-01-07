import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Library from '@/components/Library';

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return <Library />;
}
