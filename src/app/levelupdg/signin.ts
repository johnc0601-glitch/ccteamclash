'use server';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export async function signIn(form: FormData) {
  const db=await createClient();
  const {error}=await db.auth.signInWithPassword({email:String(form.get('email')||'').trim(),password:String(form.get('password')||'')});
  if(error) redirect('/levelupdg?error=Sign-in%20failed.%20Check%20your%20email%20and%20password.');
  redirect('/levelupdg');
}
