from __future__ import annotations

import argparse
import base64
import hashlib
import json
import pathlib
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from typing import Any, Iterable

import pandas as pd


VALID_OUTCOMES = {"W", "L", "T"}
PENALTY_MARKERS = {"PENALTY", "NO PLAYER PENALTY", "NO PLAYER PENALTYT", "TRIPLES"}
MONTH_ORDER = {"October": 1, "November": 2, "December": 3, "January": 4, "February": 5, "March": 6}


@dataclass(frozen=True)
class WorkbookSpec:
    path: pathlib.Path
    season_id: str
    season_label: str
    sheet_name: str


def clean(value: Any) -> str:
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def normalize(value: str) -> str:
    return clean(value).casefold()


def slug(value: str) -> str:
    normalized = normalize(value).replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def read_alias_map(path: pathlib.Path) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {normalize(alias): player_id for alias, player_id in data.items()}


class IdentityResolver:
    def __init__(self, canonical_players: dict[str, str], aliases: dict[str, str]):
        self.canonical_players = canonical_players
        self.aliases = aliases
        self.by_name: dict[str, set[str]] = defaultdict(set)
        for player_id, name in canonical_players.items():
            self.by_name[normalize(name)].add(player_id)

    def resolve(self, raw_name: str) -> dict[str, Any]:
        key = normalize(raw_name)
        if not key:
            return {"status": "unresolved", "rawName": raw_name}
        if key in self.aliases:
            player_id = self.aliases[key]
            if player_id in self.canonical_players:
                return self._resolved(raw_name, player_id, "reviewed-alias")
        exact = self.by_name.get(key, set())
        if len(exact) == 1:
            return self._resolved(raw_name, next(iter(exact)), "exact-name")
        if len(exact) > 1:
            return {"status": "ambiguous", "rawName": raw_name, "candidateIds": sorted(exact)}
        return {"status": "unresolved", "rawName": raw_name}

    def _resolved(self, raw_name: str, player_id: str, method: str) -> dict[str, Any]:
        return {
            "status": "resolved",
            "rawName": raw_name,
            "playerId": player_id,
            "canonicalName": self.canonical_players[player_id],
            "method": method,
        }


def build_catalog_and_rosters(
    specs: Iterable[WorkbookSpec], aliases: dict[str, str]
) -> tuple[dict[str, str], dict[str, dict[str, set[str]]], list[dict[str, Any]]]:
    canonical_players: dict[str, str] = {}
    raw_rosters: list[tuple[str, str, str]] = []
    collisions: list[dict[str, Any]] = []
    for spec in specs:
        roster = pd.read_excel(spec.path, sheet_name="Player Record", header=None, dtype=object)
        for row_index, row in roster.iloc[3:].iterrows():
            team_name, player_name = clean(row.iloc[1]), clean(row.iloc[2])
            if not team_name or not player_name:
                continue
            player_id = aliases.get(normalize(player_name), slug(player_name))
            existing = canonical_players.get(player_id)
            if existing and normalize(existing) != normalize(player_name) and normalize(player_name) not in aliases:
                collisions.append({
                    "playerId": player_id,
                    "names": sorted({existing, player_name}),
                    "sourceWorkbook": spec.path.name,
                    "sheet": "Player Record",
                    "row": row_index + 1,
                })
                continue
            canonical_players[player_id] = canonical_players.get(player_id, player_name)
            raw_rosters.append((spec.season_id, player_name, team_name))

    resolver = IdentityResolver(canonical_players, aliases)
    rosters: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    for season_id, player_name, team_name in raw_rosters:
        identity = resolver.resolve(player_name)
        if identity["status"] == "resolved":
            rosters[season_id][identity["playerId"]].add(team_name)
    return canonical_players, rosters, collisions


def discover_blocks(sheet: pd.DataFrame) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    first_row = sheet.iloc[0]
    for column, value in enumerate(first_row):
        month = clean(value)
        if not month:
            continue
        headers = [clean(value) for value in sheet.iloc[3, column : column + 8].tolist()]
        has_partner = len(headers) >= 8 and normalize(headers[4]) == "partner"
        width = 8 if has_partner else 7
        event = month.title()
        subtitle = clean(sheet.iloc[1, column]) if len(sheet) > 1 else ""
        if subtitle:
            event = f"{event} {subtitle.title()}"
        blocks.append({"event": event, "month": month.title(), "column": column, "width": width, "hasPartner": has_partner})
    return blocks


