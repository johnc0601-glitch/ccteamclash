import type {Season, SeasonFieldErrors, SeasonInput} from '@/domain/season/Season';
import {DialogShell} from '@/components/teams/DialogShell';
import {SeasonForm} from '@/components/seasons/SeasonForm';
import {EMPTY_SEASON_INPUT, seasonToFormValues} from '@/components/seasons/seasonFormValues';

type SeasonFormDialogProps = {
  season?: Season;
  fieldErrors: SeasonFieldErrors;
  submitting: boolean;
  onSubmit: (values: SeasonInput) => void;
  onClose: () => void;
};

export function SeasonFormDialog({
  season,
  fieldErrors,
  submitting,
  onSubmit,
  onClose,
}: SeasonFormDialogProps) {
  const initialValues = season ? seasonToFormValues(season) : EMPTY_SEASON_INPUT;

  return (
    <DialogShell
      title={season ? 'Edit season' : 'Create season'}
      eyebrow="Season management"
      onClose={onClose}
      size="large"
    >
      <SeasonForm
        key={season?.id ?? 'create-season'}
        initialValues={initialValues}
        fieldErrors={fieldErrors}
        submitLabel={season ? 'Save changes' : 'Create season'}
        submitting={submitting}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </DialogShell>
  );
}
