'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createSlug} from '@/shared/utils';

type Draft={title:string;category:string;excerpt:string;body:string;links:string;imageName:string};
const blank:Draft={title:'',category:'Match Preview',excerpt:'',body:'',links:'',imageName:''};

export function PostEditor(){
  const [post,setPost]=useState<Draft>(blank);
  const [preview,setPreview]=useState('');
  const [status,setStatus]=useState('Draft saved automatically');
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{const saved=localStorage.getItem('cc-draft');if(saved){try{const draft=JSON.parse(saved) as Draft;const timeout=window.setTimeout(()=>setPost(draft),0);return()=>window.clearTimeout(timeout)}catch{}}},[]);
  useEffect(()=>{localStorage.setItem('cc-draft',JSON.stringify(post))},[post]);
  const slug=useMemo(()=>createSlug(post.title),[post.title]);
  function set(k:keyof Draft,v:string){setStatus('Draft saved automatically');setPost(p=>({...p,[k]:v}))}
  function setImage(file?:File){if(!file)return;set('imageName',file.name);setPreview(URL.createObjectURL(file))}
  function photo(e:React.ChangeEvent<HTMLInputElement>){setImage(e.target.files?.[0])}
  function autoSummary(){const clean=post.body.replace(/\s+/g,' ').trim();set('excerpt',clean.length>155?`${clean.slice(0,152)}…`:clean)}
  function download(){const data={slug:slug||'new-story',...post,body:post.body.split(/\n\s*\n/).filter(Boolean),links:post.links.split('\n').filter(Boolean).map(x=>{const [label,url]=x.split('|');return{label:label?.trim(),url:url?.trim()}})};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`${slug||'story'}.json`;a.click();setStatus('Post file downloaded')}
  async function copy(){await navigator.clipboard.writeText(JSON.stringify({slug,...post},null,2));setStatus('Post copied')}
  return <div className="editor-workspace" onPaste={e=>{const image=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile();if(image)setImage(image)}}>
    <div className="editor-toolbar"><div><span className="status-dot"/><strong>New story</strong><small>{status}</small></div><div><button className="ghost-action" onClick={copy}>Copy</button><button className="publish-action" onClick={download}>Save publish file</button></div></div>
    <div className="editor-layout">
      <form className="real-editor" onSubmit={e=>e.preventDefault()}>
        <div className="form-grid"><label>Post type<select value={post.category} onChange={e=>set('category',e.target.value)}><option>Match Preview</option><option>Match Recap</option><option>Team News</option><option>Course Report</option><option>Announcement</option><option>Photo Story</option></select></label><label>Web address<input value={slug} readOnly placeholder="created-from-headline"/></label></div>
        <label>Headline<input value={post.title} onChange={e=>set('title',e.target.value)} placeholder="Match 5: Everything Is on the Line"/></label>
        <label>Feature photo<div className="drop-zone" onClick={()=>fileRef.current?.click()}>{preview?<img src={preview} alt="Selected preview"/>:<><b>＋</b><strong>Drop, paste, or choose a photo</strong><small>JPG, PNG, or WebP</small></>}<input ref={fileRef} hidden type="file" accept="image/*" onChange={photo}/></div></label>
        <label>Story<textarea rows={10} value={post.body} onChange={e=>set('body',e.target.value)} placeholder="Paste the same short story you wrote for Facebook. Use a blank line between paragraphs."/></label>
        <label>Short summary <button type="button" className="inline-tool" onClick={autoSummary}>Create from story</button><textarea rows={3} value={post.excerpt} onChange={e=>set('excerpt',e.target.value)} placeholder="Used on the homepage and Facebook preview."/></label>
        <label>Related links <small>One per line: Label | URL</small><textarea rows={3} value={post.links} onChange={e=>set('links',e.target.value)} placeholder={'Full schedule | https://...\nFacebook event | https://...'}/></label>
        <div className="editor-actions"><button className="publish-action" onClick={download}>Save publish file</button><button className="secondary" onClick={()=>{setPost(blank);setPreview('');setStatus('Draft saved automatically');localStorage.removeItem('cc-draft')}}>Start over</button></div>
      </form>
      <aside className="post-preview"><div className="preview-label">Live preview</div>{preview?<img src={preview} alt="Preview"/>:<div className="preview-photo">YOUR PHOTO</div>}<small>{post.category}</small><h2>{post.title||'Your headline appears here'}</h2><p>{post.excerpt||post.body.slice(0,160)||'Your short story preview appears here.'}</p><span className="preview-link">Read story →</span></aside>
    </div>
  </div>
}
