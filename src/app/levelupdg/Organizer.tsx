'use client';
import {useRef, useState, type FormEvent, type ReactNode} from 'react';
import {emailRecipients, initialEvent, validEmail, type Action, type Contact, type LeagueEvent, type Snapshot} from '@/lib/levelup/model';
import styles from './levelup.module.css';

type Tab = 'Check-in' | 'Players' | 'Email parents' | 'Seasons';
const id = () => crypto.randomUUID();
const localToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

export default function Organizer({initial}: {initial: Snapshot}) {
  const [snapshot,setSnapshot]=useState(initial);
  const state=snapshot.data;
  const [tab,setTab]=useState<Tab>('Check-in');
  const [eventId,setEventId]=useState(()=>initialEvent(state,localToday()));
  const [seasonId,setSeasonId]=useState(()=>state.events.find(e=>e.id===eventId)?.seasonId ?? state.seasons.at(-1)?.id ?? '');
  const [playerId,setPlayerId]=useState(state.players[0]?.id ?? '');
  const [search,setSearch]=useState('');
  const [saving,setSaving]=useState(false);
  const savingRef=useRef(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [retry,setRetry]=useState<Action|null>(null);
  const [dialog,setDialog]=useState<'player'|'season'|'event'|'contact'|'measurement'|null>(null);
  const [editEvent,setEditEvent]=useState<LeagueEvent|null>(null);
  const [editContact,setEditContact]=useState<Contact|null>(null);
  const [emailScope,setEmailScope]=useState(seasonId);
  const [excluded,setExcluded]=useState<string[]>([]);
  const [subject,setSubject]=useState('');
  const [body,setBody]=useState('');
  const [emailNotice,setEmailNotice]=useState('');
  const season=state.seasons.find(s=>s.id===seasonId);
  const event=state.events.find(e=>e.id===eventId);
  const events=state.events.filter(e=>e.seasonId===seasonId).sort((a,b)=>(a.date||'0000').localeCompare(b.date||'0000') || a.time.localeCompare(b.time));
  const roster=state.players.filter(p=>season?.playerIds.includes(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
  const attended=(eid:string,pid:string)=>state.attendance.some(a=>a.eventId===eid&&a.playerId===pid&&a.status==='present');
  const total=state.attendance.filter(a=>a.eventId===eventId&&a.status==='present').length;
  const recipients=emailRecipients(state,emailScope).filter(e=>!excluded.includes(e));
  const player=state.players.find(p=>p.id===playerId);

  async function save(action: Action) {
    if(savingRef.current) return false;
    savingRef.current=true;setSaving(true);setError('');setMessage('Saving…');setRetry(null);
    try {
      const response=await fetch('/levelupdg/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:snapshot.version,action})});
      const result=await response.json();
      if(!response.ok){if(result.snapshot)setSnapshot(result.snapshot);throw new Error(result.error||'Not saved. Please retry.');}
      setSnapshot(result);setMessage('Saved');return true;
    } catch(e){setError(e instanceof Error?e.message:'Not saved. Check your connection and retry.');setRetry(action);setMessage('Not saved');return false;}
    finally{savingRef.current=false;setSaving(false);}
  }
  function chooseSeason(value:string){setSeasonId(value);setEventId(state.events.filter(e=>e.seasonId===value).at(-1)?.id??'');setSearch('');}
  function chooseEvent(value:string){setEventId(value);const e=state.events.find(e=>e.id===value);if(e)setSeasonId(e.seasonId);}
  function newEvent(){setEditEvent(null);setDialog('event');}
  function nextEvent(){const next=events[events.findIndex(e=>e.id===eventId)+1];if(next)chooseEvent(next.id);else newEvent();}
  function template(kind:'reminder'|'recap'){
    const eventName=event?.name||'our next event';
    const when=event?.date?new Date(`${event.date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}):'[add date]';
    setSubject(kind==='reminder'?`Level UP reminder: ${eventName}`:`Level UP recap: ${eventName}`);
    setBody(kind==='reminder'?`Hi Level UP families,\n\nA reminder about ${eventName}:\n\nDate: ${when}\nTime: ${event?.time||'[add time]'}\nLocation: ${event?.location||'[add location]'}\n\n[Add anything families should bring or know.]\n\nSee you there!\nJohn\nLevel UP`:`Hi Level UP families,\n\nThanks for joining us for ${eventName}! We recorded ${total} children checked in.\n\n[Add highlights and the next event details.]\n\nSee you next time!\nJohn\nLevel UP`);
    setEmailNotice('Review the details and remove any bracketed placeholders before sending.');
  }
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setEmailNotice('Copied.');}catch{setEmailNotice('Copy was blocked by your browser. Select and copy the text below.');}}
  function openGmail(){
    if(!recipients.length||!subject.trim()||!body.trim()){setEmailNotice('Choose recipients and enter a subject and message.');return;}
    const url=new URL('https://mail.google.com/mail/u/');
    url.search=new URLSearchParams({authuser:'johnc0601@gmail.com',view:'cm',fs:'1',to:'johnc0601@gmail.com',bcc:recipients.join(','),su:subject,body}).toString();
    if(url.href.length>7500){setEmailNotice('This message is long. Use Copy BCC and Copy message, then paste into Gmail.');return;}
    window.open(url.href,'_blank','noopener,noreferrer');setEmailNotice('Gmail opened. Check that you are sending from johnc0601@gmail.com and review BCC before sending. This app cannot confirm delivery.');
  }
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);let action:Action;
    if(dialog==='player')action={type:'player',id:id(),name:field(f,'name'),seasonId,notes:field(f,'notes'),parentName:field(f,'parent'),email:field(f,'email'),phone:field(f,'phone')};
    else if(dialog==='season')action={type:'season',id:id(),name:field(f,'name'),copyFrom:field(f,'copyFrom')};
    else if(dialog==='event')action={type:'event',event:{id:editEvent?.id??id(),seasonId,name:field(f,'name'),date:field(f,'date'),time:field(f,'time'),location:field(f,'location'),closed:editEvent?.closed??false}};
    else if(dialog==='contact')action={type:'contact',contact:{id:editContact?.id??id(),name:field(f,'name'),email:field(f,'email'),phone:field(f,'phone'),notes:field(f,'notes'),enabled:f.get('enabled')==='on',playerIds:f.getAll('children').map(String)}};
    else action={type:'measurement',measurement:{id:id(),playerId,seasonId,date:field(f,'date'),kind:field(f,'kind'),value:Number(field(f,'value')),unit:field(f,'unit'),age:field(f,'age')?Number(field(f,'age')):null,notes:field(f,'notes')}};
    if(await save(action)){setDialog(null);if(action.type==='season'){setSeasonId(action.id);setEventId('');setTab('Seasons');}if(action.type==='event')chooseEvent(action.event.id);}
  }
  const seasonOptions=state.seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>);

  return <main className={styles.app}>
    <header className={styles.top}><div className={styles.brand}>LEVEL UP<small>YOUTH DISC GOLF</small></div><span className={styles.badge}>Private organizer</span></header>
    <nav className={styles.nav} aria-label="Level UP">{(['Check-in','Players','Email parents','Seasons'] as Tab[]).map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>{setTab(t);setSearch('');}}>{t}</button>)}</nav>
    {error&&<div className={styles.error} role="alert">{error} {retry&&<button disabled={saving} onClick={()=>save(retry)}>Retry save</button>}</div>}
    <div className={styles.status} role="status" aria-live="polite">{message}</div>

    {tab==='Check-in'&&<>
      <div className={styles.toolbar}><label>Season<select value={seasonId} disabled={saving} onChange={e=>chooseSeason(e.target.value)}>{seasonOptions}</select></label><label style={{flex:1}}>Event<select value={eventId} disabled={saving} onChange={e=>chooseEvent(e.target.value)}><option value="">Choose event</option>{events.map(e=><option key={e.id} value={e.id}>{e.date?`${e.date} · `:''}{e.name}{e.closed?' · closed':''}</option>)}</select></label><button disabled={saving||!season} onClick={newEvent}>+ New event</button></div>
      {event?<>
        <section className={styles.hero}><div><span className={styles.eyebrow}>{season?.name}</span><h1>{event.name}</h1><p className={styles.muted}>{event.date?`${event.date}${event.time?` at ${event.time}`:''}`:'Historical event · date not recorded'}{event.location?` · ${event.location}`:''}</p><button className={styles.linkbutton} disabled={saving} onClick={()=>{setEditEvent(event);setDialog('event');}}>Edit event details</button></div><div className={styles.count}><strong>{total}</strong><span>checked in</span></div></section>
        <div className={styles.toolbar}><input aria-label="Find child" placeholder="Find a child…" value={search} onChange={e=>setSearch(e.target.value)}/><button disabled={saving} onClick={()=>setDialog('player')}>+ Add child</button><button disabled={saving} onClick={nextEvent}>Next event →</button></div>
        {event.closed?<div className={styles.error}>This event is closed. Its history is saved. <button disabled={saving} onClick={()=>save({type:'event',event:{...event,closed:false}})}>Reopen to correct</button></div>:<p className={styles.muted}>Check each child as they arrive. Every check saves automatically.</p>}
        <div className={styles.roster}>{roster.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=><label className={styles.child} key={p.id} data-checked={attended(eventId,p.id)}><span>{p.name}<small>{attended(eventId,p.id)?'Checked in':'Not checked in'}</small></span><input aria-label={`Check in ${p.name}`} type="checkbox" checked={attended(eventId,p.id)} disabled={saving||event.closed} onChange={e=>save({type:'attendance',eventId,playerId:p.id,present:e.target.checked})}/></label>)}</div>
        {!roster.length&&<p className={styles.empty}>No children on this season’s roster yet. Add a child or use Seasons to select returning players.</p>}
        {!event.closed&&<p style={{marginTop:22}}><button disabled={saving} onClick={()=>save({type:'event',event:{...event,closed:true}})}>Finish check-in</button> <span className={styles.muted}>Keeps your checks and closes this event.</span></p>}
      </>:<section className={styles.panel}><h1>Ready for the next round?</h1><p>Add an event with its date and location. This season’s roster will be ready to check in.</p><button className={styles.primary} disabled={!season} onClick={newEvent}>Create event</button></section>}
    </>}

    {tab==='Players'&&<>
      <div className={styles.toolbar}><h1 style={{flex:1}}>Player history</h1><button onClick={()=>setDialog('player')} disabled={saving||!season}>+ Add child</button></div>
      <div className={styles.split}><section className={styles.panel}><label>Find a child<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names…"/></label><div className={styles.list} style={{marginTop:16,maxHeight:560,overflow:'auto'}}>{state.players.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><button className={p.id===playerId?styles.selected:undefined} key={p.id} onClick={()=>setPlayerId(p.id)}>{p.name}</button>)}</div></section>
      <section className={styles.panel}>{player&&<><span className={styles.eyebrow}>PLAYER RECORD</span><h2>{player.name}</h2>{player.notes&&<p className={styles.muted}>{player.notes}</p>}<h3>Attendance by season</h3>{state.seasons.map(s=><p key={s.id}>{s.name}: <strong>{state.attendance.filter(a=>a.playerId===player.id&&a.status==='present'&&state.events.some(e=>e.id===a.eventId&&e.seasonId===s.id)).length}</strong> check-ins</p>)}<h3>Parent contacts</h3>{state.contacts.filter(c=>c.playerIds.includes(playerId)).map(c=><p key={c.id}>{c.name||'Parent'}<br/>{c.email||'No email'}<br/>{c.phone}</p>)}<button disabled={saving} onClick={()=>{setEditContact({id:id(),name:'',email:'',phone:'',playerIds:[playerId],enabled:true,notes:''});setDialog('contact');}}>Add parent contact</button></>}</section></div>
      {player&&<section className={styles.panel}><div className={styles.toolbar}><div style={{flex:1}}><h2>Throwing history · {player.name}</h2><p className={styles.muted}>Add each new test as a new row. Historical dates and copied-forward readings remain flagged.</p></div><button disabled={saving} onClick={()=>setDialog('measurement')}>+ Record measurement</button></div><div className={styles.scroll}><table className={styles.table}><thead><tr>{['Date / season','Type','Result','Reported age','Notes'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{state.measurements.filter(m=>m.playerId===playerId).map(m=><tr key={m.id}><td>{m.date||'Date unknown'}<small className={styles.saved}>{state.seasons.find(s=>s.id===m.seasonId)?.name}</small></td><td>{m.kind}</td><td>{m.value} {m.unit}</td><td>{m.age??'—'}</td><td style={{whiteSpace:'normal',minWidth:240}}>{m.notes}</td></tr>)}</tbody></table></div></section>}
    </>}

    {tab==='Email parents'&&<>
      <h1>A quick note to your families.</h1><p className={styles.muted}>Prepare here, review and send in Gmail as johnc0601@gmail.com. No messages send automatically.</p>
      <div className={styles.split}><section className={styles.panel}><h2>Who’s it for?</h2><label>Families<select value={emailScope} onChange={e=>{setEmailScope(e.target.value);setExcluded([]);}}>{seasonOptions}<option value="all">All seasons</option></select></label><p><strong>{recipients.length}</strong> unique email addresses selected</p><div className={styles.recipientbox}>{emailRecipients(state,emailScope).map(email=><label key={email} className={styles.check}><input type="checkbox" checked={!excluded.includes(email)} onChange={e=>setExcluded(e.target.checked?excluded.filter(x=>x!==email):[...excluded,email])}/><span style={{overflowWrap:'anywhere'}}>{email}</span></label>)}</div><p className={styles.muted}>Parents go in BCC. Siblings do not cause duplicate emails. Disabled addresses are excluded.</p><button onClick={()=>copy(recipients.join(', '))}>Copy BCC list</button><details style={{marginTop:15}}><summary>Show copyable addresses</summary><textarea aria-label="BCC addresses" readOnly value={recipients.join(', ')} style={{width:'100%'}}/></details></section>
      <section className={styles.panel}><h2>Write your message</h2><label>Event for template<select value={eventId} onChange={e=>chooseEvent(e.target.value)}><option value="">Choose an event</option>{state.events.map(e=><option key={e.id} value={e.id}>{state.seasons.find(s=>s.id===e.seasonId)?.name} · {e.name}</option>)}</select></label><div className={styles.toolbar} style={{marginTop:12}}><button onClick={()=>template('reminder')}>Event reminder</button><button onClick={()=>template('recap')}>Event recap</button></div><div className={styles.form}><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea className={styles.emailbody} value={body} onChange={e=>setBody(e.target.value)}/></label><div className={styles.toolbar}><button className={styles.primary} onClick={openGmail}>Open in Gmail ↗</button><button onClick={()=>copy(`${subject}\n\n${body}`)}>Copy message</button></div></div><p role="status" className={styles.muted}>{emailNotice}</p><p className={styles.muted}>Your sent history stays in Gmail. Opening a compose window is not confirmation that a message was sent.</p></section></div>
      <section className={styles.panel}><div className={styles.toolbar}><h2 style={{flex:1}}>Saved parent contacts</h2><button onClick={()=>{setEditContact(null);setDialog('contact');}}>+ Add contact</button></div><p className={styles.muted}>Review imported contacts before your first group email. Correct missing or questionable addresses here.</p>{state.contacts.map(c=><div className={styles.contact} key={c.id}><span><strong>{c.name||'Parent contact'}</strong> · {c.email||'Missing email'}<small className={styles.saved}>{c.playerIds.map(pid=>state.players.find(p=>p.id===pid)?.name).join(', ')} · {!validEmail(c.email)?'Needs email review':c.enabled?'Receives league emails':'Emails disabled'}</small></span><button disabled={saving} onClick={()=>{setEditContact(c);setDialog('contact');}}>Edit</button></div>)}</section>
    </>}

    {tab==='Seasons'&&<>
      <div className={styles.toolbar}><h1 style={{flex:1}}>One season at a time.</h1><button className={styles.primary} disabled={saving} onClick={()=>setDialog('season')}>+ New season</button></div>
      <div className={styles.toolbar}><select aria-label="Season" value={seasonId} onChange={e=>chooseSeason(e.target.value)}>{seasonOptions}</select><button onClick={newEvent} disabled={saving||!season}>+ Add event</button></div>
      <section className={styles.panel}><h2>{season?.name} attendance</h2><p className={styles.muted}>The familiar grid. Check a box to correct an open event. Closed events can be reopened in Check-in.</p><div className={styles.scroll}><table className={styles.table}><thead><tr><th>Child</th>{events.map(e=><th key={e.id}><button className={styles.linkbutton} onClick={()=>{chooseEvent(e.id);setTab('Check-in');}}>{e.name}</button><small className={styles.saved}>{e.date||'Date unknown'}{e.closed?' · closed':''}</small></th>)}<th>Total</th></tr></thead><tbody>{state.players.filter(p=>season?.playerIds.includes(p.id)||state.attendance.some(a=>a.playerId===p.id&&events.some(e=>e.id===a.eventId))).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><tr key={p.id}><td>{p.name}{!season?.playerIds.includes(p.id)&&<small className={styles.saved}>Past member</small>}</td>{events.map(e=><td key={e.id}><input aria-label={`${p.name}, ${e.name}`} type="checkbox" checked={attended(e.id,p.id)} disabled={saving||e.closed||!season?.playerIds.includes(p.id)} onChange={x=>save({type:'attendance',eventId:e.id,playerId:p.id,present:x.target.checked})}/></td>)}<td>{events.filter(e=>attended(e.id,p.id)).length}</td></tr>)}</tbody></table></div></section>
      <section className={styles.panel}><h2>Who’s on this season’s roster?</h2><p className={styles.muted}>Unchecking a name removes them from future check-in lists for this season. Their past attendance and measurements stay saved.</p><div className={styles.roster}>{state.players.map(p=><label className={styles.check} key={p.id}><input type="checkbox" checked={!!season?.playerIds.includes(p.id)} disabled={saving||!season} onChange={e=>save({type:'membership',seasonId,playerId:p.id,enrolled:e.target.checked})}/>{p.name}</label>)}</div></section>
    </>}
    <footer className={styles.footer}><a href="/levelupdg/export?kind=attendance">Attendance for Excel</a><a href="/levelupdg/export?kind=measurements">Measurements for Excel</a><a href="/levelupdg/export">Complete backup + original records</a><a href="/account">Account / sign out</a></footer>

    {dialog&&<Modal title={{player:'Add a child',season:'Start a new season',event:editEvent?'Edit event':'Add an event',contact:'Parent contact',measurement:`New measurement · ${player?.name}`}[dialog]} onClose={()=>{if(!saving)setDialog(null);}}>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <form className={styles.form} onSubmit={submit}>
        {dialog==='player'&&<><p>Adding to {season?.name}</p><label>Child’s name<input name="name" required maxLength={200}/></label><label>Parent’s name<input name="parent" maxLength={200}/></label><label>Parent email<input name="email" type="email" maxLength={254}/></label><label>Phone<input name="phone" type="tel" maxLength={80}/></label><label>Notes<textarea name="notes" maxLength={2000}/></label></>}
        {dialog==='season'&&<><label>Season name<input name="name" placeholder="Spring 2027" required maxLength={200}/></label><label>Copy roster from<select name="copyFrom" defaultValue={seasonId}><option value="">Start with an empty roster</option>{seasonOptions}</select></label><p className={styles.muted}>Names carry forward. Events and attendance start fresh. Parent contacts and player history stay connected.</p></>}
        {dialog==='event'&&<><p>{season?.name}</p><label>Event name<input name="name" defaultValue={editEvent?.name} placeholder="Arrowhead" required maxLength={200}/></label><label>Date<input name="date" type="date" defaultValue={editEvent?.date??localToday()} required={!editEvent}/></label><label>Time (Eastern)<input name="time" type="time" defaultValue={editEvent?.time}/></label><label>Location<input name="location" defaultValue={editEvent?.location} maxLength={300}/></label></>}
        {dialog==='contact'&&<><label>Parent name<input name="name" defaultValue={editContact?.name} maxLength={200}/></label><label>Email<input name="email" defaultValue={editContact?.email} maxLength={254}/></label><label>Phone<input name="phone" defaultValue={editContact?.phone} maxLength={80}/></label><label className={styles.check}><input type="checkbox" name="enabled" defaultChecked={editContact?.enabled??true}/>Receive league emails</label><fieldset><legend>Children</legend><div className={styles.recipientbox}>{state.players.map(p=><label className={styles.check} key={p.id}><input name="children" type="checkbox" value={p.id} defaultChecked={editContact?.playerIds.includes(p.id)}/>{p.name}</label>)}</div></fieldset><label>Notes<textarea name="notes" defaultValue={editContact?.notes} maxLength={2000}/></label></>}
        {dialog==='measurement'&&<><label>Season<select value={seasonId} onChange={e=>setSeasonId(e.target.value)}>{seasonOptions}</select></label><label>Measurement date<input name="date" type="date" required defaultValue={localToday()}/></label><label>Type<select name="kind"><option>Forehand</option><option>Backhand</option><option>Distance</option></select></label><label>Value<input name="value" type="number" min="0.1" max="9999" step="0.1" required/></label><label>Unit<select name="unit"><option>mph</option><option>ft</option><option>m</option></select></label><label>Age at testing, if known<input name="age" type="number" min="0" max="100"/></label><label>Notes<textarea name="notes" maxLength={2000}/></label><p className={styles.muted}>Saves a new measurement. Earlier values are never overwritten.</p></>}
        <button className={styles.primary} disabled={saving}>{saving?'Saving…':'Save'}</button>
      </form>
    </Modal>}
  </main>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);
  return <dialog ref={node=>{dialog.current=node;if(node&&!node.open)node.showModal();}} className={styles.dialog} onCancel={e=>{e.preventDefault();onClose();}} aria-label={title}><div className={styles.dialoghead}><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</dialog>;
}
