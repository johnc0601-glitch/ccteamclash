'use client';

import {useEffect, useState} from 'react';

type Mode = 'checking' | 'installed' | 'prompt' | 'ios' | 'manual' | 'external';

export function InstallTeamClashCard() {
  const [mode, setMode] = useState<Mode>('checking');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const detect = () => {
      const nav = navigator as Navigator & {standalone?: boolean};
      const installed = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
      const appSurface = process.env.NEXT_PUBLIC_APP_SURFACE === 'true'
        || window.location.hostname === 'app.ccteamclash.com';
      if (installed) {
        setMode('installed');
        return;
      }
      if (!appSurface) {
        setMode('external');
        return;
      }
      if (window.__teamClashInstallPrompt) {
        setMode('prompt');
        return;
      }
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setMode(ios ? 'ios' : 'manual');
    };

    detect();
    window.addEventListener('teamclash-install-ready', detect);
    window.addEventListener('teamclash-installed', detect);
    return () => {
      window.removeEventListener('teamclash-install-ready', detect);
      window.removeEventListener('teamclash-installed', detect);
    };
  }, []);

  async function install() {
    const promptEvent = window.__teamClashInstallPrompt;
    if (!promptEvent) {
      setMode('manual');
      return;
    }
    setWorking(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        delete window.__teamClashInstallPrompt;
        setMode('installed');
      }
    } finally {
      setWorking(false);
    }
  }

  if (mode === 'checking') return null;

  if (mode === 'installed') {
    return (
      <div style={{marginTop:'18px',padding:'13px 14px',border:'1px solid var(--cc-gold-soft)',borderRadius:'8px',background:'#fbfaf6'}}>
        <strong style={{display:'block',color:'var(--cc-light-text)'}}>Team Clash is installed</strong>
        <span style={{display:'block',marginTop:'4px',fontSize:'11px',color:'var(--cc-light-muted)'}}>
          Open it from your Home Screen for the app navigation and personalized mobile layout.
        </span>
      </div>
    );
  }

  if (mode === 'external') {
    return (
      <div style={{marginTop:'18px',paddingTop:'18px',borderTop:'1px solid var(--cc-light-border)'}}>
        <span style={{display:'block',color:'var(--cc-gold-ink)',fontSize:'10px',fontWeight:950,textTransform:'uppercase',letterSpacing:'.1em'}}>Team Clash app</span>
        <strong style={{display:'block',marginTop:'6px',color:'var(--cc-light-text)'}}>Use the dedicated mobile app</strong>
        <p style={{margin:'6px 0 12px',fontSize:'12px'}}>Open the app site first, then install it to your Home Screen.</p>
        <a
          href="https://app.ccteamclash.com"
          style={{minHeight:'42px',padding:'0 14px',display:'inline-flex',alignItems:'center',border:'1px solid var(--cc-gold)',borderRadius:'4px',background:'var(--cc-gold)',color:'#111',fontSize:'11px',fontWeight:950,textTransform:'uppercase'}}
        >
          Open Team Clash app
        </a>
      </div>
    );
  }

  return (
    <div style={{marginTop:'18px',paddingTop:'18px',borderTop:'1px solid var(--cc-light-border)'}}>
      <span style={{display:'block',color:'var(--cc-gold-ink)',fontSize:'10px',fontWeight:950,textTransform:'uppercase',letterSpacing:'.1em'}}>Install Team Clash</span>
      <strong style={{display:'block',marginTop:'6px',color:'var(--cc-light-text)'}}>Use the app-style mobile experience</strong>

      {mode === 'prompt' ? (
        <>
          <p style={{margin:'6px 0 12px',fontSize:'12px'}}>Install directly to your Home Screen. No app store is required.</p>
          <button type="button" onClick={install} disabled={working}>
            {working ? 'Opening install…' : 'Install Team Clash'}
          </button>
        </>
      ) : null}

      {mode === 'ios' ? (
        <p style={{margin:'7px 0 0',fontSize:'12px',lineHeight:1.5}}>
          On iPhone: tap <strong>Share</strong>, choose <strong>Add to Home Screen</strong>, then open Team Clash from the new icon.
        </p>
      ) : null}

      {mode === 'manual' ? (
        <p style={{margin:'7px 0 0',fontSize:'12px',lineHeight:1.5}}>
          Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
        </p>
      ) : null}
    </div>
  );
}
