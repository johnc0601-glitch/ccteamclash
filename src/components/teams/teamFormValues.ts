import type {Team} from '@/models/Team';
import type {TeamInput} from '@/types/team';

export const EMPTY_TEAM_INPUT: TeamInput = {
  name: '',
  shortName: '',
  city: '',
  state: '',
  captain: '',
  homeCourse: '',
  logo: '',
  primaryColor: '#121814',
  secondaryColor: '#ffc400',
  website: '',
  facebook: '',
  description: '',
};

export function teamToFormValues(team: Team): TeamInput {
  return {
    name: team.name,
    shortName: team.shortName,
    city: team.city,
    state: team.state,
    captain: team.captain,
    homeCourse: team.homeCourse,
    logo: team.logo,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    website: team.website,
    facebook: team.facebook,
    description: team.description,
  };
}