def participant_team(
    identity: dict[str, Any], season_roster: dict[str, set[str]]
) -> tuple[str | None, str | None]:
    if identity.get("status") != "resolved":
        return None, "identity-unresolved"
    teams = season_roster.get(identity["playerId"], set())
    if len(teams) == 1:
        return next(iter(teams)), None
    if len(teams) > 1:
        return None, "multiple-season-teams"
    return None, "team-not-found"


def stable_key(record: dict[str, Any]) -> str:
    opponent_keys = sorted(
        player_id or normalize(raw_name)
        for player_id, raw_name in zip(record.get("opponentIds", []), record["opponentsRaw"])
    )
    fields = [
        record["seasonId"], record["event"], record["format"],
        record.get("playerId") or normalize(record["playerRaw"]),
        record.get("playerTeamId") or normalize(record.get("playerTeam") or ""),
        record.get("partnerId") or normalize(record.get("partnerRaw") or ""),
        *opponent_keys,
        record["outcome"], clean(record.get("rawResult")), clean(record.get("rawScore")),
    ]
    digest = hashlib.sha256("|".join(fields).encode("utf-8")).hexdigest()[:24]
    return f"historical-match:{digest}"


def critical_record_exclusion_reasons(record: dict[str, Any]) -> set[str]:
    reasons: set[str] = set()
    if not record.get("playerId"):
        reasons.add("unresolved-player")
    if not record.get("playerTeamId"):
        reasons.add("missing-player-team")
    if not record.get("opponentTeamId"):
        reasons.add("missing-opponent-team")
    if any(not opponent_id for opponent_id in record.get("opponentIds", [])):
        reasons.add("unresolved-opponent")
    if record["format"] == "doubles" and not record.get("partnerId"):
        reasons.add("missing-or-unresolved-partner")
    return reasons


def parse_workbook(
    spec: WorkbookSpec,
    resolver: IdentityResolver,
    season_roster: dict[str, set[str]],
) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    sheet = pd.read_excel(spec.path, sheet_name=spec.sheet_name, header=None, dtype=object)
    records: list[dict[str, Any]] = []
    issues: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for block in discover_blocks(sheet):
        col = block["column"]
        for index in range(4, len(sheet)):
            values = [clean(value) for value in sheet.iloc[index, col : col + block["width"]].tolist()]
            if not any(values):
                continue
            singles_player, singles_result, singles_opponent = values[:3]
            if block["hasPartner"]:
                doubles_player, partner, doubles_result, opponent_one, opponent_two = values[3:8]
            else:
                doubles_player, doubles_result, opponent_one, opponent_two = values[3:7]
                partner = ""

            parse_entry(spec, block, index + 1, "singles", singles_player, "", singles_result,
                        [singles_opponent], resolver, season_roster, records, issues)
            parse_entry(spec, block, index + 1, "doubles", doubles_player, partner, doubles_result,
                        [opponent_one, opponent_two], resolver, season_roster, records, issues)

    if any(not block["hasPartner"] for block in discover_blocks(sheet)):
        infer_legacy_partners(records, issues)
    for record in records:
        record["deduplicationKey"] = stable_key(record)
    return records, issues


