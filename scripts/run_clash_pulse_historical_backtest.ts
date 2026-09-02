import {createClient} from '@supabase/supabase-js';
import {SupabaseHistoricalRatedResultRepository} from '../src/domain/story-engine/SupabaseHistoricalRatedResultRepository';
import {buildStoryBacktestReport} from '../src/domain/story-engine/StoryBacktestReport';

const url = process.env.PULSE_SUPABASE_URL;
const key = process.env.PULSE_SUPABASE_KEY;
if (!url || !key) throw new Error('PULSE_SUPABASE_URL and PULSE_SUPABASE_KEY are required');

const supabase = createClient(url, key, {
  auth: {persistSession: false, autoRefreshToken: false},
});

const repository = new SupabaseHistoricalRatedResultRepository(supabase);
const build = await repository.getBuildReport();
const seasonIds = [...new Set(build.results.map((result) => result.seasonId))].sort();

const reports = seasonIds.map((seasonId) => buildStoryBacktestReport(build.results, seasonId, 15));

console.log('CLASH_PULSE_BACKTEST_START');
console.log(JSON.stringify({
  build: {
    sourceFactRows: build.sourceFactRows,
    sourceContests: build.sourceContests,
    emittedContests: build.emittedContests,
    quarantinedContests: build.quarantinedContests,
    diagnostics: build.diagnostics,
  },
  reports,
}, null, 2));
console.log('CLASH_PULSE_BACKTEST_END');
