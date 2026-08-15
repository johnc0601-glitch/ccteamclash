import type {
  PlayerApplicationGender,
  PlayerApplicationType,
} from '@/domain/player-application/PlayerApplication';

export type PlayerApplicationFormInput = {
  displayName: string;
  seasonId: string;
  requestedTeamId: string;
  playerType: PlayerApplicationType;
  gender: PlayerApplicationGender;
  playedBefore: boolean;
  requestedPlayerId: string;
  submittedPdgaNumber: string;
};

export type PlayerApplicationFormResult =
  | {ok: true; data: PlayerApplicationFormInput}
  | {ok: false; message: string};

export function parsePlayerApplicationForm(formData: FormData): PlayerApplicationFormResult {
  const displayName = readFormValue(formData, 'displayName');
  const seasonId = readFormValue(formData, 'seasonId');
  const requestedTeamId = readFormValue(formData, 'requestedTeamId');
  const playerType = readFormValue(formData, 'playerType');
  const gender = readFormValue(formData, 'gender');
  const playedBeforeValue = readFormValue(formData, 'playedBefore');
  const requestedPlayerId = readFormValue(formData, 'requestedPlayerId');

  if (!displayName) return {ok: false, message: 'Enter your name.'};
  if (!seasonId) return {ok: false, message: 'Player applications are not open for a current season.'};
  if (!requestedTeamId) return {ok: false, message: 'Choose a requested team.'};
  if (playerType !== 'Adult' && playerType !== 'Junior') {
    return {ok: false, message: 'Choose Adult or Junior.'};
  }
  if (gender !== 'Male' && gender !== 'Female') {
    return {ok: false, message: 'Choose Male or Female.'};
  }
  if (playedBeforeValue !== 'Yes' && playedBeforeValue !== 'No') {
    return {ok: false, message: 'Choose whether you played Team Clash before.'};
  }
  if (playedBeforeValue === 'Yes' && !requestedPlayerId) {
    return {ok: false, message: 'Choose your previous Team Clash player record.'};
  }

  return {
    ok: true,
    data: {
      displayName,
      seasonId,
      requestedTeamId,
      playerType,
      gender,
      playedBefore: playedBeforeValue === 'Yes',
      requestedPlayerId,
      submittedPdgaNumber: readFormValue(formData, 'submittedPdgaNumber'),
    },
  };
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