def parse_entry(
    spec: WorkbookSpec,
    block: dict[str, Any],
    row_number: int,
    match_format: str,
    player_raw: str,
    partner_raw: str,
    raw_result: str,
    opponents_raw: list[str],
    resolver: IdentityResolver,
    season_roster: dict[str, set[str]],
    records: list[dict[str, Any]],
    issues: dict[str, list[dict[str, Any]]],
) -> None:
    source = {"sourceWorkbook": spec.path.name, "sheet": spec.sheet_name, "row": row_number, "event": block["event"], "format": match_format}
    populated = [player_raw, partner_raw, raw_result, *opponents_raw]
    penalties = sorted({value for value in populated if normalize(value).upper() in PENALTY_MARKERS})
    if penalties:
        issues["penalties"].append({**source, "values": penalties, "raw": populated})
        return
    outcome = raw_result.upper()
    if not player_raw and not raw_result and not any(opponents_raw):
        return
    # Consolidated sheets use otherwise-empty rows for team labels and block separators.
    if not raw_result and not partner_raw and not any(opponents_raw):
        return
    if not player_raw or outcome not in VALID_OUTCOMES:
        issues["malformedRows"].append({**source, "reason": "missing-player-or-invalid-outcome", "raw": populated})
        return
    required_opponents = 1 if match_format == "singles" else 2
    if len([name for name in opponents_raw if name]) != required_opponents:
        issues["missingOpponents"].append({**source, "player": player_raw, "rawOpponents": opponents_raw})
        return

    player = resolver.resolve(player_raw)
    partner = resolver.resolve(partner_raw) if partner_raw else None
    opponents = [resolver.resolve(name) for name in opponents_raw]
    for role, identity in [("player", player), ("partner", partner), *[("opponent", item) for item in opponents]]:
        if not identity or identity["status"] == "resolved":
            continue
        issue_name = "ambiguousPlayers" if identity["status"] == "ambiguous" else "unresolvedPlayers"
        issues[issue_name].append({**source, "role": role, **identity})

    player_team, player_team_issue = participant_team(player, season_roster)
    opponent_teams = {participant_team(identity, season_roster)[0] for identity in opponents}
    opponent_teams.discard(None)
    opponent_team = next(iter(opponent_teams)) if len(opponent_teams) == 1 else None
    if player_team_issue:
        issues["malformedRows"].append({**source, "reason": player_team_issue, "player": player_raw})
    if len(opponent_teams) != 1:
        issues["missingOpponents"].append({**source, "reason": "opponent-team-not-unique", "player": player_raw, "rawOpponents": opponents_raw})

    records.append({
        "seasonId": spec.season_id,
        "season": spec.season_label,
        "event": block["event"],
        "month": block["month"],
        "eventOrder": MONTH_ORDER.get(block["month"], 99),
        "format": match_format,
        "playerId": player.get("playerId"),
        "player": player.get("canonicalName", player_raw),
        "playerRaw": player_raw,
        "partnerId": partner.get("playerId") if partner else None,
        "partner": partner.get("canonicalName") if partner else None,
        "partnerRaw": partner_raw or None,
        "opponentIds": [identity.get("playerId") for identity in opponents],
        "opponents": [identity.get("canonicalName", identity["rawName"]) for identity in opponents],
        "opponentsRaw": opponents_raw,
        "outcome": outcome,
        "rawResult": raw_result,
        "rawScore": None,
        "playerTeamId": slug(player_team) if player_team else None,
        "playerTeam": player_team,
        "opponentTeamId": slug(opponent_team) if opponent_team else None,
        "opponentTeam": opponent_team,
        "sourceWorkbook": spec.path.name,
        "sourceSheet": spec.sheet_name,
        "sourceRow": row_number,
    })


def infer_legacy_partners(records: list[dict[str, Any]], issues: dict[str, list[dict[str, Any]]]) -> None:
    groups: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record["format"] != "doubles" or record["partnerRaw"]:
            continue
        key = (record["seasonId"], record["event"], record["playerTeamId"], record["outcome"], tuple(sorted(record["opponentsRaw"])))
        groups[key].append(record)
    for group in groups.values():
        if len(group) == 2 and group[0]["playerId"] != group[1]["playerId"]:
            first, second = group
            first.update(partnerId=second["playerId"], partner=second["player"], partnerRaw=second["playerRaw"])
            second.update(partnerId=first["playerId"], partner=first["player"], partnerRaw=first["playerRaw"])
        else:
            for record in group:
                issues["missingOpponents"].append({
                    "sourceWorkbook": record["sourceWorkbook"], "sheet": record["sourceSheet"],
                    "row": record["sourceRow"], "event": record["event"], "format": "doubles",
                    "reason": "legacy-partner-not-uniquely-inferred", "player": record["playerRaw"],
                    "candidateCount": len(group),
                })


