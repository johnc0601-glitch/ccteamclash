import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px',background:'#090b0c',color:'#fff'}}>
      <section style={{maxWidth:'440px',textAlign:'center'}}>
        <span style={{color:'#c89b2b',fontSize:'11px',fontWeight:950,letterSpacing:'.14em',textTransform:'uppercase'}}>Team Clash</span>
        <h1 style={{margin:'10px 0',fontSize:'38px',lineHeight:1}}>You're offline</h1>
        <p style={{margin:'0 auto 18px',maxWidth:'360px',color:'#aeb5b2',lineHeight:1.5}}>
          Live schedules, Matchday, availability, Clubhouse, and account data need a connection so Team Clash never shows stale league information as current.
        </p>
        <Link href="/" style={{display:'inline-grid',minHeight:'44px',padding:'0 18px',placeItems:'center',borderRadius:'8px',background:'#c89b2b',color:'#111',fontSize:'11px',fontWeight:950,textTransform:'uppercase'}}>
          Try again
        </Link>
      </section>
    </main>
  );
}
