import {Footer, SiteHeader} from '@/components/SiteHeader';
import {FinalMatchday} from '@/components/matches/FinalMatchday';
import type {FinalMatchdaySnapshot} from '@/services/matches/FinalMatchdaySnapshot';

export const dynamic = 'force-static';

const preview: FinalMatchdaySnapshot = {
  matchId: 'final-matchday-preview',
  roundNumber: 1,
  date: '2026-10-03',
  time: '09:00:00',
  course: {
    id: 'burnt-mill-creek-5db80d32-6253-4c9c-894b-16106eadc244',
    name: 'Burnt Mill Creek',
    mapUrl: 'https://maps.app.goo.gl/qkDnzHRtzKdAh3Jd6',
  },
  awayTeam: {
    id: 'kb',
    name: 'KB',
    shortName: 'KB',
    logo: '/team-logos/kb.png',
    primaryColor: '#00ffff',
    secondaryColor: null,
  },
  homeTeam: {
    id: 'dark-knights',
    name: 'Dark Knights',
    shortName: 'DK',
    logo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/dark-knights/logo.jpg',
    primaryColor: '#c20000',
    secondaryColor: null,
  },
  awayScore: 13,
  homeScore: 22,
  contests: [
    {
      id: 'preview-s1',
      format: 'Singles',
      position: 1,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [{id: 'derek-hynds', name: 'Derek Hynds'}],
      homePlayers: [{id: 'john-carroll', name: 'John Carroll'}],
    },
    {
      id: 'preview-s2',
      format: 'Singles',
      position: 2,
      awayOutcome: 'W',
      homeOutcome: 'L',
      awayPlayers: [{id: 'john-blackburn', name: 'John Blackburn'}],
      homePlayers: [{id: 'phil-hood', name: 'Phil Hood'}],
    },
    {
      id: 'preview-s3',
      format: 'Singles',
      position: 3,
      awayOutcome: 'T',
      homeOutcome: 'T',
      awayPlayers: [{id: 'ashlee-hynds', name: 'Ashlee Hynds'}],
      homePlayers: [{id: 'rosa-carroll', name: 'Rosa Carroll'}],
    },
    {
      id: 'preview-s4',
      format: 'Singles',
      position: 4,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [{id: 'zach-redding', name: 'Zach Redding'}],
      homePlayers: [{id: 'justin-kent', name: 'Justin Kent'}],
    },
    {
      id: 'preview-d1',
      format: 'Doubles',
      position: 1,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [
        {id: 'dan-moles', name: 'Dan Moles'},
        {id: 'jordan-darby', name: 'Jordan Darby'},
      ],
      homePlayers: [
        {id: 'alex-bradshaw', name: 'Alex Bradshaw'},
        {id: 'jake-stephenson', name: 'Jake Stephenson'},
      ],
    },
    {
      id: 'preview-d2',
      format: 'Doubles',
      position: 2,
      awayOutcome: 'W',
      homeOutcome: 'L',
      awayPlayers: [
        {id: 'john-grant', name: 'John Grant'},
        {id: 'mike-duncan', name: 'Mike Duncan'},
      ],
      homePlayers: [
        {id: 'jason-long', name: 'Jason Long'},
        {id: 'ian-roberts', name: 'Ian Roberts'},
      ],
    },
    {
      id: 'preview-d3',
      format: 'Doubles',
      position: 3,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [
        {id: 'lawrence-shotwell', name: 'Lawrence Shotwell'},
        {id: 'scott-strickland', name: 'Scott Strickland'},
      ],
      homePlayers: [
        {id: 'mitchell-puttbach', name: 'Mitchell Puttbach'},
        {id: 'stone-tippett', name: 'Stone Tippett'},
      ],
    },
    {
      id: 'preview-d4',
      format: 'Doubles',
      position: 4,
      awayOutcome: 'W',
      homeOutcome: 'L',
      awayPlayers: [
        {id: 'dalton-medlin', name: 'Dalton Medlin'},
        {id: 'tyler-carlin', name: 'Tyler Carlin'},
      ],
      homePlayers: [
        {id: 'alex-karp', name: 'Alex Karp'},
        {id: 'owen-shields', name: 'Owen Shields'},
      ],
    },
    {
      id: 'preview-d5',
      format: 'Doubles',
      position: 5,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [
        {id: 'ashlee-hynds', name: 'Ashlee Hynds'},
        {id: 'player-account-0446b9e9-8c8c-4f53-a82d-f3e0574c58a5', name: 'Bae'},
      ],
      homePlayers: [
        {id: 'rosa-carroll', name: 'Rosa Carroll'},
        {id: 'player-account-af8f4c55-f515-4614-acf3-abe7cda5b49c', name: 'Sydney Lamphear'},
      ],
    },
    {
      id: 'preview-d6',
      format: 'Doubles',
      position: 6,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [
        {id: 'matt-miles-english', name: 'Matt-Miles English'},
        {id: 'keith-connolly', name: 'Keith Connolly'},
      ],
      homePlayers: [
        {id: 'owen-shields', name: 'Owen Shields'},
        {id: 'justin-kent', name: 'Justin Kent'},
      ],
    },
    {
      id: 'preview-d7',
      format: 'Doubles',
      position: 7,
      awayOutcome: 'L',
      homeOutcome: 'W',
      awayPlayers: [
        {id: 'jimbo-lemire', name: 'JimBo Lemire'},
        {id: 'derek-hynds', name: 'Derek Hynds'},
      ],
      homePlayers: [
        {id: 'jordan-flor', name: 'Jordan Flor'},
        {id: 'jason-long', name: 'Jason Long'},
      ],
    },
    {
      id: 'preview-d8',
      format: 'Doubles',
      position: 8,
      awayOutcome: 'W',
      homeOutcome: 'L',
      awayPlayers: [
        {id: 'john-loyd', name: 'John Loyd'},
        {id: 'zach-redding', name: 'Zach Redding'},
      ],
      homePlayers: [
        {id: 'eric-england', name: 'Eric England'},
        {id: 'chuck-myers', name: 'Chuck Myers'},
      ],
    },
  ],
  weather: {
    temperature: 76,
    condition: 'sun',
    wind: 8,
    windDirection: 'NE',
  },
  publishedAt: '2026-10-03T17:00:00.000Z',
};

export default function FinalMatchdayPreviewPage() {
  return (
    <>
      <SiteHeader />
      <FinalMatchday snapshot={preview} />
      <Footer />
    </>
  );
}
