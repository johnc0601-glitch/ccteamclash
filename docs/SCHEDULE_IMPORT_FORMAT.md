# Schedule Import Format

Schedule imports are designed around information a commissioner naturally has. CSV
files, the first worksheet of `.xlsx` files, and JSON row arrays use one row per match.

## Commissioner columns

| Column | Required | Description |
| --- | --- | --- |
| `Event` | Yes | Event or round name. Rows with the same value are grouped together. |
| `Away Team` | Yes | Existing team name or ID. |
| `Home Team` | Yes | Existing team name or ID. |
| `Course` | No | Existing course name or ID. |
| `Date` | No | `YYYY-MM-DD`, or an Excel date cell. |
| `Time` | No | 24-hour `HH:MM`, or an Excel time cell. |
| `Notes` | No | Internal commissioner notes. |

Example:

```csv
Event,Away Team,Home Team,Course,Date,Time,Notes
Opening Event,Ninjas,Dark Knights,Castle Hayne Park,2026-07-18,09:00,
Opening Event,Bogey Men,Chain Hawks,Castle Hayne Park,2026-07-18,10:30,
```

JSON uses the same commissioner-facing fields:

```json
[
  {
    "Event": "Opening Event",
    "Away Team": "Ninjas",
    "Home Team": "Dark Knights",
    "Course": "Castle Hayne Park",
    "Date": "2026-07-18",
    "Time": "09:00",
    "Notes": ""
  }
]
```

## Internal conversion

Before validation, the importer:

- uses the deployment's active Season;
- assigns event numbers in first-seen order;
- resolves team and course names to IDs;
- creates the Season's canonical Schedule identity;
- applies the current internal schema version and draft status;
- leaves omitted Course, Date, and Time values unset for later commissioner editing.

The converted data then uses the existing canonical Schedule validation, preview, and
persistence pipeline. Draft imports may contain TBD scheduling details, but publishing
still requires complete, valid dates, courses, and times.
