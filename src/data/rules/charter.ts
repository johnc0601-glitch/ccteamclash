// Source: CCTC Charter 2025-26 R3(1).docx, as uploaded October 19, 2026.
// Except for the two explicitly agreed Friday-noon roster-lock changes,
// historical charter wording is preserved for review, not newly ratified.
export type CharterEntry = {text: string; level: number; updated?: boolean};
export type CharterSection = {id: string; title: string; items: CharterEntry[]};

export const charterSections: CharterSection[] = [
  {
    "id": "league-commissioners",
    "title": "League Commissioners",
    "items": [
      {
        "text": "John Carroll",
        "level": 0
      },
      {
        "text": "Jake Lehmann",
        "level": 0
      }
    ]
  },
  {
    "id": "teams",
    "title": "Teams",
    "items": [
      {
        "text": "During the off season, the commissioners will open up registration for the winter CCTC season.",
        "level": 0
      },
      {
        "text": "Team Registration: September 1th – 19th",
        "level": 0
      },
      {
        "text": "All teams who wish to be considered for the CCTC season must apply during this time period. Team Registration will be completed via Jotform or another comparable platform.",
        "level": 1
      },
      {
        "text": "Teams will be approved by the commissioners based on their legacy and hosting capabilities. If an insufficient number of teams applied to satisfy the number of registered players, the commissioners can choose to either create new teams or increase the roster size for the season. The intent is to maximize playing roster size at 16 & 2 to make the most efficient use of 18- hole courses for finals.",
        "level": 1
      },
      {
        "text": "Captains are responsible for recruiting team members and collecting entry fees. If a team does not include the minimum number of registered players, the captain must still submit full team fees and will be assessed penalty points in matches if they do not meet the minimum.",
        "level": 1
      },
      {
        "text": "The intent is to have an even number of teams each year (6, 8, 10, 12, etc.) If an odd number of teams is assigned, each team will have a bye month chosen. Bye months will be determined by the previous season finish (i.e. first place finish = first choice of bye).",
        "level": 1
      },
      {
        "text": "Seeding for 2025/26 is:",
        "level": 1
      },
      {
        "text": "Dark Knights",
        "level": 2
      },
      {
        "text": "Cougar Country",
        "level": 2
      },
      {
        "text": "Kure Beach",
        "level": 2
      },
      {
        "text": "Haynous OG’s",
        "level": 2
      },
      {
        "text": "Beast Mode",
        "level": 2
      },
      {
        "text": "Wild Turkey",
        "level": 2
      },
      {
        "text": "Jacksonville",
        "level": 2
      },
      {
        "text": "Myrtle Beach",
        "level": 2
      },
      {
        "text": "Team courses are as follows:",
        "level": 2
      },
      {
        "text": "Castle Hayne 1",
        "level": 0
      },
      {
        "text": "Cougar Country",
        "level": 0
      },
      {
        "text": "Joe Eaks Park",
        "level": 0
      },
      {
        "text": "Wild Turkey",
        "level": 0
      },
      {
        "text": "The Beast",
        "level": 0
      },
      {
        "text": "Jacksonville",
        "level": 0
      },
      {
        "text": "Castle Hayne 2",
        "level": 0
      },
      {
        "text": "Myrtle Beach",
        "level": 0
      }
    ]
  },
  {
    "id": "deadlines",
    "title": "Deadlines",
    "items": [
      {
        "text": "Team entry fees are due by September 9/30/2025. This will be given to either John Carroll or Jake Lehmann",
        "level": 0
      },
      {
        "text": "Failure to pay on time may result in forfeiture.",
        "level": 0
      },
      {
        "text": "Rosters must be completed by October 3rd 2025. / First Matches are October 4th 2025.",
        "level": 0
      }
    ]
  },
  {
    "id": "fees",
    "title": "Fees",
    "items": [
      {
        "text": "Each team’s entry fee is $600.00 for the season.",
        "level": 0
      },
      {
        "text": "Entry fees will be held by the commissioners in a safety deposit box, until the end of the season payouts.",
        "level": 1
      },
      {
        "text": "Captains are responsible for collecting, receiving, and distributing funds from/to players on their team and the league commissioners. Captains are responsible for any accounting/taxes resulting from collecting or receiving funds.",
        "level": 0
      },
      {
        "text": "$450.00 from the entry fee will go to payouts and $150.00 will go towards a league fund.",
        "level": 0
      },
      {
        "text": "League Fund is intended to cover necessary costs associated with running the league or facilitating finals (greens fees, permit costs, etc.), and discretionary spending as desired (food, trophies, etc.).",
        "level": 1
      },
      {
        "text": "Necessary cost will be determined solely by the commissioners.",
        "level": 2
      },
      {
        "text": "Discretionary spending will be determined by the Captain’s Voting Process.",
        "level": 2
      },
      {
        "text": "Any unused funds will carry over into the following season.",
        "level": 2
      },
      {
        "text": "In the event the league ceases to continue, the funds will be donated to Throw Pink, or a local charity chosen by the commissioners.",
        "level": 2
      }
    ]
  },
  {
    "id": "payouts",
    "title": "Payouts",
    "items": [
      {
        "text": "League Payouts will be made to the captain who paid for the team’s entry fee.",
        "level": 0
      },
      {
        "text": "$2,000.00 to the first-place team, $1,000.00 to the second-place team, $600.00 to the third-place team. (This may be adjusted if more teams are established in the future).",
        "level": 0
      },
      {
        "text": "The league is not responsible for ensuring individual players on a team pay or receive any funds.",
        "level": 0
      }
    ]
  },
  {
    "id": "scheduling",
    "title": "Scheduling",
    "items": [
      {
        "text": "Challenges will be held monthly October -February with Finals in March",
        "level": 0
      },
      {
        "text": "In the event of inclement weather, February’s matches will become make up matches.",
        "level": 0
      },
      {
        "text": "Inclement weather is defined as weather that is unsafe, unplayable, or hinder fair play (not limited to, Lightning or Thunderstorms, rain so intense that tee pads are dangerous, the course is flooding or pooling water inhibits safe play, deep snow, ice-covered fairways, or frozen tee pads that may cause injuries, hazardous course conditions, etc.).",
        "level": 1
      },
      {
        "text": "If February is required for makeup matches, all tentatively schedule matches will be cancelled in leu of the makeup matches.",
        "level": 0
      },
      {
        "text": "The season details will be finalized in September, along with match dates.",
        "level": 0
      },
      {
        "text": "March will be targeted for finals. If no makeup matches are needed in February, then the tentatively scheduled matches will take place.",
        "level": 0
      },
      {
        "text": "If both captains agree to postpone a match, they are responsible for fulfilling the match before the makeup date. If the captains cannot agree to a date, the makeup date (February) will become the default date.",
        "level": 0
      },
      {
        "text": "If captains do not agree to postpone a match, the original default date will stand.",
        "level": 0
      },
      {
        "text": "If both teams fail to reschedule and do not attend the makeup date, they both will receive a loss for the match.",
        "level": 0
      },
      {
        "text": "Forfeited matches will result in 0/18 points won/lost.",
        "level": 0
      }
    ]
  },
  {
    "id": "the-match",
    "title": "The Match",
    "items": [
      {
        "text": "The Home Team must host a potluck style lunch for both teams (if your team wishes to cater food, please feel free to do so).",
        "level": 0
      },
      {
        "text": "The Home Team is responsible for securing any pavilions, tents, tables, and is responsible for course maintenance (cleaning tees, fairway upkeep, location for lunch (i.e. pavilions, tables, power, etc.).",
        "level": 0
      },
      {
        "text": "Home Team decides the course layout for each round, to be announced the morning of the match, what to do in the event of a doubles match tie, along with any OB or special provisions.",
        "level": 0
      },
      {
        "text": "16 men (2) Age 50+",
        "level": 0
      },
      {
        "text": "2 women minimum",
        "level": 0
      },
      {
        "text": "First Round is singles match play. (Scoring can be done via tcmatchplay.net)",
        "level": 0
      },
      {
        "text": "Second Round is doubles stroke play. (Scoring can be done via UDisc under events)",
        "level": 0
      },
      {
        "text": "Women must play against each other in the singles round (unless one of the teams is above or below the minimum – gender must be matched as long as it is possible given the available players in the match).",
        "level": 0
      },
      {
        "text": "Captains must decide on how to play women in the doubles round (i.e. W/W or M/W)",
        "level": 0
      },
      {
        "text": "If Captains can’t agree, it will default to how the matches are thrown out during the matchups. (i.e. Team 1 throws out W/M team, Team 2 must match format [unless they are below the minimum or leading team is above the minimum number of women has already been matched up]).",
        "level": 1
      },
      {
        "text": "Team captains must finalize and submit the official playing roster by 12:00 PM (noon) Eastern on the Friday immediately before the scheduled match, including which players are not in attendance.",
        "level": 0,
        "updated": true
      },
      {
        "text": "Every effort should be made to play with the max amount of people possible – no player should be sitting for strategic purposes. If a player is benched in the first round, they will be played in the second round. NO ONE will sit two rounds.",
        "level": 0
      },
      {
        "text": "First Round – Home team decides if they want to put up first or second.",
        "level": 0
      },
      {
        "text": "Second Round – Away team decides if they want to put up first or second.",
        "level": 0
      },
      {
        "text": "Neutral matches – flip disc / coin to determine who is “home” for matchup purposes.",
        "level": 0
      },
      {
        "text": "Snake order for matchups (i.e. Team A puts up their player, Team B matches, now it’s Team B’s turn to put up a player and Team A matches. Repeat until all matchups are set.",
        "level": 0
      },
      {
        "text": "Late comer rule – You may match up a player who has not yet arrived, however, if the match begins play, the late player forfeits each hole they are not present.",
        "level": 0
      }
    ]
  },
  {
    "id": "rosters",
    "title": "Rosters",
    "items": [
      {
        "text": "Official Rosters:",
        "level": 0
      },
      {
        "text": "Playing Roster Size is 18 Players made up of 16 men (2) 50+ and 2 women.",
        "level": 1
      },
      {
        "text": "Maximum Team Roster size is 28.",
        "level": 1
      },
      {
        "text": "25 Men (Must have two 50+ on roster (16 to Play)",
        "level": 2
      },
      {
        "text": "4 Women (2 to Play)",
        "level": 2
      },
      {
        "text": "Additional women can be added to a team, and will be allowed to increase roster size (i.e. 25 Men and 8 women)",
        "level": 2
      },
      {
        "text": "Players can only be on one official roster per season. A roster becomes official at a team’s first match. A player is officially on a roster once the roster is official at the first match, whether or not a player has played in any matches. (Note that other qualifications/penalties may require a player to actually play)",
        "level": 1
      },
      {
        "text": "A player may only play for a team in which they are rostered, females are exempt from this rule.",
        "level": 1
      },
      {
        "text": "Juniors (14 and younger) do not count toward your roster size. Juniors do not receive any bonus points for play.",
        "level": 1
      }
    ]
  },
  {
    "id": "roster-moves",
    "title": "Roster Moves",
    "items": [
      {
        "text": "Maximum of 8 roster moves per season.",
        "level": 0
      },
      {
        "text": "Roster moves may be increased/decreased by the commissioners prior to the start of the season if the number of teams changes from the previous season.",
        "level": 1
      },
      {
        "text": "A roster move is considered dropping a player and adding another player.",
        "level": 0
      },
      {
        "text": "A Player dropped from a roster is not eligible to play for another team for the remainder of the current season.",
        "level": 1
      },
      {
        "text": "Filling out an unfilled roster spot is not considered a roster move.",
        "level": 0
      },
      {
        "text": "Rosters don’t lock until your first match, so any moves made prior to this date do not count as a roster move.",
        "level": 0
      },
      {
        "text": "Roster moves to replace/fill women’s spots do not count as roster moves.",
        "level": 0
      },
      {
        "text": "Teams may call up additional women players to play for their team that are not on their roster. These Women players may be called up to play in any match except playoffs.",
        "level": 1
      },
      {
        "text": "Additionally, rostered women players may be asked to play for other teams as long as they are available.",
        "level": 1
      },
      {
        "text": "Roster moves are used for regular season matches. Any player that qualifies for finals can play finals.",
        "level": 0
      }
    ]
  },
  {
    "id": "roster-penalties",
    "title": "Roster Penalties",
    "items": [
      {
        "text": "Penalty points will be assessed for bringing less than a full roster (See Penalties).",
        "level": 0
      },
      {
        "text": "Players must be present at the match to count towards a team’s roster.",
        "level": 0
      },
      {
        "text": "Each captain must submit their official playing roster in writing by 12:00 PM (noon) Eastern on the Friday immediately before the scheduled match. Official rosters must include each player’s first and last name and any additional information needed to identify players. Changes after this deadline require commissioner approval.",
        "level": 0,
        "updated": true
      },
      {
        "text": "Once matchups start, both captains are committed to using their official playing rosters. If the official playing roster does not match the actual players in attendance, no substitutions can be made and the team with the incorrect players will lose points if the assigned player doesn’t compete.",
        "level": 1
      },
      {
        "text": "If minor mistakes are caught during matchups, they can only be corrected if both captains agree. Otherwise, captains are stuck with their announced rosters.",
        "level": 1
      }
    ]
  },
  {
    "id": "match-scoring",
    "title": "Match Scoring",
    "items": [
      {
        "text": "Singles victory is worth (1) point.",
        "level": 0
      },
      {
        "text": "Singles Ties are halved for (0.5) point each.",
        "level": 0
      },
      {
        "text": "Doubles victory is worth (2) points.",
        "level": 0
      },
      {
        "text": "In the event that teams agree to play an odd number of players, singles or triples can be played in the doubles round with the singles match victory counting as (1) point, and a triples match victory counting as (3) points.",
        "level": 1
      },
      {
        "text": "Double Ties will be played off in sudden death format.",
        "level": 0
      },
      {
        "text": "If captains decide to allow Dubs ties, each team will receive (1) point.",
        "level": 1
      },
      {
        "text": "Forfeited matched will be scored 0 (i.e. 9-0).",
        "level": 0
      },
      {
        "text": "A team that does not bring enough players to mathematically have a chance to win (including penalty points) is a forfeit. They may play for fun if they decide to still show up.",
        "level": 0
      },
      {
        "text": "All players on the team that didn’t forfeit get a qualification round counted.",
        "level": 0
      },
      {
        "text": "No players on the team that forfeited will get a qualification round counted.",
        "level": 0
      },
      {
        "text": "Any team that forfeits 2 matches within 2 consecutive CCTC seasons will be banned for the rest of the season (all un-played matches scored as forfeits) and not be invited back to the league next year. They also cannot start a new team with greater than 50% of the same roster. All players are welcome to join other teams the following year.",
        "level": 0
      },
      {
        "text": "Matches that end in a tie will go to sudden death best-disc doubles with each team picking any 2 players. The home team decides on the hole to start and layout. Neutral or finals default to Hole 1 or closest hole to where the teams are meeting.",
        "level": 0
      },
      {
        "text": "Match results should be posted by the HOME TEAM on the team challenge Facebook Page within a week of the match in fairness to other teams and the commissioners.",
        "level": 0
      },
      {
        "text": "Results should be posted with full names (no nicknames) and in the proper format (i.e. John Carroll beats Jake Lehmann 3&2, and John Carroll/Jake Lehmann beat Joe Smith/Tom Johnson",
        "level": 0
      }
    ]
  },
  {
    "id": "penalties",
    "title": "Penalties",
    "items": [
      {
        "text": "If you don’t bring a full roster of players to a challenge, the opposing team will be awarded 1 point per round per player for the difference between the minimum (or the number they brought, whichever is lower), and what you brought each round. (i.e. Maximum is 16, you bring 14 and the other team brings 10, they will be awarded 4 penalty points each round).",
        "level": 0
      },
      {
        "text": "Each player must be played for at least one round in order to count towards any point calculation. (Simply having someone sit both rounds will not count towards your roster number for penalty points).",
        "level": 1
      },
      {
        "text": "Make up or unscheduled matches will only assign the 1-point penalty to rosters below 12 & 2.",
        "level": 1
      },
      {
        "text": "If there are a mismatched number of players, captains can agree how to play it (extra sits, cali, 2v1, etc.) default is to play the lower number and extras sit.",
        "level": 0
      },
      {
        "text": "Woman Penalty: If you don’t bring and/or play 2 women and the other team PLAYS their extra women they will get 1 points EACH ROUND for each woman in excess of yours that they play, up to the playing roster.",
        "level": 0
      },
      {
        "text": "Examples:",
        "level": 1
      },
      {
        "text": "If Team A plays three woman, and Team B plays one women, team A is awarded 2 penalty points.",
        "level": 2
      },
      {
        "text": "This applies to both singles and doubles rounds.",
        "level": 2
      },
      {
        "text": "The winner of that guy/girl match(es) still gets a point per match or two in doubles.",
        "level": 0
      },
      {
        "text": "If you have fewer players available than played in the first round, the other team will be awarded the difference of what was played 1st round and that of the 2nd round (Net of 1 point in addition to full roster penalty).",
        "level": 0
      },
      {
        "text": "Examples:",
        "level": 1
      },
      {
        "text": "Team A Brings 13/1, and Team B brings 15/2.",
        "level": 2
      },
      {
        "text": "If Team B Plays 12/2 vs 13/1, they will be awarded 1 point for playing an extra woman, and 3 Points for benching 3 roster spots. (A Total of 4 penalty points are assessed).",
        "level": 2
      },
      {
        "text": "Team A Brings 14/1, and Team B brings 15/2.",
        "level": 2
      },
      {
        "text": "Round 1 Team B plays 14/1 vs 13/2. Team B is awarded 1 point for the extra woman, and 2 points for the 2 benched players. If then Team A loses a plyer, and Round 2 is played 13/1 vs 12/2, Then Team B is awarded 1 point for the women, 3 points for the benched players, and 1 point for the reduced Round 2 Roster (Total of 5 penalty points will be assessed).",
        "level": 2
      },
      {
        "text": "Team A brings 12/2, and Team B brings 15/2.",
        "level": 2
      },
      {
        "text": "Round 1 plays 12/2 vs 12/2. Team B is awarded 3 points because team A did not meet the full roster. If Team A then loses a player for round 2, and is played 11/2 vs 11/2. Team B is awarded 1 Point for the missing player, and 4 points for the benched players (Total of 5 Penalty points will be assessed).",
        "level": 2
      },
      {
        "text": "Team A brings 13/3, and Team B brings 14/2.",
        "level": 2
      },
      {
        "text": "Since both teams have 16 players present, no missing roster penalty points are assessed. If Team A plays all 3 women, team B will be assessed 1 point penalty. This is the only penalty awarded/assessed.",
        "level": 2
      },
      {
        "text": "If Team A chose to play 13/2, no penalties would be awarded/assessed (one woman would be benched from Team A and one man would be benched from Team B).",
        "level": 2
      },
      {
        "text": "If a team exceeds the maximum number of roster moves, any players added beyond the maximum will receive a 1-point deduction per round per player. Penalized rounds will not count towards finals eligibility.",
        "level": 0
      },
      {
        "text": "Penalty points are real points and count toward the match total and season ending tiebreaker points percentage formula.",
        "level": 0
      },
      {
        "text": "Commissioners will maintain a running scoring system on the team challenge Facebook page.",
        "level": 0
      }
    ]
  },
  {
    "id": "season-scoring",
    "title": "Season Scoring",
    "items": [
      {
        "text": "Finals seeding is determined by each team’s record of match wins and losses. Point’s percentage will also be tracked.",
        "level": 0
      }
    ]
  },
  {
    "id": "tie-breakers",
    "title": "Tie Breakers",
    "items": [
      {
        "text": "Season ending ties will be broken by Head-to-Head, Points Percentage",
        "level": 0
      },
      {
        "text": "Head-to-Head can’t break a multiway tie if teams haven’t played each other OR they haven’t beat the other team(s).",
        "level": 0
      },
      {
        "text": "Example: Team A beat Team B, Team B beat Team C, This does NOT mean that Team A > Team C. This is when the Points % comes into play.",
        "level": 1
      },
      {
        "text": "If Team A beat Team C and Team B beat Team C, then Team C loses H2H with the other two teams and they are out. This can only happen in a 4+ team tie, because in the above example A or B would also have 2 wins and win the spot outright.",
        "level": 1
      },
      {
        "text": "If there is a multiway tie for multiple spots, each tie is broken individually, the highest place is awarded first (or the last in the case of losing H2H vs all other if there is no outright H2H winter), then the tie-breaker is applied again with the remaining tied teams. H2H is always the first way used to break the tie (with H2H winner taking priority over H2H loser).",
        "level": 0
      },
      {
        "text": "Example: Team A, B and C are all tied for the last two spots. We must break the tie for the first spot with Points % if H2H does not resolve it. Now there are two teams tied for the last spot and we need to break that tie. H2H is the first method, if they didn’t play each other, it’s Points % again.",
        "level": 1
      },
      {
        "text": "Points Percentage = (Team’s Total Points Scored) / (Total Points by both teams in matches played). Includes penalty points.",
        "level": 0
      },
      {
        "text": "If H2H and Points% (unrounded) still results in a tie, the commissioners will work with both teams to find a way to break the tie that involves playing some sort of abbreviated match (i.e. doubles teams meet at a neutral location).",
        "level": 0
      }
    ]
  },
  {
    "id": "finals",
    "title": "Finals",
    "items": [
      {
        "text": "Will be held on the 1st Saturday of March.",
        "level": 0
      },
      {
        "text": "Men & Women must Play 2 matches on their rostered team to qualify for Finals and be on the active roster. Women must have been rostered at the time of matches to earn a qualification match.",
        "level": 0
      },
      {
        "text": "No Women may be called up from other teams to represent at Finals.",
        "level": 1
      },
      {
        "text": "All players with 2 or more matches can be rostered for finals. Roster moves are only used in the regular season.",
        "level": 0
      }
    ]
  },
  {
    "id": "finals-location",
    "title": "Finals Location",
    "items": [
      {
        "text": "Captains will mutually discuss and pick a finals locations that is suitable to handle 4 teams in play at one time and can facilitate end of season potluck. If a course cannot be agreed upon, the commissioners will help facilitate the best way they see fit (i.e. blind vote, choosing). It is up to the captains and commissioner to pick a course that can be used for the day.",
        "level": 0
      }
    ]
  },
  {
    "id": "finals-matchups",
    "title": "Finals Matchups",
    "items": [
      {
        "text": "Round 1: Number 1 Seed vs. Number 4 Seed / Number 2 Seed vs. Number 3 Seed.",
        "level": 0
      },
      {
        "text": "Round 2: Two winners play each other; Two losers play each other.",
        "level": 0
      },
      {
        "text": "The team that wins (2-0) both matches is the winner of the pool.",
        "level": 1
      },
      {
        "text": "Two remaining 1-1 teams are awarded place by seeding (no round 3).",
        "level": 1
      },
      {
        "text": "Lower seed captain decides what team chooses their first player(s).",
        "level": 0
      },
      {
        "text": "Captains can choose singles or doubles in any order up to the max (see breakdown below).",
        "level": 0
      },
      {
        "text": "Captains can choose to play women in singles, mixed doubles, women’s doubles or any combination.",
        "level": 0
      },
      {
        "text": "Captains must match the opponent’s choice with the same format.",
        "level": 0
      },
      {
        "text": "Singles matches are worth 1 Point (0.5 points for a push/tie)",
        "level": 0
      },
      {
        "text": "Doubles matches are worth 2 Points (playoff for ties)",
        "level": 0
      },
      {
        "text": "An overall tie round between 2 teams will force a sudden death playoff. Each team will put up their best doubles pairing to compete for the win. Captains can use any combination of players for their best doubles pairing.",
        "level": 0
      }
    ]
  },
  {
    "id": "captain-s-voting",
    "title": "Captain’s Voting",
    "items": [
      {
        "text": "Voting will be facilitated by the commissioners when deemed necessary.",
        "level": 0
      },
      {
        "text": "Any proposed votes should be routed through the commissioners.",
        "level": 1
      },
      {
        "text": "A Vote will pass if the majority agree. Any ties will be broken by a method determined by the commissioners.",
        "level": 0
      }
    ]
  },
  {
    "id": "important-league-notes",
    "title": "Important League Notes",
    "items": [
      {
        "text": "NO CHEATING. Any player found to be cheating in any way, you will not just be removed from the day/match, but from the CCTC and unable to play on/for another team.",
        "level": 0
      },
      {
        "text": "Captains are responsible for ensuring their players are honest and do not cheat.",
        "level": 1
      },
      {
        "text": "Don’t have holes or cracks in your discs.",
        "level": 0
      },
      {
        "text": "Be nice to one another. We all know, love, respect, and play together all year, keep that in mind. This is a team challenge, but it is about Food, Fellowship, and Disc Golf with friends.",
        "level": 0
      },
      {
        "text": "If you have issues with anything, dates, times, other players, why someone throws all red discs, please go to your Team Captains. Your Captain can communicate to the Commissioners about the issues and then a resolution will be found.",
        "level": 0
      }
    ]
  }
];

