import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RecoveredPdga = {id: string; pdgaNumber: string; rating?: number};

const RECOVERED_PDGA: RecoveredPdga[] = [
  {id: 'abel-jimenez', pdgaNumber: '284579'},
  {id: 'adam-waldhelm', pdgaNumber: '282186'},
  {id: 'player-alicia-atkinson-6772c669-fdb4-4eca-af01-e1040efafd59', pdgaNumber: '255136'},
  {id: 'amanda-valois', pdgaNumber: '204564'},
  {id: 'anthony-markowski', pdgaNumber: '288140'},
  {id: 'blake-pinney', pdgaNumber: '91859'},
  {id: 'brandon-burckhalter', pdgaNumber: '235865'},
  {id: 'bryan-dirks', pdgaNumber: '276659'},
  {id: 'bruce-baginski', pdgaNumber: '46621'},
  {id: 'bryce-behrendt', pdgaNumber: '170114'},
  {id: 'chad-sullivan', pdgaNumber: '101835'},
  {id: 'chris-lamarsh', pdgaNumber: '61733'},
  {id: 'conner-garrett', pdgaNumber: '52420'},
  {id: 'currie-istre', pdgaNumber: '242881'},
  {id: 'devin-kirkendall', pdgaNumber: '160292'},
  {id: 'player-account-baf86697-0092-49db-9b1d-aef697d0928a', pdgaNumber: '322475'},
  {id: 'jake-harrison', pdgaNumber: '268640'},
  {id: 'jason-russo', pdgaNumber: '24419'},
  {id: 'hunter-feil', pdgaNumber: '303849'},
  {id: 'player-damon-underwood-e5efec68-e250-478e-a36d-1b5c676a5a79', pdgaNumber: '317796'},
  {id: 'john-moncrief', pdgaNumber: '21433'},
  {id: 'jonathan-glass', pdgaNumber: '152460'},
  {id: 'jordan-flor', pdgaNumber: '303910'},
  {id: 'ramon-herrick', pdgaNumber: '140383'},
  {id: 'randal-vaughan', pdgaNumber: '203673'},
  {id: 'roy-strawderman', pdgaNumber: '272266'},
  {id: 'rudy-dixon', pdgaNumber: '26974'},
  {id: 'player-scott-hennis-57206cbd-2404-4126-b765-6ae0e05a319d', pdgaNumber: '320976'},
  {id: 'sean-mansell', pdgaNumber: '177818'},
  {id: 'mike-wooten', pdgaNumber: '91022'},
  {id: 'walt-stanfield', pdgaNumber: '138797'},
  {id: 'clif-smith', pdgaNumber: '102529'},
  {id: 'james-higgins', pdgaNumber: '126481'},
  {id: 'heath-summerlin', pdgaNumber: '113717'},
  {id: 'kurtis-brandenburg', pdgaNumber: '146519'},
  {id: 'chad-johnson', pdgaNumber: '51757'},
  {id: 'nick-king', pdgaNumber: '320413'},
  {id: 'mike-hines', pdgaNumber: '183479'},
  {id: 'charley-sears', pdgaNumber: '284680'},
  {id: 'stephen-ajov', pdgaNumber: '103684'},
  {id: 'john-grant', pdgaNumber: '21454'},
  {id: 'john-graham', pdgaNumber: '78011'},
  {id: 'hope-brown', pdgaNumber: '56121'},
  {id: 'lawrence-shotwell', pdgaNumber: '280352'},
  {id: 'tyler-carlin', pdgaNumber: '75455'},
  {id: 'nicki-irrea', pdgaNumber: '139288'},
  {id: 'eddie-mylod', pdgaNumber: '110650'},
  {id: 'bobby-taylor', pdgaNumber: '59246'},
  {id: 'brandon-long', pdgaNumber: '146631'},
  {id: 'luke-hahn', pdgaNumber: '302642'},
  {id: 'isaac-cotson', pdgaNumber: '277064'},
  {id: 'whit-stephenson', pdgaNumber: '241573'},
  {id: 'zeb-gurganus', pdgaNumber: '162492'},
  {id: 'trent-bailey', pdgaNumber: '309678'},
  {id: 'travis-shallow', pdgaNumber: '196222'},
  {id: 'jamie-hensley', pdgaNumber: '272400'},
  {id: 'player-account-e756f75d-7af8-4b8c-9691-8e5f6fac55aa', pdgaNumber: '272400'},
  {id: 'kevin-shelton', pdgaNumber: '139532'},
  {id: 'will-barwick', pdgaNumber: '302864'},
  {id: 'zach-settle', pdgaNumber: '281651'},
  {id: 'derek-hopper', pdgaNumber: '102496'},
  {id: 'justin-istre', pdgaNumber: '209346'},
  {id: 'player-andrew-hollers-9a0e262c-0704-4ad5-a673-1533e3afad69', pdgaNumber: '286009'},
  {id: 'andrew-wilson', pdgaNumber: '48676'},
  {id: 'angel-mabee', pdgaNumber: '298722'},
  {id: 'billy-fussell', pdgaNumber: '156323'},
  {id: 'darian-green', pdgaNumber: '116864'},
  {id: 'player-account-e06f02b9-b6c3-4990-8225-64cd1a11617e', pdgaNumber: '48464'},
  {id: 'david-marunowski', pdgaNumber: '180523'},
  {id: 'player-account-179c0e58-8f40-4bf1-b7de-d1d30223e0e4', pdgaNumber: '180523'},
  {id: 'eli-batazhan', pdgaNumber: '225786'},
  {id: 'joe-barker', pdgaNumber: '291601'},
  {id: 'josh-beasley', pdgaNumber: '240362'},
  {id: 'lani-evans', pdgaNumber: '205038'},
  {id: 'player-nick-coleman-4f3bb245-0640-4512-b6c5-c9a0161f92e1', pdgaNumber: '157693'},
  {id: 'paul-andrews', pdgaNumber: '161333'},
  {id: 'paul-jackson', pdgaNumber: '167714'},
  {id: 'ray-ledbetter', pdgaNumber: '324081'},
  {id: 'sam-white', pdgaNumber: '272475'},
  {id: 'scott-keaton', pdgaNumber: '207365'},
  {id: 'shannon-johnson', pdgaNumber: '169659'},
  {id: 'travis-bochum', pdgaNumber: '103594'},
  {id: 'hubert-cheers', pdgaNumber: '63405'},
  {id: 'eric-pierre', pdgaNumber: '257351', rating: 822},
  {id: 'david-redlon', pdgaNumber: '111234', rating: 937},
  {id: 'derrick-young', pdgaNumber: '95129', rating: 910},
  {id: 'jeffrey-grier', pdgaNumber: '99208', rating: 902},
  {id: 'tim-mason', pdgaNumber: '6274', rating: 853},
  {id: 'marty-adams', pdgaNumber: '46188', rating: 948},
];

