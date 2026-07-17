import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';

export type ScheduleActionProps = {
  canEdit: boolean;
  processing: boolean;
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onTogglePublication: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
};

export type RoundActionProps = {
  canEdit: boolean;
  onView: (round: Round) => void;
  onEdit: (round: Round) => void;
  onDelete: (round: Round) => void;
};

export type MatchActionProps = {
  canEditNotes: boolean;
  canEditPublicFields: boolean;
  onView: (match: Match) => void;
  onEdit: (match: Match) => void;
  onDelete: (match: Match) => void;
};
