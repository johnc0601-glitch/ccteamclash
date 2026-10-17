import Link from 'next/link';
import styles from './Rules.module.css';

type RuleSource = 'charter' | 'updated' | 'review';
type Rule = {title: string; source: RuleSource; text?: string; points?: readonly string[]};
type Section = {id: string; title: string; eyebrow: string; lead: string; rules: readonly Rule[]};

const sections: readonly Section[] = [
  {
    id: 'teams',
    title: 'Teams & the season',
    eyebrow: '01 / LEAGUE STRUCTURE',
    lead: 'The charter defines how teams enter the league, how captains represent them, and how the schedule is managed.',
    rules: [
      {title: 'Team registration', source: 'charter', text: 'Commissioners open team registration in the offseason. Teams are approved with consideration for prior league participation and their ability to host. If more players need places, commissioners may create teams or adjust roster capacity.'},
      {title: 'Team count and byes', source: 'charter', text: 'An even number of teams is preferred. If an odd number is accepted, each team receives a bye; previous season finishing order determines the first choice of bye month.'},
      {title: 'Season calendar', source: 'charter', text: 'The 2025–26 charter scheduled monthly challenges from October through February, using February as a possible makeup month, and targeted March for finals. The published current-season schedule controls actual match dates.'},
      {title: 'Postponements and weather', source: 'charter', points: [
        'Unsafe or unfair conditions can justify postponement: lightning, dangerous tee pads, flooding, ice, hazardous ground or similar risks.',
        'Captains may postpone when both agree and must complete the match before the designated makeup date. If they cannot agree on a replacement date, the makeup date is the fallback.',
        'Without agreement to postpone, the original date stands. If both teams fail to play on the makeup date, both receive a loss.',
      ]},
    ],
  },
  {
    id: 'hosting',
    title: 'Hosting & match procedures',
    eyebrow: '02 / GAME DAY',
    lead: 'The home team organizes the event; captains alternate the advantage of putting up the first matchup.',
    rules: [
      {title: 'Host responsibilities', source: 'charter', points: [
        'The home team provides a potluck-style lunch or may arrange catering.',
        'The home team handles course readiness, including tees, fairways and suitable gathering space, shelter or tables.',
        'The home team announces that day’s layouts, out-of-bounds and special provisions, and the plan for resolving doubles ties.',
      ]},
      {title: 'Matchup order', source: 'charter', points: [
        'In singles, the home captain chooses whether to put up a player first or second.',
        'In doubles, the away captain chooses who puts up first or second.',
        'Matchups proceed in snake order: one captain puts up a player or team, the opponent matches, then roles reverse.',
        'At a neutral site, use a disc or coin flip to decide who is treated as home for matchup purposes.',
      ]},
      {title: 'Participation and late arrivals', source: 'charter', points: [
        'Make every reasonable effort to play the maximum number of people. A player may not be deliberately benched for strategic purposes for both rounds.',
        'A player who sits out singles should play doubles. No one should sit both rounds.',
        'A player may be entered before arriving, but once play starts that player forfeits each hole missed until present.',
      ]},
    ],
  },
  {
    id: 'format',
    title: 'The match format',
    eyebrow: '03 / HOW TO PLAY',
    lead: 'A normal full Clash uses 18 players, one singles round and one doubles round.',
    rules: [
      {title: 'Two rounds', source: 'charter', points: [
        'Round 1 is singles match play. Each player faces an opposing player.',
        'Round 2 is doubles stroke play. Captains arrange doubles pairings during matchups.',
        'Ordinary full-roster scoring offers 18 singles points and nine doubles matches worth two points each: 36 points total before adjustments.',
      ]},
      {title: 'Odd numbers of players', source: 'charter', text: 'When both teams agree to accommodate an odd player count, the doubles round may include singles (one-point victory) or triples (three-point victory). If roster sizes differ, the default is to play to the smaller number and have the extra players sit, unless captains agree on another solution.'},
      {title: 'Playing formats', source: 'charter', text: 'The charter uses singles match play and doubles stroke play, with a singles tie awarding each side one-half point. Captains should agree on exceptions before setting the relevant matchups.'},
    ],
  },
  {
    id: 'rosters',
    title: 'Team rosters & eligibility',
    eyebrow: '04 / WHO MAY PLAY',
    lead: 'The original charter specifies a standard lineup of 16 men and two women, with two age-50-plus men included in the men’s lineup.',
    rules: [
      {title: 'Standard playing lineup', source: 'charter', points: [
        '18 positions: 16 men, including two age 50 or older, and at least two women.',
        'The older charter describes a maximum team roster size of 28, but its listed sublimits (25 men and four women) total 29. That numerical inconsistency needs commissioner clarification before 2026–27 publication.',
        'Additional women may expand a team’s season roster beyond the stated standard cap.',
      ]},
      {title: 'Season registration', source: 'charter', points: [
        'A player can be on only one official season roster, finalized at that team’s first match.',
        'Being on the official season roster does not require having played a match.',
        'Generally, players compete only for their season-rostered team; the charter expressly exempts women from that restriction.',
        'Juniors age 14 or younger do not count against season roster size and do not generate women’s or other bonus points for junior participation.',
      ]},
      {title: 'Roster moves', source: 'charter', points: [
        'The charter allows eight roster moves per season unless commissioners revise that number before the season begins.',
        'A move means dropping a player and replacing that player. Filling a previously unfilled position does not count as a move.',
        'A dropped player may not move to another team for the rest of that season.',
        'Changes before the first match do not consume a move. Women’s replacement or fill-ins do not count as roster moves.',
        'Roster moves apply to the regular season; players who independently qualify can play finals.',
      ]},
    ],
  },
  {
    id: 'women',
    title: 'Women’s participation',
    eyebrow: '05 / PROTECTED POSITIONS',
    lead: 'The two women’s positions are protected. The newer league guidance reinforces that teams cannot simply replace those positions with extra men.',
    rules: [
      {title: 'Minimum women and maximum men', source: 'updated', points: [
        'At least two positions are reserved for women in a standard playing round.',
        'A maximum of 16 men per round still applies; a team cannot use 17 or 18 men to fill otherwise reserved women’s positions.',
        'Women should face women in singles whenever available. The charter requires matching genders wherever possible.',
        'Men do not earn the protected women’s matchup point simply by substituting into an unfilled women’s position.',
      ]},
      {title: 'Doubles pairings', source: 'updated', points: [
        'Mixed doubles remain allowed, as do women/women pairings.',
        'The original charter calls for captains to agree on women’s doubles placement. If they cannot agree, the opposing team should match the format thrown out when possible, subject to shortages or surplus women.',
      ]},
      {title: 'Borrowing and calling up women', source: 'charter', points: [
        'Teams may recruit or call up additional eligible women for regular-season matches without charging a season roster move.',
        'A woman already rostered elsewhere may play for another team if she is available.',
        'Under the charter, outside call-ups and borrowed women cannot represent another team in the playoffs; playoff participants must separately qualify.',
      ]},
      {title: 'Women’s participation points', source: 'charter', text: 'The original charter awards the team playing additional women one team point per round for each participating woman above the opposing team’s number, up to the playing roster. Normal contest points still count. Exact interaction with the newly protected women’s positions and unplayed slots should be confirmed before automating the rule.'},
    ],
  },
  {
    id: 'deadlines',
    title: 'Submission, lock & no-shows',
    eyebrow: '06 / NEW RULES',
    lead: 'The current website uses separate submission and lock times. The new no-show policy is distinct from the older charter’s general short-roster penalties.',
    rules: [
      {title: 'Friday roster submission — noon', source: 'updated', points: [
        'Captains must submit their match roster on ccteamclash.com by 12:00 noon Friday, Eastern Time.',
        'The submitted match roster is available to players to view.',
        'Captains must verify that everyone listed intends to play and that the roster is accurate.',
      ]},
      {title: 'Website roster lock — 3 PM', source: 'updated', text: 'The website locks match rosters at 3:00 PM Eastern on Friday of match week. This is a technical lock, not an extension of the noon captain-submission deadline. A commissioner can authorize an exception or correction.'},
      {title: 'Rostered player does not arrive', source: 'updated', points: [
        'If a player listed on the submitted website match roster does not appear, the opposing team receives an additional ½-point team penalty.',
        'If that absent player was also placed into a singles or doubles matchup and never arrives, the opposing team receives another ½ point.',
        'The specific listed no-show penalty can therefore reach one full team point, in addition to forfeiting the contest assigned to the missing player.',
        'These no-show penalties are counted separately from the result of a played contest. They must not generate a fictitious Clash Index result.',
      ]},
      {title: 'Roster corrections after matchups start', source: 'charter', text: 'Both captains are committed to the announced playing rosters once matchups begin. The charter permits correcting minor mistakes only if both captains agree; unapproved substitutions are not allowed after the matchup process starts.'},
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring & tie resolution',
    eyebrow: '07 / TEAM POINTS',
    lead: 'Singles and doubles have different point values. Team-only adjustments appear separately in the official result.',
    rules: [
      {title: 'Singles', source: 'charter', points: [
        'Win: 1 point to the winner’s team.',
        'Tie (push): ½ point to each team.',
        'Loss: 0 points.',
      ]},
      {title: 'Doubles', source: 'charter', points: [
        'Win: 2 points to the winning team.',
        'A doubles tie is settled by sudden death unless both captains agree to allow a tie, in which case each team receives 1 point.',
        'Specially agreed singles or triples during the doubles round are scored at 1 or 3 points for a win, respectively.',
      ]},
      {title: 'Overall match ends tied', source: 'charter', text: 'A tied team match goes to sudden-death best-disc doubles. Each captain chooses any two players. The home team selects the starting hole and layout. Neutral-site and finals ties default to Hole 1 or the nearest available hole where teams meet.'},
      {title: 'Results reporting', source: 'charter', text: 'The older charter directs the home team to report complete results within one week, listing players by full names and standard match notation. The league now uses official website results; the commissioner-verified website result is the source for the published score and player records.'},
    ],
  },
  {
    id: 'penalties',
    title: 'Additional penalties & forfeits',
    eyebrow: '08 / SCORE ADJUSTMENTS',
    lead: 'The original charter contains additional short-lineup and forfeit rules beyond the newly adopted ½-point no-show policy.',
    rules: [
      {title: 'Short playing lineup', source: 'charter', points: [
        'The charter awards the opponent one team point per round per missing player when a team fields fewer than the allowed standard lineup, calculated against the relevant player counts.',
        'A player must participate in at least one round to count toward the roster for the short-lineup calculation; simply sitting out both rounds does not count.',
        'For makeup or unscheduled matches, the old charter uses a reduced threshold of 12 men and two women before the one-point short-lineup assessment applies.',
        'If a team loses players between round one and round two, additional points may be due for the reduced round-two lineup.',
      ]},
      {title: 'Other roster violations', source: 'charter', points: [
        'The charter includes separate penalties for participating women beyond the opponent’s women’s count; see the women’s participation section.',
        'Each player added after exceeding the allowed season roster-move maximum causes a one-point deduction for each round that player participates in.',
        'Penalized rounds do not count toward finals qualification.',
        'Penalty points are real team points and count in the match total and relevant season points percentage.',
      ]},
      {title: 'Forfeiting a match', source: 'charter', points: [
        'If a team cannot mathematically win with the available players and applicable penalty points, the charter treats it as a forfeit, even if players attend for a recreational round.',
        'Players on the non-forfeiting team receive a finals qualification round; players on the forfeiting team do not.',
        'A team that forfeits twice across two consecutive seasons is barred for the remainder of the season and is not invited back the next year under the original charter, including restrictions on returning with mostly the same roster.',
      ]},
      {title: 'Exact forfeited score and combined penalties', source: 'review', text: 'The old charter uses different examples for forfeited scores (0/18 and 9–0), and its short-roster penalties predate the new ½-point no-show rule. Commissioners should settle precedence and prevent double-counting the same missing contest before this section is treated as final.'},
    ],
  },
  {
    id: 'standings',
    title: 'Standings & tiebreakers',
    eyebrow: '09 / SEASON RANKING',
    lead: 'Winning team matches takes priority. Points percentage is a tiebreaker, not a replacement for wins.',
    rules: [
      {title: 'Ranking order', source: 'updated', points: [
        '1. Total team match wins.',
        '2. Head-to-head among tied teams, when decisive.',
        '3. Points percentage.',
        '4. Total Clash points earned.',
        '5. Point differential.',
        'Team name and ID are used only as deterministic display fallbacks.',
      ]},
      {title: 'Multiway ties', source: 'charter', text: 'Head-to-head does not settle a circular or incomplete multiway tie. Break available spots one at a time; after placing a team, reapply head-to-head to the remaining tied teams before looking at points percentage.'},
      {title: 'How points percentage works', source: 'charter', text: 'The charter describes points percentage as the team’s total points scored divided by all points scored by both teams in its matches, including penalty points. The website implements earned points divided by points available; the formulas must be reconciled for unusual penalty/forfeit totals.'},
      {title: 'If everything remains tied', source: 'charter', text: 'If head-to-head and unrounded points percentage cannot settle a necessary position, the charter calls for a commissioner-arranged abbreviated on-course tiebreaker.'},
    ],
  },
  {
    id: 'finals',
    title: 'Finals & player qualification',
    eyebrow: '10 / CHAMPIONSHIP',
    lead: 'The charter describes a four-team finals day with two rounds. The current season’s playoff date and venue require annual confirmation.',
    rules: [
      {title: 'Who qualifies to play', source: 'charter', points: [
        'Men and women must have played at least two team matches for their own rostered team and remain on its active roster to qualify.',
        'A woman must have been officially rostered when participating in a match for that match to qualify her for finals.',
        'No borrowed or called-up women from another team may represent a team in finals.',
        'Any otherwise eligible qualified player may play finals; regular-season roster moves do not limit finals entries.',
      ]},
      {title: 'Brackets and results', source: 'charter', points: [
        'First round: No. 1 seed vs. No. 4 seed; No. 2 seed vs. No. 3 seed.',
        'Second round: Winners play for first, and first-round losers play each other.',
        'A 2–0 team wins the finals pool. The original charter assigns the remaining 1–1 teams their places by seeding without a third round.',
        'A tied finals match is resolved by sudden-death best-disc doubles.',
      ]},
      {title: 'Finals matchups', source: 'charter', points: [
        'The lower seed captain decides which team puts up the first player or pairing.',
        'Captains may mix singles and doubles in any order up to the allowed maximum for that player count; an 18-player team uses five doubles matches and eight singles matches.',
        'Women may play singles, mixed doubles, women’s doubles, or a combination; opponents match the chosen format.',
      ]},
      {title: 'Finals venue', source: 'charter', text: 'Captains choose a site suitable for four teams competing simultaneously and the end-of-season potluck. Commissioners help settle the venue if captains cannot agree. The older charter targets the first Saturday in March.'},
    ],
  },
  {
    id: 'operations',
    title: 'Fees, payouts & voting',
    eyebrow: '11 / LEAGUE ADMINISTRATION',
    lead: 'These are amounts and procedures from the 2025–26 charter. They are shown for completeness but must not be assumed to apply unchanged in 2026–27.',
    rules: [
      {title: '2025–26 entry fees', source: 'review', points: [
        'The historical entry fee was $600 per team.',
        '$450 went toward payouts and $150 to the league fund.',
        'Captains collected, disbursed and accounted for their team’s funds.',
        'The charter made late payment subject to possible forfeiture; current-season due dates and fees still need verification.',
      ]},
      {title: '2025–26 payouts', source: 'review', points: [
        'First place: $2,000; second place: $1,000; third place: $600.',
        'Team payout was made to the paying captain; the league did not manage individual player payments.',
        'Unused league funds carried forward. The charter directed remaining funds to charity if the league ceased operating.',
      ]},
      {title: 'Captain voting', source: 'charter', text: 'Commissioners facilitate votes when appropriate, and proposed votes go through them. A majority passes a proposal. Commissioners determine the method of resolving an evenly split vote.'},
      {title: 'Commissioner responsibilities', source: 'charter', text: 'Commissioners organize the season, resolve scheduling and administration questions, supervise league funds and determine necessary league expenses. Discretionary spending follows the captain-voting process.'},
    ],
  },
  {
    id: 'conduct',
    title: 'Sportsmanship & disputes',
    eyebrow: '12 / LEAGUE EXPECTATIONS',
    lead: 'Competition is serious, but sportsmanship and community remain the foundation of Team Clash.',
    rules: [
      {title: 'No cheating', source: 'charter', text: 'The charter calls for removal from the match and the league for cheating, with no transfer to another team. Captains are responsible for encouraging honest play.'},
      {title: 'Equipment and respect', source: 'charter', text: 'Use legal, undamaged discs and maintain respect for other players. Remember that the event is about food, fellowship and disc golf with friends.'},
      {title: 'Disputes go through captains', source: 'charter', text: 'Players should first raise questions and disputes with their captain. Captains bring unresolved matters to the commissioners for a decision.'},
    ],
  },
];

export function RulesContent() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sideNav} aria-label="Rules section navigation">
        <span className={styles.sideLabel}>CHARTER CONTENTS</span>
        {sections.map((section, index) => (
          <a href={'#' + section.id} key={section.id}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>
        ))}
        <div className={styles.sideNote}>Based on the 2025–26 Charter R3, with 2026–27 additions. Historical amounts and unresolved conflicts are marked for review.</div>
      </aside>

      <div className={styles.ruleContent}>
        <nav className={styles.mobileJump} aria-label="Jump to a section">
          {sections.map((section) => <a href={'#' + section.id} key={section.id}>{section.title}</a>)}
        </nav>

        <div className={styles.sourceLegend}>
          <span><i className={styles.legendCharter}/> 2025–26 Charter</span>
          <span><i className={styles.legendUpdated}/> New league rule</span>
          <span><i className={styles.legendReview}/> Needs confirmation</span>
        </div>
        <Link className={styles.textLink} href="/rules/original">Read the full original 2025–26 Charter →</Link>

        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className={styles.section}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>{String(index + 1).padStart(2, '0')}</span>
              <div><span className={styles.sectionEyebrow}>{section.eyebrow}</span><h2>{section.title}</h2></div>
            </div>
            <p className={styles.sectionLead}>{section.lead}</p>
            <div className={styles.ruleGrid}>
              {section.rules.map((rule) => (
                <article className={[styles.ruleItem, rule.source === 'updated' ? styles.updatedRule : '', rule.source === 'review' ? styles.reviewRule : ''].filter(Boolean).join(' ')} key={rule.title}>
                  <div className={styles.ruleTopline}>
                    <span className={styles.ruleSource}>{rule.source === 'updated' ? 'NEW RULE' : rule.source === 'review' ? 'CONFIRM FOR 2026–27' : '2025–26 CHARTER'}</span>
                  </div>
                  <h3>{rule.title}</h3>
                  {rule.text ? <p>{rule.text}</p> : null}
                  {rule.points ? <ul>{rule.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
                </article>
              ))}
            </div>
            {section.id === 'standings' ? <Link className={styles.textLink} href="/standings">View current standings →</Link> : null}
          </section>
        ))}

        <div className={styles.reviewSection}>
          <h2>Before final publication</h2>
          <p>This page includes the actual 2025–26 charter provisions and newly announced roster rules. Confirm this season’s team fees, calendar, exact roster cap, playoff arrangements, and combined penalty calculations before removing the working-draft label.</p>
          <div className={styles.bottomLinks}>
            <Link href="/schedule">Schedule →</Link>
            <Link href="/clash-index">Clash Index →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
