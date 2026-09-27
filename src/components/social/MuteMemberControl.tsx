import {muteMember} from '@/app/social/muteActions';

export function MuteMemberControl({
  profileId,
  returnTo,
  compact = false,
}: {
  profileId: string;
  returnTo: string;
  compact?: boolean;
}) {
  return (
    <form action={muteMember} style={{margin: 0}}>
      <input type="hidden" name="targetProfileId" value={profileId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        title="Hide this member's social posts and comments"
        style={compact ? {padding: '3px 7px', fontSize: '9px'} : undefined}
      >
        Mute
      </button>
    </form>
  );
}
