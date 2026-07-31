from __future__ import annotations

import pathlib
import sys
import unittest

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from historical_matchup_import import IdentityResolver, critical_record_exclusion_reasons, discover_blocks, infer_legacy_partners, stable_key, to_database_row


class HistoricalMatchupImportTests(unittest.TestCase):
    def test_discovers_both_supported_block_shapes(self) -> None:
        legacy = pd.DataFrame([["NOVEMBER"], [], ["Singles", None, None, "Doubles"], ["Player", "W/L/T", "Opp", "Player", "W/L/T", "Opp 1", "Opp 2"]])
        modern = pd.DataFrame([["OCTOBER"], [], ["Singles", None, None, "Doubles"], ["Player", "W/L/T", "Opp", "Player", "Partner", "W/L/T", "Opp 1", "Opp 2"]])
        self.assertFalse(discover_blocks(legacy)[0]["hasPartner"])
        self.assertTrue(discover_blocks(modern)[0]["hasPartner"])

    def test_identity_resolution_is_exact_or_reviewed_alias_only(self) -> None:
        resolver = IdentityResolver({"ariel-cosimo": "Ariel Cosimo", "arielle-cosimo": "Arielle Cosimo"}, {"ariel cosmo": "ariel-cosimo"})
        self.assertEqual(resolver.resolve("Ariel Cosmo")["method"], "reviewed-alias")
        self.assertEqual(resolver.resolve("Ariel Cosimo")["method"], "exact-name")
        self.assertEqual(resolver.resolve("Ariel Cossimo")["status"], "unresolved")

    def test_legacy_partner_requires_exactly_two_matching_rows(self) -> None:
        base = {"format": "doubles", "seasonId": "s", "event": "November", "playerTeamId": "team", "outcome": "W", "opponentsRaw": ["O1", "O2"], "partnerRaw": None, "sourceWorkbook": "x", "sourceSheet": "s", "sourceRow": 1}
        rows = [{**base, "playerId": "p1", "player": "P1", "playerRaw": "P1"}, {**base, "playerId": "p2", "player": "P2", "playerRaw": "P2"}]
        issues = {}
        from collections import defaultdict
        report = defaultdict(list, issues)
        infer_legacy_partners(rows, report)
        self.assertEqual(rows[0]["partnerId"], "p2")
        self.assertEqual(rows[1]["partnerId"], "p1")

    def test_deduplication_key_ignores_source_row(self) -> None:
        record = {"seasonId": "s", "event": "November", "format": "singles", "playerId": "p", "playerRaw": "P", "playerTeamId": "t", "partnerId": None, "partnerRaw": None, "opponentIds": ["o"], "opponentsRaw": ["O"], "outcome": "W", "rawResult": "W", "rawScore": None}
        self.assertEqual(stable_key(record | {"sourceRow": 1}), stable_key(record | {"sourceRow": 999}))

    def test_raw_score_is_opaque_text(self) -> None:
        record = {"seasonId": "s", "event": "November", "format": "singles", "playerId": "p", "playerRaw": "P", "playerTeamId": "t", "partnerId": None, "partnerRaw": None, "opponentIds": ["o"], "opponentsRaw": ["O"], "outcome": "W", "rawResult": "W", "rawScore": "won 2 & 1"}
        self.assertTrue(stable_key(record).startswith("historical-match:"))

    def test_clean_database_row_keeps_explicit_participant_references(self) -> None:
        record = {"deduplicationKey": "k", "seasonId": "s", "season": "Season", "event": "November", "month": "November", "eventOrder": 2, "format": "doubles", "playerId": "p", "player": "Player", "playerTeamId": "t", "playerTeam": "Team", "partnerId": "partner", "partner": "Partner", "opponentIds": ["o1", "o2"], "opponents": ["Opponent One", "Opponent Two"], "opponentTeamId": "ot", "opponentTeam": "Opponent Team", "outcome": "W", "rawResult": "W", "rawScore": "opaque", "sourceWorkbook": "book", "sourceSheet": "sheet", "sourceRow": 6}
        row = to_database_row(record)
        self.assertEqual(row["partner_player_id"], "partner")
        self.assertEqual(row["opponent_two_player_id"], "o2")

    def test_unresolved_and_invalid_rows_are_excluded(self) -> None:
        unresolved = {"format": "singles", "playerId": None, "playerTeamId": None, "opponentTeamId": "team", "opponentIds": ["opponent"]}
        invalid_doubles = {"format": "doubles", "playerId": "player", "playerTeamId": "team", "opponentTeamId": None, "opponentIds": ["opponent", None], "partnerId": None}
        self.assertEqual(critical_record_exclusion_reasons(unresolved), {"unresolved-player", "missing-player-team"})
        self.assertEqual(critical_record_exclusion_reasons(invalid_doubles), {"missing-opponent-team", "unresolved-opponent", "missing-or-unresolved-partner"})


if __name__ == "__main__":
    unittest.main()
