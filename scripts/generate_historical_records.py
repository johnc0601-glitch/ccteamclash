from __future__ import annotations

import json
import pathlib
import re
import sys
from typing import Any

import pandas as pd


def slug(value: str) -> str:
    normalized = value.strip().lower().replace("&", "and")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "record"


def clean(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def number(value: Any) -> float:
    if pd.isna(value) or value == "":
        return 0
    return float(value)


def outcome(value: Any) -> str:
    text = clean(value).upper()
    return text if text in {"W", "L", "T"} else ""


def count_outcomes(values: list[Any]) -> dict[str, int]:
    record = {"wins": 0, "losses": 0, "ties": 0}
    for value in values:
        parsed = outcome(value)
        if parsed == "W":
            record["wins"] += 1
        elif parsed == "L":
            record["losses"] += 1
        elif parsed == "T":
            record["ties"] += 1
    record["matchesPlayed"] = record["wins"] + record["losses"] + record["ties"]
    return record


def infer_season(path: pathlib.Path) -> tuple[str, str]:
    if "24_'25" in path.name:
        return "coastal-clash-2024-2025", "Coastal Clash Match Play 2024-2025"
    return "coastal-clash-2025-2026", "Coastal Clash Match Play 2025-2026"


def extract_team_records(path: pathlib.Path, season_id: str) -> list[dict[str, Any]]:
    standings = pd.read_excel(path, sheet_name="Team Standings", header=None)
    records: list[dict[str, Any]] = []
    for _, row in standings.iloc[4:].iterrows():
        team_name = clean(row.iloc[2])
        if not team_name:
            continue
        team_outcomes: list[str] = []
        for col in range(7, len(row), 3):
            parsed = outcome(row.iloc[col] if col < len(row) else "")
            if parsed:
                team_outcomes.append(parsed)
        record = count_outcomes(team_outcomes)
        records.append(
            {
                "id": f"{season_id}-{slug(team_name)}",
                "seasonId": season_id,
                "teamName": team_name,
                "wins": int(number(row.iloc[3])),
                "losses": record["losses"],
                "ties": record["ties"],
                "matchesPlayed": record["matchesPlayed"],
                "pointsEarned": number(row.iloc[5]),
                "pointsAvailable": number(row.iloc[6]),
            }
        )
    return records


def extract_player_records(path: pathlib.Path, season_id: str) -> list[dict[str, Any]]:
    sheet = pd.read_excel(path, sheet_name="Player Record", header=None)
    format_headers = [clean(value).upper() for value in sheet.iloc[2].tolist()]
    records: list[dict[str, Any]] = []
    for _, row in sheet.iloc[3:].iterrows():
        team_name = clean(row.iloc[1])
        player_name = clean(row.iloc[2])
        if not team_name or not player_name:
            continue

        singles: list[Any] = []
        doubles: list[Any] = []
        for col in range(8, len(row)):
            marker = format_headers[col] if col < len(format_headers) else ""
            if marker == "S":
                singles.append(row.iloc[col])
            elif marker == "D":
                doubles.append(row.iloc[col])

        records.append(
            {
                "id": f"{season_id}-{slug(team_name)}-{slug(player_name)}",
                "seasonId": season_id,
                "teamName": team_name,
                "playerName": player_name,
                "pdgaNumber": "",
                "pdgaRating": None,
                "singles": count_outcomes(singles),
                "doubles": count_outcomes(doubles),
            }
        )
    return records


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(
            "Usage: generate_historical_records.py <output.ts> <workbook.xlsx> <workbook.xlsx>..."
        )

    output_path = pathlib.Path(sys.argv[1])
    sources = []
    for workbook_path_text in sys.argv[2:]:
        workbook_path = pathlib.Path(workbook_path_text)
        season_id, season_name = infer_season(workbook_path)
        sources.append(
            {
                "id": season_id,
                "name": season_name,
                "sourceFilename": workbook_path.name,
                "teamRecords": extract_team_records(workbook_path, season_id),
                "playerRecords": extract_player_records(workbook_path, season_id),
            }
        )

    content = "import type {HistoricalSeasonImportSource} from '@/domain/history/HistoricalRecord';\n\n"
    content += "export const HISTORICAL_RECORD_SOURCES = "
    content += json.dumps(sources, indent=2)
    content += " as const satisfies readonly HistoricalSeasonImportSource[];\n"
    output_path.write_text(content, encoding="utf-8")

    print(
        json.dumps(
            {
                "output": str(output_path),
                "seasons": len(sources),
                "teamRecords": sum(len(source["teamRecords"]) for source in sources),
                "playerRecords": sum(len(source["playerRecords"]) for source in sources),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
