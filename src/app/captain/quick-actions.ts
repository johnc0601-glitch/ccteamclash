'use server';

import {createClient} from '@/lib/supabase/server';

type QuickReviewInput = {
  applicationId: string;
  status: 'Approved' | 'Rejected';
  gender?: 'Male' | 'Female' | '';
  playerType?: 'Adult' | 'Junior';
};

type QuickReviewResult = {ok: true} | {ok: false; error: string};

type CaptainReviewClient = {
  rpc: (
    fn: 'captain_review_launch_player_application',
    args: {
      target_application_id: string;
      target_status: 'Approved' | 'Rejected';
      target_gender: string | null;
      target_player_type: string | null;
    },
  ) => Promise<{error: {message: string} | null}>;
};

export async function reviewTeamApplicationInline(input: QuickReviewInput): Promise<QuickReviewResult> {
  if (!input.applicationId) return {ok: false, error: 'Registration is required.'};

  if (input.status === 'Approved') {
    if (input.gender !== 'Male' && input.gender !== 'Female') {
      return {ok: false, error: 'Choose Male or Female before approving.'};
    }
    if (input.playerType !== 'Adult' && input.playerType !== 'Junior') {
      return {ok: false, error: 'Player type must be Adult or Junior.'};
    }
  }

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) return {ok: false, error: 'Sign in again to continue.'};

  const {error: reviewError} = await (supabase as unknown as CaptainReviewClient).rpc(
    'captain_review_launch_player_application',
    {
      target_application_id: input.applicationId,
      target_status: input.status,
      target_gender: input.status === 'Approved' ? input.gender ?? null : null,
      target_player_type: input.status === 'Approved' ? input.playerType ?? null : null,
    },
  );

  if (reviewError) return {ok: false, error: reviewError.message};
  return {ok: true};
}
