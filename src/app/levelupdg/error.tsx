'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{padding:32}}><h1>Level UP could not load</h1><p>Your saved records have not been changed.</p><button onClick={reset}>Try again</button></main>;}
