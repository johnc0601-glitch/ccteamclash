import {redirect} from 'next/navigation';
import {StoryManager} from '@/components/StoryManager';
import {SiteHeader, Footer} from '@/components/SiteHeader';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export default async function Admin() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account?error=Commissioner sign-in required.');

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') redirect('/');

  return (
    <main>
      <SiteHeader />
      <section className="admin-hero">
        <div className="shell">
          <span className="eyebrow light">Publishing desk</span>
          <h1>Manage stories</h1>
          <p>Create, edit, delete, and update story photos from one shared publishing screen.</p>
        </div>
      </section>
      <section className="shell admin-shell"><StoryManager /></section>
      <Footer />
    </main>
  );
}
