'use client';

import {useState} from 'react';
import {
  formatOfficialMatchRoster,
  formatOfficialTeamRoster,
  officialRosterFilename,
  type OfficialRosterExport,
} from '@/domain/match-roster/MatchRosterExport';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function OfficialRosterExportPanel({exportData}: {exportData: OfficialRosterExport}) {
  const [notice, setNotice] = useState<string>();
  const fullContent = formatOfficialMatchRoster(exportData);

  async function copy(content: string, label: string) {
    try {
      await navigator.clipboard.writeText(content);
      setNotice(`${label} copied.`);
    } catch {
      setNotice('Roster could not be copied.');
    }
  }

  function download() {
    const blob = new Blob([fullContent], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = officialRosterFilename(exportData.matchId);
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Roster download started.');
  }

  return (
    <section className={styles.exportPanel} aria-labelledby="official-roster-export-heading">
      <header className={styles.sectionHeader}>
        <div><span>External scoring workflow</span><h2 id="official-roster-export-heading">Export official roster</h2></div>
        <p>Copy names or download the same UTF-8 plain-text roster.</p>
      </header>
      <div className={styles.exportActions}>
        <button type="button" onClick={() => copy(formatOfficialTeamRoster(exportData.homeTeam), 'Home roster')}>
          Copy Home Roster
        </button>
        <button type="button" onClick={() => copy(formatOfficialTeamRoster(exportData.awayTeam), 'Away roster')}>
          Copy Away Roster
        </button>
        <button type="button" onClick={() => copy(fullContent, 'Full match roster')}>
          Copy Full Match Roster
        </button>
        <button type="button" onClick={download}>Download Text File</button>
      </div>
      {notice ? <p className={styles.exportNotice} aria-live="polite">{notice}</p> : null}
    </section>
  );
}
