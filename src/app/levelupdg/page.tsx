import type {Metadata} from 'next';
import {levelupAccess, readSnapshot} from '@/lib/levelup/server';
import Organizer from './Organizer';
import {signIn} from './signin';
import styles from './levelup.module.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Level UP | Private organizer', robots: {index: false, follow: false}};
export default async function Page({searchParams}: {searchParams: Promise<{error?:string}>}) {
  const {db,owner} = await levelupAccess();
  if (!owner) {const {error}=await searchParams;return <main className={styles.app}><section className={styles.login}><span className={styles.eyebrow}>LEVEL UP · ORGANIZER</span><h1>A little less admin.<br/>More time on the course.</h1><p>This area is private. Sign in with your authorized organizer account.</p>{error&&<p role="alert">{error}</p>}<form action={signIn}><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className={styles.primary}>Sign in</button></form><p><a href="/account/forgot-password">Reset password</a></p></section></main>;}
  return <Organizer initial={await readSnapshot(db,owner)}/>;
}