def build_report(specs: list[WorkbookSpec], aliases: dict[str, str]) -> dict[str, Any]:
    catalog, rosters, catalog_collisions = build_catalog_and_rosters(specs, aliases)
    resolver = IdentityResolver(catalog, aliases)
    all_records: list[dict[str, Any]] = []
    all_issues: dict[str, list[dict[str, Any]]] = defaultdict(list)
    all_issues["ambiguousPlayers"].extend(catalog_collisions)
    for spec in specs:
        records, issues = parse_workbook(spec, resolver, rosters[spec.season_id])
        all_records.extend(records)
        for name, entries in issues.items():
            all_issues[name].extend(entries)

    by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in all_records:
        by_key[record["deduplicationKey"]].append(record)
    duplicate_groups = [
        {"deduplicationKey": key, "sources": [{"workbook": row["sourceWorkbook"], "sheet": row["sourceSheet"], "row": row["sourceRow"]} for row in rows]}
        for key, rows in by_key.items() if len(rows) > 1
    ]
    all_issues["duplicateRows"].extend(duplicate_groups)
    duplicate_keys = {entry["deduplicationKey"] for entry in duplicate_groups}

    def source_key(entry: dict[str, Any]) -> tuple[Any, ...]:
        return (
            entry.get("sourceWorkbook"), entry.get("sourceSheet", entry.get("sheet")),
            entry.get("sourceRow", entry.get("row")), entry.get("event"), entry.get("format"),
        )

    exclusion_reasons: dict[tuple[Any, ...], set[str]] = defaultdict(set)
    issue_reason_names = {
        "unresolvedPlayers": "unresolved-identity",
        "ambiguousPlayers": "ambiguous-identity",
        "malformedRows": "malformed-row",
        "missingOpponents": "missing-critical-opponent-partner-or-team",
        "penalties": "penalty-row",
    }
    for issue_name, reason in issue_reason_names.items():
        for entry in all_issues[issue_name]:
            exclusion_reasons[source_key(entry)].add(reason)

    clean_records: list[dict[str, Any]] = []
    for record in all_records:
        key = source_key(record)
        exclusion_reasons[key].update(critical_record_exclusion_reasons(record))
        if record["deduplicationKey"] in duplicate_keys:
            exclusion_reasons[key].add("duplicate-row")
        if not exclusion_reasons[key]:
            clean_records.append(record)

    excluded_rows = [
        {
            "sourceWorkbook": key[0], "sourceSheet": key[1], "sourceRow": key[2],
            "event": key[3], "format": key[4], "reasons": sorted(reasons),
        }
        for key, reasons in sorted(exclusion_reasons.items(), key=lambda item: tuple(str(value) for value in item[0]))
        if reasons
    ]
    exclusion_reason_totals = Counter(reason for row in excluded_rows for reason in row["reasons"])
    resolved_ids: set[str] = set()
    for record in all_records:
        resolved_ids.update(filter(None, [record.get("playerId"), record.get("partnerId"), *record.get("opponentIds", [])]))
    unresolved_names = {normalize(entry["rawName"]) for entry in all_issues["unresolvedPlayers"] if entry.get("rawName")}
    invalid_rows = {
        (entry.get("sourceWorkbook"), entry.get("sheet"), entry.get("row"), entry.get("event"), entry.get("format"))
        for issue_name in ("malformedRows", "missingOpponents")
        for entry in all_issues[issue_name]
    }
    totals_by_period = Counter((record["seasonId"], record["event"], record["format"]) for record in all_records)
    return {
        "mode": "dry-run",
        "writesPerformed": False,
        "sources": [asdict(spec) | {"path": str(spec.path)} for spec in specs],
        "summary": {
            "singlesRows": sum(record["format"] == "singles" for record in all_records),
            "doublesPlayerHistoryRows": sum(record["format"] == "doubles" for record in all_records),
            "normalizedRows": len(all_records),
            "cleanImportableRows": len(clean_records),
            "excludedRows": len(excluded_rows),
            "resolvedPlayerCount": len(resolved_ids),
            "unresolvedPlayerCount": len(unresolved_names),
            "duplicateCount": len(duplicate_groups),
            "invalidRowCount": len(invalid_rows),
            "penaltyCount": len(all_issues["penalties"]),
        },
        "totalsBySeasonAndMonth": [
            {"seasonId": season, "event": event, "format": match_format, "rows": count}
            for (season, event, match_format), count in sorted(totals_by_period.items())
        ],
        "review": {name: entries for name, entries in sorted(all_issues.items())},
        "exclusionReasonTotals": dict(sorted(exclusion_reason_totals.items())),
        "excludedRows": excluded_rows,
        "sampleNormalizedRecords": all_records[:12],
        "cleanRecords": clean_records,
        "records": all_records,
    }


