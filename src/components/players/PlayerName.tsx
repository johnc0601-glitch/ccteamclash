import type {ReactNode} from 'react';

/** Display registered gender only; no inference from names or appearance. */
export function PlayerName({children, gender}: {children: ReactNode; gender?: string | null}) {
  return <>{children}{gender === 'Female' || gender === 'Women' ? <span title="Woman player" aria-label="Woman player" style={{display:'inline-block',marginInlineStart:5,padding:'1px 5px',borderRadius:4,backgroundColor:'#7954a3',color:'#fff',fontSize:'.72em',fontWeight:800,lineHeight:1.3,verticalAlign:'baseline',whiteSpace:'nowrap'}}>W</span> : null}</>;
}
