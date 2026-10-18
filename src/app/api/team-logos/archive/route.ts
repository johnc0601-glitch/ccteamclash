import {Buffer} from 'node:buffer';

// The eight current public team emblems, preserving original file formats.
// The 2026-10-17 sources match launch_teams.logo.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPABASE = 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams';
const WEBSITE = 'https://ccteamclash.com/team-logos';

const LOGOS = [
  {name: 'Beast_Mode.svg', url: SUPABASE + '/beast-mode/logo.svg'},
  {name: 'Cougar_Country.jpg', url: WEBSITE + '/cougar-country.jpg'},
  {name: 'Dark_Knights.jpg', url: SUPABASE + '/dark-knights/logo.jpg'},
  {name: 'Hayneous_OGs.webp', url: SUPABASE + '/hayneous-og-s/logo.webp'},
  {name: 'Kure_Beach.png', url: WEBSITE + '/kb.png'},
  {name: 'Ninjas.jpg', url: WEBSITE + '/ninjas.jpg'},
  {name: 'Riptide.jpg', url: SUPABASE + '/riptide/logo.jpg'},
  {name: 'Wild_Turkey.png', url: SUPABASE + '/wild-turkey/logo.png'},
] as const;

type ZipFile = {name: string; data: Buffer};

// ZIP stored entries preserve the original bytes, without recompression.
function makeZip(files: readonly ZipFile[]): Buffer {
  const parts: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const filename = Buffer.from(file.name, 'utf8');
    const length = file.data.length;
    const checksum = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(length, 18);
    local.writeUInt32LE(length, 22);
    local.writeUInt16LE(filename.length, 26);
    parts.push(local, filename, file.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(length, 20);
    central.writeUInt32LE(length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, filename);
    offset += local.length + filename.length + length;
  }

  const centralSize = directory.reduce((sum, block) => sum + block.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isExpectedFormat(name: string, data: Buffer): boolean {
  if (data.length < 100) return false;
  if (name.endsWith('.png')) return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (name.endsWith('.jpg')) return data[0] === 255 && data[1] === 216;
  if (name.endsWith('.webp')) return data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (name.endsWith('.svg')) return /<svg[\s>]/i.test(data.toString('utf8'));
  return false;
}

export async function GET() {
  try {
    const files = await Promise.all(LOGOS.map(async (logo): Promise<ZipFile> => {
      const response = await fetch(logo.url, {signal: AbortSignal.timeout(25000), cache: 'no-store'});
      if (!response.ok) throw new Error('Logo missing: ' + logo.name + ' (' + response.status + ')');
      const data = Buffer.from(await response.arrayBuffer());
      if (!isExpectedFormat(logo.name, data)) throw new Error('Unexpected image bytes: ' + logo.name);
      return {name: logo.name, data};
    }));

    const zip = makeZip(files);
    return new Response(Uint8Array.from(zip).buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="CCTeamClash_8_Team_Logos.zip"',
        'Content-Length': String(zip.byteLength),
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (error) {
    console.error('[team-logos-archive] Could not build complete ZIP', error);
    return Response.json({error: 'Logo package temporarily unavailable. All eight images are required.'}, {status: 502});
  }
}
