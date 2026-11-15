export type Player = {id: string; name: string; notes: string};
export type Contact = {id: string; name: string; email: string; phone: string; playerIds: string[]; enabled: boolean; notes: string};
export type Season = {id: string; name: string; playerIds: string[]};
export type LeagueEvent = {id: string; seasonId: string; name: string; date: string; time: string; location: string; closed: boolean};
export type Attendance = {eventId: string; playerId: string; status: 'present' | 'unmarked' | 'unknown' | 'absent' | 'excused'; source?: string};
export type Measurement = {id: string; playerId: string; seasonId: string; date: string; kind: string; value: number; unit: string; age: number | null; notes: string; source?: string};
export type LeagueState = {players: Player[]; contacts: Contact[]; seasons: Season[]; events: LeagueEvent[]; attendance: Attendance[]; measurements: Measurement[]};
export type Snapshot = {version: number; data: LeagueState};
export type Action =
  | {type: 'attendance'; eventId: string; playerId: string; present: boolean}
  | {type: 'player'; id: string; name: string; seasonId: string; notes: string; parentName: string; email: string; phone: string}
  | {type: 'contact'; contact: Contact}
  | {type: 'season'; id: string; name: string; copyFrom: string}
  | {type: 'membership'; seasonId: string; playerId: string; enrolled: boolean}
  | {type: 'event'; event: LeagueEvent}
  | {type: 'measurement'; measurement: Measurement};

export const validEmail = (value: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim());
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
function requireValue(ok: unknown, message: string): asserts ok {if (!ok) throw new Error(message);}
function text(value: unknown, limit = 200): value is string {return typeof value === 'string' && value.length <= limit;}
function date(value: string) {return value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;}

