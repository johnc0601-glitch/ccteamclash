'use server';

import {createClient} from '@/lib/supabase/server';

type QuickReviewInput = {
  applicationId: string;
  status: 'Approved' | 'Rejected';
  gender?: 'Male' | 'Female' | '';
  playerType?: 'Adult' | 'Junior';
};

type BulkApprovalInput = {
  applicationId: string;
  gender: 'Male' | 'Female';
  playerType: 'Adult' | 'Junior';
};

type QuickReviewResult = {ok: true} | {ok: false; error: string};

type BulkApprovalResult = {
  ok: boolean;
  approvedIds: string[];
  errors: Array<{applicationId: string; error: string}>;
};

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
  const validationError = validateReviewInput(input);
  if (validationError) return {ok: false, error: validationError};

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) return {ok: false, error: 'Sign in again to continue.'};

  const {error: reviewError} = await reviewApplication(
    supabase as unknown as CaptainReviewClient,
    input,
  );

  if (reviewError) return {ok: false, error: reviewError.message};
  return {ok: true};
}

export async function approveTeamApplicationsInline(inputs: BulkApprovalInput[]): Promise<BulkApprovalResult> {
  if (!inputs.length) return {ok: false, approvedIds: [], errors: []};

  const seen = new Set<string>();
  for (const input of inputs) {
    if (!input.applicationId || seen.has(input.applicationId)) {
      return {
        ok: false,
        approvedIds: [],
        errors: [{applicationId: input.applicationId, error: 'Invalid approval queue.'}],
      };
    }
    seen.add(input.applicationId);

    const validationError = validateReviewInput({...input, status: 'Approved'});
    if (validationError) {
      return {
        ok: false,
        approvedIds: [],
        errors: [{applicationId: input.applicationId, error: validationError}],
      };
    }
  }

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      ok: false,
      approvedIds: [],
      errors: inputs.map((input) => ({applicationId: input.applicationId, error: 'Sign in again to continue.'})),
    };
  }

  const client = supabase as unknown as CaptainReviewClient;
  const results = await Promise.all(inputs.map(async (input) => {
    const {error: reviewError} = await reviewApplication(client, {...input, status: 'Approved'});
    return reviewError
      ? {applicationId: input.applicationId, error: reviewError.message}
      : {applicationId: input.applicationId, error: null};
  }));

  const approvedIds = results.filter((result) => !result.error).map((result) => result.applicationId);
  const errors = results
    .filter((result): result is {applicationId: string; error: string} => Boolean(result.error))
    .map((result) => ({applicationId: result.applicationId, error: result.error}));

  return {ok: errors.length === 0, approvedIds, errors};
}

function validateReviewInput(input: QuickReviewInput): string | null {
  if (!input.applicationId) return 'Registration is required.';

  if (input.status === 'Approved') {
    if (input.gender !== 'Male' && input.gender !== 'Female') {
      return 'Choose Male or Female before approving.';
    }
    if (input.playerType !== 'Adult' && input.playerType !== 'Junior') {
      return 'Player type must be Adult or Junior.';
    }
  }

  return null;
}

async function reviewApplication(client: CaptainReviewClient, input: QuickReviewInput) {
  return client.rpc(
    'captain_review_launch_player_application',
    {
      target_application_id: input.applicationId,
      target_status: input.status,
      target_gender: input.status === 'Approved' ? input.gender ?? null : null,
      target_player_type: input.status === 'Approved' ? input.playerType ?? null : null,
    },
  );
}
