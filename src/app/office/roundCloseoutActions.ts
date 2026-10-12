'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {canCloseRound, CLOSEOUT_CHECKS, getRoundCloseouts} from '@/services/commissioner/RoundCloseoutService';

function go(roundId: string, message: string, error = false): never {
  const query = new URLSearchParams({round: roundId, [error ? 'error' : 'notice']: message});
  redirect(`/office?${query.toString()}`);
}

export async function setRoundCloseoutCheck(form: FormData): Promise<void> {
  const roundId = String(form.get('roundId') || '');
  const key = String(form.get('key') || '');
  const value = String(form.get('checked') || '');
  const approved = CLOSEOUT_CHECKS.some((task) => task.key === key);
  const {supabase, profile} = await requireStoryCommissioner();

  if (!approved || (value !== 'true' && value !== 'false')) {
    go(roundId, 'Invalid checklist item.', true);
  }

  const rounds = await getRoundCloseouts();
  const round = rounds.find((item) => item.id === roundId);
  if (!round || !round.started) {
    go(roundId, 'This round is not available for review.', true);
  }
  if (key === 'closed' && value === 'true' && !canCloseRound(round)) {
    go(roundId, 'Complete all reviews and publish every match and CI result before closing the round.', true);
  }

  const checked = value === 'true';
  const now = new Date().toISOString();
  const {error} = await (supabase as any)
    .from('launch_round_closeout_checks')
    .upsert({
      round_id: round.id,
      check_key: key,
      checked,
      checked_at: checked ? now : null,
      checked_by_profile_id: checked ? profile.id : null,
      updated_at: now,
    }, {onConflict: 'round_id,check_key'});

  if (error) {
    console.error('[office] Could not save round checklist state.', error);
    go(round.id, 'Checklist change could not be saved.', true);
  }

  revalidatePath('/office');
  go(round.id, 'Checklist updated.');
}