export async function POST() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return Response.json({error: 'Authentication required.'}, {status: 401});

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return Response.json({error: 'Approved commissioner access is required.'}, {status: 403});
  }

  const ids = RECOVERED_PDGA.map((entry) => entry.id);
  const {data: rows, error: readError} = await supabase
    .from('launch_players')
    .select('id,pdga_number,pdga_rating')
    .in('id', ids);
  if (readError) return Response.json({error: readError.message}, {status: 500});

  const currentById = new Map((rows ?? []).map((row) => [row.id, {
    number: String(row.pdga_number ?? '').trim(),
    rating: row.pdga_rating as number | null,
  }]));
  let updated = 0;
  let unchanged = 0;
  const conflicts: Array<{id: string; current: string; recovered: string}> = [];
  const missing: string[] = [];

  for (const entry of RECOVERED_PDGA) {
    if (!currentById.has(entry.id)) {
      missing.push(entry.id);
      continue;
    }

    const current = currentById.get(entry.id)!;
    if (current.number && current.number !== entry.pdgaNumber) {
      conflicts.push({id: entry.id, current: current.number, recovered: entry.pdgaNumber});
      continue;
    }

    const update: {pdga_number?: string; pdga_rating?: number; updated_at: string} = {
      updated_at: new Date().toISOString(),
    };
    let changed = false;

    if (!current.number) {
      update.pdga_number = entry.pdgaNumber;
      changed = true;
    }
    if (current.rating == null && entry.rating != null) {
      update.pdga_rating = entry.rating;
      changed = true;
    }

    if (!changed) {
      unchanged += 1;
      continue;
    }

    const {error} = await supabase
      .from('launch_players')
      .update(update)
      .eq('id', entry.id);
    if (error) return Response.json({error: error.message, playerId: entry.id}, {status: 500});
    updated += 1;
  }

  return Response.json({ok: true, total: RECOVERED_PDGA.length, updated, unchanged, conflicts, missing});
}