export const finalsMatchFormats = [
  {players: 10, doubles: 3, singles: 4},
  {players: 11, doubles: 3, singles: 5},
  {players: 12, doubles: 3, singles: 6},
  {players: 13, doubles: 3, singles: 7},
  {players: 14, doubles: 4, singles: 6},
  {players: 15, doubles: 4, singles: 7},
  {players: 16, doubles: 4, singles: 8},
  {players: 18, doubles: 5, singles: 8},
] as const;


// Draft reconciliation notes for the 2026–27 review. Original charter items above
// remain visible as source text, without silently adopting unresolved alterations.
export type CharterDraftNote = {
  status: 'Agreed update' | 'Clarification proposed' | 'Decision required';
  text: string;
};
export const charterDraftNotes: Record<string, CharterDraftNote[]> = {
  rosters: [
    {status: 'Agreed update', text: 'The regular match playing roster has 18 designated positions: a maximum of 16 men, including two players age 50 or older, and two positions reserved for women. A team lacking women must not fill those protected positions with additional men.'},
    {status: 'Clarification proposed', text: 'A season team roster identifies which team a player belongs to; the playing roster is the lineup for an individual match. Being on the season team roster does not by itself establish that a player attended or played a match.'},
    {status: 'Clarification proposed', text: 'During regular-season matches, a woman may be called up from the league player pool or another team when available, consistent with the original charter. Finals are restricted to eligible rostered players; borrowed women may not be called up for finals.'},
    {status: 'Decision required', text: 'The 2025–26 charter says the maximum team roster is 28 while also specifying 25 men plus four women (29 players), with an exception for additional women. Commissioners must confirm the 2026–27 overall cap and the treatment of extra women before this wording is replaced.'}
  ],
  'roster-moves': [
    {status: 'Clarification proposed', text: 'Keep separate rules for season-team roster membership and Friday match playing-roster submissions. The first match makes season-team membership official under the prior charter; each match playing roster locks Friday at noon Eastern.'},
    {status: 'Decision required', text: 'The older charter allows eight counted season roster moves. Confirm whether the 2026–27 limit remains eight and whether there is a season cutoff; do not assume matchday edits count as season roster moves.'}
  ],
  'roster-penalties': [
    {status: 'Agreed update', text: 'Each captain must submit the official playing roster by 12:00 PM (noon) Eastern on the Friday immediately before a scheduled match. The old 24-hour deadline and the website’s 3:00 PM Matchday lock do not set the league deadline.'},
    {status: 'Agreed update', text: 'A player listed on the official playing roster who does not attend incurs a 0.5-point award to the opposing team. If that player is also placed in a matchup and does not compete, the opponent receives an additional 0.5 point.'},
    {status: 'Clarification proposed', text: 'Record rostered no-shows, unplayed contest positions, and other penalties as distinct score components. Award each named penalty once; do not treat a team’s roster count alone as proof of a no-show or double-count an unplayed position.'},
    {status: 'Decision required', text: 'The old charter allows minor corrections during matchups if both captains agree. Clarify how that interacts with the new requirement for commissioner approval of official roster changes after the Friday noon deadline.'}
  ],
  penalties: [
    {status: 'Clarification proposed', text: 'For ordinary matches, assess missing-player and unfilled-position awards from the actual eligible players and recorded round positions, not simply the number of names registered on a team. The source charter awards one point per missing player per round, subject to its exceptions.'},
    {status: 'Agreed update', text: 'A rostered no-show awards 0.5 point to the opponent; a no-show player already assigned to a matchup incurs an additional 0.5 point. These are separate from ordinary contest results. Commissioners must reconcile the complete score and avoid duplicate adjustments.'},
    {status: 'Clarification proposed', text: 'The women’s shortage award in the original charter is one point per round for each extra woman the opponent actually plays, up to the applicable playing roster. Match victories remain separately scored. Protect the two women’s positions rather than replacing them with additional men.'},
    {status: 'Clarification proposed', text: 'For reduced second-round participation, use the original charter’s extra one-point-per-missing-player provision only when supported by the actual first- and second-round lineups. Display it separately from other automatic or administrative awards.'},
    {status: 'Decision required', text: 'The 2025–26 examples do not consistently explain overlapping missing-player, women’s, and reduced-round adjustments. Validate those examples against recorded matches before replacing them; the inherited examples shown below are historical, not a new ruling.'},
    {status: 'Decision required', text: 'Confirm whether the 12-men-plus-two-women makeup-match penalty exception and the one-point-per-round penalty for players added beyond the season move limit remain in effect in 2026–27.'}
  ],
  'match-scoring': [
    {status: 'Decision required', text: 'The inherited charter describes a 0–18 forfeiture elsewhere but current normal regular-season match scoring offers 36 ordinary competition points. Confirm official forfeit scoring before changing it in the charter.'}
  ]
};