def to_database_row(record: dict[str, Any]) -> dict[str, Any]:
    opponent_ids = record["opponentIds"]
    opponent_names = record["opponents"]
    return {
        "deduplication_key": record["deduplicationKey"],
        "season_id": record["seasonId"],
        "season_name": record["season"],
        "event_label": record["event"],
        "event_month": record["month"],
        "event_order": record["eventOrder"],
        "match_format": record["format"].title(),
        "player_id": record["playerId"],
        "player_name": record["player"],
        "player_team_id": record["playerTeamId"],
        "player_team_name": record["playerTeam"],
        "partner_player_id": record["partnerId"],
        "partner_player_name": record["partner"],
        "opponent_one_player_id": opponent_ids[0],
        "opponent_one_player_name": opponent_names[0],
        "opponent_two_player_id": opponent_ids[1] if len(opponent_ids) > 1 else None,
        "opponent_two_player_name": opponent_names[1] if len(opponent_names) > 1 else None,
        "opponent_team_id": record["opponentTeamId"],
        "opponent_team_name": record["opponentTeam"],
        "outcome": record["outcome"],
        "raw_result": record["rawResult"],
        "raw_score": record["rawScore"],
        "source_workbook": record["sourceWorkbook"],
        "source_sheet": record["sourceSheet"],
        "source_row": record["sourceRow"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Dry-run importer for consolidated historical matchup workbooks.")
    parser.add_argument("--workbook-24-25", type=pathlib.Path, required=True)
    parser.add_argument("--workbook-25-26", type=pathlib.Path, required=True)
    parser.add_argument("--aliases", type=pathlib.Path, default=pathlib.Path(__file__).with_name("historical_player_aliases.json"))
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--clean-output", type=pathlib.Path)
    parser.add_argument("--base64-clean-output", type=pathlib.Path)
    parser.add_argument("--base64-batch-dir", type=pathlib.Path)
    parser.add_argument("--base64-batch-size", type=int, default=200)
    args = parser.parse_args()
    specs = [
        WorkbookSpec(args.workbook_24_25, "coastal-clash-2024-2025", "2024-2025", "24-25 All Matchups"),
        WorkbookSpec(args.workbook_25_26, "coastal-clash-2025-2026", "2025-2026", "Combined Matchup Results"),
    ]
    report = build_report(specs, read_alias_map(args.aliases))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    if args.clean_output:
        args.clean_output.parent.mkdir(parents=True, exist_ok=True)
        args.clean_output.write_text(
            json.dumps([to_database_row(record) for record in report["cleanRecords"]], indent=2),
            encoding="utf-8",
        )
    if args.base64_clean_output:
        database_rows = [to_database_row(record) | {"imported_at": "2026-07-31T16:00:00+00:00"} for record in report["cleanRecords"]]
        encoded = base64.b64encode(json.dumps(database_rows, separators=(",", ":")).encode("utf-8"))
        args.base64_clean_output.parent.mkdir(parents=True, exist_ok=True)
        args.base64_clean_output.write_bytes(encoded)
    if args.base64_batch_dir:
        database_rows = [to_database_row(record) | {"imported_at": "2026-07-31T16:00:00+00:00"} for record in report["cleanRecords"]]
        args.base64_batch_dir.mkdir(parents=True, exist_ok=True)
        for index in range(0, len(database_rows), args.base64_batch_size):
            encoded = base64.b64encode(
                json.dumps(database_rows[index:index + args.base64_batch_size], separators=(",", ":")).encode("utf-8")
            )
            (args.base64_batch_dir / f"batch-{index // args.base64_batch_size:02d}.b64").write_bytes(encoded)
    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()
