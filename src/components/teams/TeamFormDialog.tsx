import type {Course} from '@/domain/course/Course';
import type {Team} from '@/models/Team';
import type {TeamFieldErrors, TeamInput} from '@/types/team';
import {DialogShell} from '@/components/teams/DialogShell';
import {TeamForm} from '@/components/teams/TeamForm';
import {EMPTY_TEAM_INPUT, teamToFormValues} from '@/components/teams/teamFormValues';

type TeamFormDialogProps = {
  team?: Team;
  fieldErrors: TeamFieldErrors;
  submitting: boolean;
  courses: Course[];
  onSubmit: (values: TeamInput) => void;
  onClose: () => void;
};

export function TeamFormDialog({team, fieldErrors, submitting, courses, onSubmit, onClose}: TeamFormDialogProps) {
  const initialValues = team ? teamToFormValues(team) : EMPTY_TEAM_INPUT;

  return (
    <DialogShell
      title={team ? 'Edit team' : 'Create team'}
      eyebrow="Team management"
      onClose={onClose}
      size="large"
    >
      <TeamForm
        key={team?.id ?? 'create-team'}
        initialValues={initialValues}
        fieldErrors={fieldErrors}
        submitLabel={team ? 'Save changes' : 'Create team'}
        submitting={submitting}
        courses={courses}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </DialogShell>
  );
}
