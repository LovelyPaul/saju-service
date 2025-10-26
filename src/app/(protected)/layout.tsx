import { type ReactNode } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';
import { Sidebar } from '@/components/layout/Sidebar';

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  // Get user info for sidebar
  const { userId } = await auth();
  const clerkUser = await currentUser();

  let userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  let subscriptionTier = 'free';

  if (userId) {
    const supabase = await createClient();
    const user = await getUserByClerkId(supabase, userId);
    if (user) {
      userEmail = user.email;
      subscriptionTier = user.subscription_tier;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={userEmail} subscriptionTier={subscriptionTier} />
      <main className="flex-1 overflow-y-auto lg:ml-60">
        {children}
      </main>
    </div>
  );
}
