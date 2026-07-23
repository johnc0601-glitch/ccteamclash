import type {HistoricalSeasonImportSource} from '@/domain/history/HistoricalRecord';

export const HISTORICAL_RECORD_SOURCES = [
  {
    "id": "coastal-clash-2024-2025",
    "name": "Coastal Clash Match Play 2024-2025",
    "sourceFilename": "Coastal Clash Match Play '24_'25.xlsx",
    "teamRecords": [
      {
        "id": "coastal-clash-2024-2025-dark-knights",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "wins": 4,
        "losses": 1,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 105.0,
        "pointsAvailable": 174.0
      },
      {
        "id": "coastal-clash-2024-2025-kb",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "wins": 4,
        "losses": 1,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 105.0,
        "pointsAvailable": 176.0
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "wins": 4,
        "losses": 1,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 103.0,
        "pointsAvailable": 180.0
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "wins": 2,
        "losses": 3,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 97.5,
        "pointsAvailable": 181.0
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "wins": 1,
        "losses": 4,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 72.0,
        "pointsAvailable": 179.0
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "wins": 0,
        "losses": 5,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 59.5,
        "pointsAvailable": 156.0
      }
    ],
    "playerRecords": [
      {
        "id": "coastal-clash-2024-2025-wild-turkey-ben-morrow",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Ben Morrow",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 5,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-stephen-ajov",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Stephen Ajov",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-tommy-phillips",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Tommy Phillips",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-mike-wooten",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Mike Wooten",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-jesse-smelik",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Jesse Smelik",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-cody-biggs",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Cody Biggs",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-mark-bostic",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Mark Bostic",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-drew-massey",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Drew Massey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-sean-mansell",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Sean Mansell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-jason-long",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Jason Long",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-jeff-collins",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Jeff Collins",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-mike-jones",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Mike Jones",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-brandon-jamison",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Brandon Jamison",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-bobby-phillips",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Bobby Phillips",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-kyle-paige",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Kyle Paige",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-daniel-johnson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Daniel Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-bailey-nichols",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Bailey Nichols",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-richie-abshner",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Richie Abshner",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-john-grant",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "John Grant",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 3,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-travis-bochum",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Travis Bochum",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-nicki-irrea",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Nicki Irrea",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-darian-green",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Darian Green",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-jamie-hensley",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Jamie Hensley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-mizz",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Mizz",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-shannon-johnson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Shannon Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-tracy-woodlard",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Tracy Woodlard",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-bobby-taylor",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Bobby Taylor",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-ryan-barber",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Ryan Barber",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-mike-hines",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Mike Hines",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2024-2025-wild-turkey-brett-patrick",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Wild Turkey",
        "playerName": "Brett Patrick",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-jimbo-lemire",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Jimbo Lemire",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-derek-hynds",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Derek Hynds",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-justin-jro-roach",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Justin (JRo) Roach",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-steve-lipke",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Steve Lipke",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-dalton-medlin",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Dalton Medlin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-sawyer-webster",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Sawyer Webster",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-john-loyd",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "John Loyd",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-bryce-behrendt",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Bryce Behrendt",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-scott-strickland",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Scott Strickland",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-john-blackburn",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "John Blackburn",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-mike-duncan",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Mike Duncan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-jordan-darby",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Jordan Darby",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-logan-hitchcock",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Logan Hitchcock",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-zach-redding",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Zach Redding",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-isaac-cotson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Isaac Cotson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-dan-moles",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Dan Moles",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 2,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-mitchell-puttbach",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Mitchell Puttbach",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-mike-bloch",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Mike Bloch",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-david-thompson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "David  Thompson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-georgia-busch",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Georgia  Busch",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-brandon-roy",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Brandon Roy",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-ashlee-hynds",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Ashlee Hynds",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-crystal-fussell",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Crystal Fussell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-kb-amanda-valois",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "KB",
        "playerName": "Amanda Valois",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-alex-wetherell",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Alex Wetherell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 3,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-john-carroll",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "John Carroll",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-eli-batazhan",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Eli Batazhan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-owen-shields",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Owen Shields",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-dwain-gunnels",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Dwain Gunnels",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-alex-karp",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Alex Karp",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-paul-andrews",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Paul Andrews",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-michael-nassisi",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Michael Nassisi",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-philip-murray",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Philip Murray",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-ian-roberts",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Ian Roberts",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-stone-tippett",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Stone Tippett",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-christo-henry",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Christo Henry",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-jake-stephenson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Jake Stephenson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-guy-seifert",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Guy Seifert",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-justin-kent",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Justin Kent",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-chuck-myers",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Chuck Myers",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-travis-shallow",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Travis Shallow",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-randy-giles",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Randy Giles",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-alex-bradshaw",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Alex Bradshaw",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-walt-stanfield",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Walt Stanfield",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-jamieson-vollbrecht",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Jamieson Vollbrecht",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-bill-mcclernan",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Bill McClernan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-rosa-carroll",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Rosa Carroll",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-candy-mcclernan",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Candy McClernan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-hope-brown",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Hope Brown",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-dark-knights-julie-nassisi",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Dark Knights",
        "playerName": "Julie Nassisi",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-robert-scribner",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Robert Scribner",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-charlie-johnson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Charlie Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-aidan-prince",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Aidan Prince",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-kevin-truett",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Kevin Truett",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-david-burke",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "David Burke",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-josh-beardsley",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Josh Beardsley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-darell-matthews",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Darell Matthews",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-joshua-matheson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Joshua Matheson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-tentis-moore",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Tentis Moore",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-eddie-mylod",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Eddie Mylod",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-chad-johnson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Chad Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-jason-helms",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Jason Helms",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-khalil-peterson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Khalil Peterson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-scott-prince",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Scott Prince",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 2,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-seth-brown",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Seth Brown",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-seth-stetson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Seth Stetson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 2,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-james-higgins",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "James Higgins",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 2,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-logan-mchale",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Logan McHale",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-albert-ducharme",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Albert Ducharme",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-william-deering",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "William Deering",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-dillon-blunier",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Dillon Blunier",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-sam-white",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Sam White",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-logan-canale",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Logan Canale",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-jasmine-pollack",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Jasmine Pollack",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-kim-mchale",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Kim Mchale",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-cougar-country-paul-jackson",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Cougar Country",
        "playerName": "Paul Jackson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-alan-layh",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Alan Layh",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-jake-lehmann",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Jake Lehmann",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-austin-gratton",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Austin Gratton",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-eric-england",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Eric England",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-clay-held",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Clay Held",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-john-moncrief",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "John Moncrief",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 2,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-brian-parker",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Brian Parker",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-kurty-mcgurty",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Kurty McGurty",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-ryan-bowie",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Ryan Bowie",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-carson-ham",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Carson Ham",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-scott-crouch",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Scott Crouch",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-brandon-cosimo",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Brandon Cosimo",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-darrin-pressley",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Darrin Pressley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-ray-ledbetter",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Ray Ledbetter",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-brian-steward",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Brian Steward",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-randy-roy",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Randy Roy",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-josh-beasley",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Josh Beasley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-chad-hessenflow",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Chad Hessenflow",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-michael-snipes",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Michael Snipes",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-john-graham",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "John Graham",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-chris-carter",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Chris Carter",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-chris-lamarsh",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Chris Lamarsh",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-ariel-cosimo",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Ariel Cosimo",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-alisica-fussell",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Alisica Fussell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-hayneous-og-s-jodie-lehman",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Hayneous OG's",
        "playerName": "Jodie Lehman",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-ryan-frusti",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Ryan Frusti",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 2,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-phil-hood",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Phil Hood",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-david-harding",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "David Harding",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-dart-arnold",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Dart Arnold",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-shelby-small",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Shelby Small",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-hunter-gainey",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Hunter Gainey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-brooks-mcgill",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Brooks McGill",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-hastin-mcgill",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Hastin McGill",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-john-miranda",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "John Miranda",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-thomas-vaughn",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Thomas Vaughn",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-derek-lewis",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Derek Lewis",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-michael-matthews",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Michael Matthews",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-alex-stanley",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Alex Stanley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-caleb-britton",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Caleb Britton",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-ben-grubbs",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Ben Grubbs",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-hubert-cheers",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Hubert Cheers",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-joe-bertone",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Joe Bertone",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-nick-king",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Nick King",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-dennis-heuser",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Dennis Heuser",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-alex-efting",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Alex Efting",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-tony-bellflower",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Tony Bellflower",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-angel-mabee",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Angel Mabee",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-misti-lee",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Misti Lee",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-abby-bertone",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Abby Bertone",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2024-2025-beast-mode-cecilia-costin",
        "seasonId": "coastal-clash-2024-2025",
        "teamName": "Beast Mode",
        "playerName": "Cecilia Costin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      }
    ]
  },
  {
    "id": "coastal-clash-2025-2026",
    "name": "Coastal Clash Match Play 2025-2026",
    "sourceFilename": "Coastal Clash Match Play '25_'26.xlsx",
    "teamRecords": [
      {
        "id": "coastal-clash-2025-2026-riptide",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "wins": 4,
        "losses": 1,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 113.5,
        "pointsAvailable": 177.0
      },
      {
        "id": "coastal-clash-2025-2026-kb",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "wins": 4,
        "losses": 1,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 104.0,
        "pointsAvailable": 173.0
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "wins": 3,
        "losses": 2,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 102.5,
        "pointsAvailable": 188.0
      },
      {
        "id": "coastal-clash-2025-2026-ninjas",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "wins": 3,
        "losses": 2,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 88.5,
        "pointsAvailable": 180.0
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "wins": 2,
        "losses": 3,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 87.0,
        "pointsAvailable": 179.0
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "wins": 2,
        "losses": 3,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 85.0,
        "pointsAvailable": 175.0
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "wins": 1,
        "losses": 4,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 78.5,
        "pointsAvailable": 173.0
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "wins": 1,
        "losses": 4,
        "ties": 0,
        "matchesPlayed": 5,
        "pointsEarned": 72.0,
        "pointsAvailable": 176.0
      }
    ],
    "playerRecords": [
      {
        "id": "coastal-clash-2025-2026-wild-turkey-roy-strawderman",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Roy Strawderman",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-mike-bloch",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Mike Bloch",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-peter-hourigan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Peter Hourigan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-tommy-phillips",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Tommy Phillips",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-brandon-jamison",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Brandon Jamison",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-ben-morrow",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Ben Morrow",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 5,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-jeff-collins",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Jeff Collins",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-john-patin",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "John Patin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-mark-goppert",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Mark Goppert",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-anthony-hardee",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Anthony Hardee",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-jeff-parsley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Jeff Parsley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-tony-robbins",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Tony Robbins",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-gavin-johnson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Gavin Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-drew-massey",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Drew Massey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-jeff-king",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Jeff King",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-daniel-johnson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Daniel Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-zach-teague",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Zach Teague",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-ben-curl",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Ben Curl",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-luke-hancock",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Luke Hancock",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-brandon-killian",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Brandon Killian",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-scott-keaton",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Scott Keaton",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-will-lindsey",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Will Lindsey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-jordan-flor",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Jordan Flor",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-andrew-lamont",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Andrew Lamont",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-shannon-johnson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Shannon Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-jamie-hensley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Jamie Hensley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-shannon-boney",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Shannon Boney",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-wild-turkey-hunter-feil",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Wild Turkey",
        "playerName": "Hunter Feil",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-jimbo-lemire",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Jimbo Lemire",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-derek-hynds",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Derek Hynds",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-justin-jro-roach",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Justin (JRo) Roach",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-steve-lipke",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Steve Lipke",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-dalton-medlin",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Dalton Medlin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-sawyer-webster",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Sawyer Webster",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-john-loyd",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "John Loyd",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-will-barwick",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Will Barwick",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-scott-strickland",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Scott Strickland",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-john-blackburn",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "John Blackburn",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-mike-duncan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Mike Duncan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-jordan-darby",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Jordan Darby",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-logan-hitchcock",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Logan Hitchcock",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 5,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-zach-redding",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Zach Redding",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-isaac-kotson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Isaac Kotson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-dan-moles",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Dan Moles",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-mitchell-puttbach",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Mitchell Puttbach",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-mark-bostic",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Mark Bostic",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-david-thompson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "David Thompson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-lawrence-shotwell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Lawrence Shotwell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-matt-miles-english",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Matt-Miles English",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-keith-connolly",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Keith Connolly",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-blake-eadie",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Blake Eadie",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-tyler-carlin",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Tyler Carlin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-crystal-fussell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Crystal Fussell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-ashlee-hynds",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Ashlee Hynds",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 2,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-sarah-moore",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Sarah Moore",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-georgia-busch",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "Georgia Busch",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-kb-david-thompson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "KB",
        "playerName": "David Thompson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-alex-wetherell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Alex Wetherell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-john-carroll",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "John Carroll",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-ilya-batazhan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Ilya Batazhan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-owen-shields",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Owen Shields",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-dwain-gunnels",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Dwain Gunnels",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-michael-nassisi",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Michael Nassisi",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-philip-murray",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Philip Murray",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-ian-roberts",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Ian Roberts",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-stone-tippett",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Stone Tippett",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-christo-henry",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Christo Henry",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-jake-stephenson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Jake Stephenson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-guy-seifert",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Guy Seifert",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-justin-kent",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Justin Kent",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-chuck-myers",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Chuck Myers",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-randy-giles",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Randy Giles",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-alex-bradshaw",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Alex Bradshaw",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-luke-hahn",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Luke Hahn",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-jamieson-vollbrecht",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Jamieson Vollbrecht",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-bill-mcclernan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Bill McClernan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-rudy-dixon",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Rudy Dixon",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-jason-long",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Jason Long",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-brandon-long",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Brandon Long",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-whit-stephenson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Whit Stephenson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-alex-karp",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Alex Karp",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-rosa-carroll",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Rosa Carroll",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-dark-knights-candy-mcclernan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Dark Knights",
        "playerName": "Candy McClernan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-ryan-bowie",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Ryan Bowie",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-charlie-johnson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Charlie Johnson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-robert-scribner",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Robert Scribner",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-darell-matthews",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Darell Matthews",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-seth-stetson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Seth Stetson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-josh-beardsley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Josh Beardsley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-kevin-truett",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Kevin Truett",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-scott-prince",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Scott Prince",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-brandon-burckhalter",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Brandon Burckhalter",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-jonathan-glass",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Jonathan Glass",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-jason-helms",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Jason Helms",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-trent-bailey",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Trent Bailey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-aidan-prince",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Aidan Prince",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-logan-mchale",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Logan McHale",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-khalil-peterson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Khalil Peterson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-brandon-taylor",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Brandon Taylor",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-albert-ducharme",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Albert Ducharme",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-josh-matheson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Josh Matheson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-george-midgley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "George Midgley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-heath-summerlin",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Heath Summerlin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-joe-barker",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Joe Barker",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-david-burke",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "David Burke",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-marty-adams",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Marty Adams",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-kevin-shelton",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Kevin Shelton",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-logan-canale",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Logan Canale",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-brianna-kinsman",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Brianna Kinsman",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-kim-mchale",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Kim McHale",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-cougar-country-joe-truett",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Cougar Country",
        "playerName": "Joe Truett",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-alan-layh",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Alan Layh",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-jake-lehmann",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Jake Lehmann",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-carson-ham",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Carson Ham",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-chris-carter",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Chris Carter",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-brian-steward",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Brian Steward",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-brandon-cosimo",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Brandon Cosimo",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-lucian-odom",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Lucian Odom",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-michael-snipes",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Michael Snipes",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-jarrod-honeycutt",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Jarrod Honeycutt",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-travis-baucom",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Travis Baucom",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-matt-rockwell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Matt rockwell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-austin-gratton",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Austin Gratton",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 2,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-eric-england",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Eric England",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-clay-held",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Clay Held",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-brian-parker",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Brian Parker",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-kurtis-brandenburg",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Kurtis Brandenburg",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-scott-crouch",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Scott Crouch",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-darrin-pressley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Darrin Pressley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-ray-ledbetter",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Ray Ledbetter",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-chad-hassenflow",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Chad Hassenflow",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-conner-garrett",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Conner Garrett",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-travis-webster",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Travis Webster",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-randy-roy",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Randy Roy",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-phil-turnage",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Phil Turnage",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-jodie-lehmann",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Jodie Lehmann",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 2,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-alisica-fussell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Alisica Fussell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-ariel-cosmo",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Ariel Cosmo",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 2,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-billy-fussell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "Billy Fussell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-hayneous-og-s-aj-lehmann",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Hayneous OG's",
        "playerName": "AJ Lehmann",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-ryan-frusti",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Ryan Frusti",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-phil-hood",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Phil Hood",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-hastin-mcgill",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Hastin McGill",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-alex-efting",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Alex Efting",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-alex-stanley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Alex Stanley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-ben-grubbs",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Ben Grubbs",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-shelby-small",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Shelby Small",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-dennis-heuser",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Dennis Heuser",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-erik-anderson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Erik Anderson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-derek-lewis",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Derek Lewis",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-hunter-gainey",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Hunter Gainey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-john-miranda",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "John Miranda",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-jason-collet",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Jason Collet",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-thomas-vaughn",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Thomas Vaughn",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-christopher-king-jr",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Christopher King Jr",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-david-harding",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "David Harding",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-nick-king",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Nick King",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-caleb-britton",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Caleb Britton",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-brooks-mcgill",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Brooks McGill",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-dart-arnold",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Dart Arnold",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-mike-matthews",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Mike Matthews",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-jon-karwacki",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Jon Karwacki",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-misti-lee",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Misti Lee",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-angel-mabee",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Angel Mabee",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-lani-evans",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "Lani Evans",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-beast-mode-cecelia-costin",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Beast Mode",
        "playerName": "CeCelia Costin",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-will-deering",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Will Deering",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-chad-sullivan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Chad Sullivan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-bryan-dirks",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Bryan Dirks",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-chad-heacock",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Chad Heacock",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 2,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-david-redlon",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "David Redlon",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-anthony-markowski",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Anthony Markowski",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-justin-istre",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Justin Istre",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-keegan-wroten",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Keegan Wroten",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-johnny-cavasos",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Johnny Cavasos",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-zach-settle",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Zach Settle",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-derrick-young",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Derrick young",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-adam-waldhelm",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Adam Waldhelm",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-jeffrey-grier",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Jeffrey Grier",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-devin-kirkendall",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Devin Kirkendall",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 4,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-timothy-range",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Timothy Range",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-blake-pinney",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Blake Pinney",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-keith-justice",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Keith Justice",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-abel-jimenez",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Abel Jimenez",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-derek-hopper",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Derek Hopper",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-dillon-blunier",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Dillon Blunier",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 4,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 2,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-javon-goddard",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Javon Goddard",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-brandon-dagrosa",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Brandon Dagrosa",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-zach-philips",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Zach Philips",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-chase-thomley",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Chase Thomley",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-paul-sullivan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Paul Sullivan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 0,
          "ties": 1,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-jasmine-pollack",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Jasmine Pollack",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-currie-istre",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Currie Istre",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-lizzie-goddard",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Lizzie Goddard",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-riptide-jake-harrison",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Riptide",
        "playerName": "Jake Harrison",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-patrick-kimbrell",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Patrick Kimbrell",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-william-hill",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "William Hill",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-andrew-wilson",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Andrew Wilson",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-russell-chastain",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Russell Chastain",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-david-clays",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "David Clays",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-randal-vaughan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Randal Vaughan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 2,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-mark-abbey",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Mark Abbey",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-jason-russo",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Jason Russo",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 4,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-tim-mason",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Tim Mason",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-matthew-james",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Matthew James",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 0
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-ernie-raymond",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Ernie Raymond",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-zeb-gurganus",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Zeb Gurganus",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-bruce-baginski",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Bruce Baginski",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 5,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 2,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-charley-sears",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Charley Sears",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 0,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-chad-crom",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Chad Crom",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-mitchell-morgan",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Mitchell Morgan",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-chris-comeau",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Chris comeau",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-jeremy-lewis",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Jeremy Lewis",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        },
        "doubles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-j-baus",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "J Baus",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-eric-pierre",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Eric Pierre",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 0,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-justin-kuester",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Justin Kuester",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 2,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-david-marunowski",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "David Marunowski",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 1,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-ramon-herrick",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Ramon Herrick",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 2,
          "ties": 1,
          "matchesPlayed": 5
        },
        "doubles": {
          "wins": 3,
          "losses": 2,
          "ties": 0,
          "matchesPlayed": 5
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-clif-smith",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Clif Smith",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 2,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 1,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 2
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-nadya-gutierrez",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Nadya Gutierrez",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        },
        "doubles": {
          "wins": 3,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 3
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-nicole-pierre",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Nicole Pierre",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 3,
          "ties": 0,
          "matchesPlayed": 4
        },
        "doubles": {
          "wins": 3,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 4
        }
      },
      {
        "id": "coastal-clash-2025-2026-ninjas-jackie-brown-alcott",
        "seasonId": "coastal-clash-2025-2026",
        "teamName": "Ninjas",
        "playerName": "Jackie Brown-Alcott",
        "pdgaNumber": "",
        "pdgaRating": null,
        "singles": {
          "wins": 1,
          "losses": 0,
          "ties": 0,
          "matchesPlayed": 1
        },
        "doubles": {
          "wins": 0,
          "losses": 1,
          "ties": 0,
          "matchesPlayed": 1
        }
      }
    ]
  }
] as const satisfies readonly HistoricalSeasonImportSource[];