// Every change is applied to the latest complete snapshot. The database version check
// makes simultaneous tabs fail visibly instead of overwriting one another.
export function applyAction(state: LeagueState, action: Action): LeagueState {
  const s = structuredClone(state);
  requireValue(action && typeof action === 'object', 'Invalid change.');
  const playerExists = (id: string) => s.players.some(p => p.id === id);
  const seasonExists = (id: string) => s.seasons.some(p => p.id === id);
  switch (action.type) {
    case 'attendance': {
      const e = s.events.find(e => e.id === action.eventId);
      requireValue(e && !e.closed, 'Reopen this event before changing attendance.');
      requireValue(s.seasons.find(x => x.id === e.seasonId)?.playerIds.includes(action.playerId), 'This child is not on this season’s roster.');
      requireValue(typeof action.present === 'boolean', 'Choose checked in or unchecked.');
      const existing = s.attendance.find(x => x.eventId === e.id && x.playerId === action.playerId);
      if (existing) existing.status = action.present ? 'present' : 'unmarked';
      else s.attendance.push({eventId: e.id, playerId: action.playerId, status: action.present ? 'present' : 'unmarked'});
      break;
    }
    case 'player': {
      requireValue(text(action.name) && action.name.trim() && text(action.id, 80) && text(action.notes, 2000), 'Enter a child’s name.');
      requireValue(seasonExists(action.seasonId), 'Choose a season.');
      requireValue(text(action.parentName) && text(action.email, 254) && text(action.phone, 80), 'Check the parent details.');
      requireValue(!action.email || validEmail(action.email), 'Check the email address.');
      requireValue(!playerExists(action.id), 'This child was already added.');
      s.players.push({id: action.id, name: action.name.trim(), notes: action.notes});
      s.seasons.find(x => x.id === action.seasonId)!.playerIds.push(action.id);
      if (action.email) {
        const email = normalizeEmail(action.email);
        const c = s.contacts.find(c => normalizeEmail(c.email) === email);
        if (c) {if (!c.playerIds.includes(action.id)) c.playerIds.push(action.id);}
        else s.contacts.push({id: `contact-${action.id}`, name: action.parentName.trim(), email, phone: action.phone.trim(), playerIds: [action.id], enabled: true, notes: ''});
      }
      break;
    }
    case 'contact': {
      const c = action.contact;
      requireValue(c && text(c.id, 80) && text(c.name) && text(c.email, 254) && text(c.phone, 80) && text(c.notes, 2000), 'Check contact details.');
      requireValue(!c.enabled || validEmail(c.email), 'Enter a valid email before enabling messages.');
      requireValue(Array.isArray(c.playerIds) && c.playerIds.every(playerExists) && typeof c.enabled === 'boolean', 'Choose the linked children.');
      const row = {...c, email: normalizeEmail(c.email), playerIds: [...new Set(c.playerIds)]};
      const index = s.contacts.findIndex(x => x.id === c.id);
      if (index < 0) s.contacts.push(row); else s.contacts[index] = row;
      break;
    }
    case 'season': {
      requireValue(text(action.id, 80) && text(action.name) && action.name.trim() && !seasonExists(action.id), 'Enter a new season name.');
      requireValue(!s.seasons.some(x => x.name.toLowerCase() === action.name.trim().toLowerCase()), 'That season already exists.');
      const old = s.seasons.find(x => x.id === action.copyFrom);
      requireValue(!action.copyFrom || old, 'Choose a season to copy.');
      s.seasons.push({id: action.id, name: action.name.trim(), playerIds: old ? [...old.playerIds] : []});
      break;
    }
    case 'membership': {
      const season = s.seasons.find(x => x.id === action.seasonId);
      requireValue(season && playerExists(action.playerId) && typeof action.enrolled === 'boolean', 'Choose a child and season.');
      season.playerIds = action.enrolled ? [...new Set([...season.playerIds, action.playerId])] : season.playerIds.filter(id => id !== action.playerId);
      break;
    }
    case 'event': {
      const e = action.event;
      requireValue(e && text(e.id, 80) && text(e.name) && e.name.trim() && text(e.location, 300) && text(e.date, 10) && date(e.date), 'Enter the event name and a valid date.');
      requireValue(text(e.time, 5) && (!e.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) && typeof e.closed === 'boolean', 'Check event time.');
      requireValue(seasonExists(e.seasonId), 'Choose a season.');
      const index = s.events.findIndex(x => x.id === e.id);
      requireValue(index < 0 || s.events[index].seasonId === e.seasonId, 'An existing event cannot move between seasons.');
      if (index < 0) s.events.push(e); else s.events[index] = e;
      break;
    }
    case 'measurement': {
      const m = action.measurement;
      requireValue(m && playerExists(m.playerId) && seasonExists(m.seasonId) && text(m.id, 80) && !s.measurements.some(x => x.id === m.id), 'Choose a child and season.');
      requireValue(text(m.date, 10) && Boolean(m.date) && date(m.date) && ['Forehand', 'Backhand', 'Distance'].includes(m.kind), 'Enter the measurement date and type.');
      requireValue(Number.isFinite(m.value) && m.value > 0 && m.value < 10000 && ['mph', 'ft', 'm'].includes(m.unit), 'Enter a positive measurement and its unit.');
      requireValue(m.kind === 'Distance' ? m.unit !== 'mph' : m.unit === 'mph', 'Speeds use mph; distances use ft or m.');
      requireValue((m.age === null || Number.isInteger(m.age) && m.age >= 0 && m.age <= 100) && text(m.notes, 2000), 'Check age and notes.');
      s.measurements.push(m);
      break;
    }
    default: throw new Error('Unknown change.');
  }
  return s;
}

export function emailRecipients(state: LeagueState, seasonId: string) {
  const ids = seasonId === 'all' ? state.players.map(p => p.id) : state.seasons.find(s => s.id === seasonId)?.playerIds ?? [];
  // A disabled duplicate suppresses the address rather than accidentally opting it back in.
  const disabled = new Set(state.contacts.filter(c => !c.enabled).map(c => normalizeEmail(c.email)));
  return [...new Set(state.contacts.filter(c => c.enabled && validEmail(c.email) && c.playerIds.some(id => ids.includes(id)) && !disabled.has(normalizeEmail(c.email))).map(c => normalizeEmail(c.email)))].sort();
}

export function initialEvent(state: LeagueState, today: string) {
  const upcoming = state.events.filter(e => !e.closed && e.date && e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return upcoming[0]?.id ?? state.events.filter(e => !e.closed).at(-1)?.id ?? state.events.at(-1)?.id ?? '';
}

export function csv(rows: unknown[][]) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let v = value == null ? '' : String(value);
    if (/^[=+@\-\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
}
