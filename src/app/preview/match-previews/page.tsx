import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './page.module.css';

type Matchup = {
  away: string;
  awayLogo: string;
  home: string;
  homeLogo: string;
  date: string;
  course: string;
  series: string;
  proven: string;
  swing: string;
  hook: string;
  paragraphs: string[];
  watch: string;
};

const matchups: Matchup[] = [
  {
    away: 'Wild Turkey',
    awayLogo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/wild-turkey/logo.png',
    home: 'Cougar Country',
    homeLogo: '/team-logos/cougar-country.jpg',
    date: 'Oct 3',
    course: 'Cougar Country',
    series: 'CC leads 1–0',
    proven: 'Phillips · 11 wins',
    swing: 'Daniel Johnson · 2–0 vs CC',
    hook: 'WT brings a stronger top end',
    paragraphs: [
      'There may not be a better early-season test for Wild Turkey.',
      'Cougar Country won the only previous meeting, 20.5–15.5, but both rosters have changed enough that the old result only tells part of the story. Wild Turkey is stronger at the top, while Cougar Country brings back a group that already knows how to pile up Clash points.',
      'Logan Canale and Robert Scribner lead Cougar Country with 12 career wins each, followed by Seth Stetson with 11. Wild Turkey counters with Tommy Phillips, also an 11-win player, plus plenty of experience around him.',
      'The individual history adds another wrinkle. Daniel Johnson is 2–0 against Cougar Country, while Logan McHale and Scott Prince are both 2–0 against Wild Turkey.',
      'Cougar Country has also held the edge in doubles, which could matter if this one comes down to the wire.',
    ],
    watch: 'Wild Turkey looks stronger than it has in the past. Now comes the test of turning that strength into team points.',
  },
  {
    away: 'KB',
    awayLogo: '/team-logos/kb.png',
    home: 'Dark Knights',
    homeLogo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/dark-knights/logo.jpg',
    date: 'Oct 3',
    course: 'Burnt Mill Creek',
    series: 'KB leads 2–0',
    proven: 'Duncan 15 · England 14',
    swing: 'Eli Batazhan · 2–0 vs KB',
    hook: 'New Burnt Mill layout',
    paragraphs: [
      "Dark Knights probably don't need much reminding about their recent history with KB.",
      'KB has won both previous meetings, including a 21–12 win last season and a 24–13 victory the year before. This time, though, the setting changes everything.',
      'Burnt Mill Creek gives the matchup a fresh feel. The Clash Gold and Clash Blue layouts have only been set up once, so neither team has years of experience on these exact lines. Both sides will be learning on the fly.',
      'Eric England leads Dark Knights with 14 career Clash wins. Mike Duncan has 15 for KB, while Scott Strickland has 14. KB also has two players who have given Dark Knights fits: Duncan and Dan Moles are both 4–0 against them.',
      'Dark Knights have an answer of their own. Eli Batazhan is 2–0 against KB, and DK brings one of the league’s deeper groups of proven match-play players.',
    ],
    watch: 'KB owns the history, but none of those wins came at Burnt Mill. This one should feel new from the first point.',
  },
  {
    away: "Hayneous OG's",
    awayLogo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/hayneous-og-s/logo.webp',
    home: 'Ninjas',
    homeLogo: '/team-logos/ninjas.jpg',
    date: 'Oct 10',
    course: 'Northeast Creek Park',
    series: 'NIN leads 1–0',
    proven: 'Lehmann · 14 wins',
    swing: 'Chad Crom · 6 wins in 8',
    hook: 'New faces on both sides',
    paragraphs: [
      "There isn't much history between these teams yet, which may be exactly what makes this matchup so intriguing.",
      "Ninjas won the only previous meeting, 21.5–18.5, but both teams have enough new faces that last year's result is hardly a blueprint.",
      "Jake Lehmann remains the player to watch for Hayneous OG's. He has 14 career Clash wins and has long been one of their most reliable point producers. Phil Turnage has also opened his Clash career with a perfect 5–0 record.",
      'Ninjas bring plenty of momentum of their own. Nadya Gutierrez is 7–1, Justin Kuester is 7–3, and Chad Crom has won six of his eight Clash contests.',
      "The matchup history has some fun symmetry. Lehmann, Conner Garrett and Travis Webster are all 2–0 against Ninjas. On the other side, Chad Crom, Albert Ducharme and David Marunowski are each 2–0 against OG's.",
    ],
    watch: "Last year's match was close, and the roster turnover makes this one even tougher to read.",
  },
  {
    away: 'Beast Mode',
    awayLogo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/beast-mode/logo.svg',
    home: 'Riptide',
    homeLogo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/riptide/logo.jpg',
    date: 'Oct 17',
    course: 'Splinter City',
    series: 'RIP leads 2–0',
    proven: 'Lee 13 · Deering 12',
    swing: 'Hastin McGill · 3–0 vs RIP',
    hook: 'Championship rematch',
    paragraphs: [
      'Beast Mode gets another shot at the team that ended its season.',
      'Riptide beat Beast Mode 23–17 during the regular season, then followed it with a 12–7 win in the Championship. That gives this matchup a little more bite than a typical season opener.',
      'Riptide brings back a roster full of players who are tough to beat. Bryan Dirks is a perfect 10–0 in Clash play. Justin Istre is 9–1. Will Deering has 12 career wins.',
      'But Beast Mode has a counterpunch: Brooks McGill and Hastin McGill are each 3–0 against Riptide. Brooks is also 11–1–1 overall, while Misti Lee leads Beast Mode with 13 career wins.',
      'That makes this more complicated than the team history suggests. Riptide has won the matches, but Beast Mode has players who keep finding ways to win their points.',
    ],
    watch: 'Beast Mode has proven it can win individual battles against Riptide. The big question is whether enough of those wins can add up to a team victory.',
  },
];

export default function MatchPreviewConceptPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className="shell">
          <header className={styles.heading}>
            <span>Round 1 · 2026–27</span>
            <h1>Match Previews</h1>
            <p>Quick matchup context up front. Open any matchup for the full preview.</p>
          </header>

          <div className={styles.list}>
            {matchups.map((matchup) => (
              <article className={styles.card} key={`${matchup.away}-${matchup.home}`}>
                <div className={styles.matchHeader}>
                  <div className={styles.team}>
                    <img src={matchup.awayLogo} alt="" />
                    <strong>{matchup.away}</strong>
                  </div>

                  <div className={styles.center}>
                    <b>AT</b>
                    <span>{matchup.date}</span>
                    <small>{matchup.course}</small>
                  </div>

                  <div className={`${styles.team} ${styles.homeTeam}`}>
                    <strong>{matchup.home}</strong>
                    <img src={matchup.homeLogo} alt="" />
                  </div>
                </div>

                <div className={styles.synopsis}>
                  <Stat label="Series" value={matchup.series} />
                  <Stat label="Proven" value={matchup.proven} />
                  <Stat label="Swing player" value={matchup.swing} />
                  <Stat label="Story" value={matchup.hook} />
                </div>

                <details className={styles.details}>
                  <summary>
                    <span>Full matchup preview</span>
                    <span className={styles.chevron}>⌄</span>
                  </summary>
                  <div className={styles.story}>
                    {matchup.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className={styles.watch}>
                      <span>What to watch</span>
                      <strong>{matchup.watch}</strong>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
