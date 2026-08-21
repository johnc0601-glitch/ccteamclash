import type {SupabaseClient} from '@supabase/supabase-js';
import {SupabaseClashRatingFinalizer} from '@/domain/ratings/SupabaseClashRatingFinalizer';

type AnyClient = SupabaseClient<any>;

type QueueRow = {
  id: string;
  correction_id: string;
  season_id: string;
  event_key: string;
  event_order: number;
  event_label: string;
  status: 'Pending' | 'Rebuilt' | 'Failed';
};

export type ClashRebuildSummary = {
  correctionId: string | null;
  rebuiltEvents: number;
  failedEvent: {eventKey: string; eventOrder: number; message: string} | null;
  remainingEvents: number;
};

export class SupabaseClashRatingRebuilder {
  constructor(
    private readonly db: AnyClient,
    private readonly finalizer: SupabaseClashRatingFinalizer,
  ) {}

  async continueAfterFinalization(eventKey: string, runId: string): Promise<ClashRebuildSummary> {
    const queueRow = await this.findPendingQueueRow(eventKey);
    if (!queueRow) {
      return {correctionId: null, rebuiltEvents: 0, failedEvent: null, remainingEvents: 0};
    }

    await this.markRebuilt(queueRow.id, runId);
    let rebuiltEvents = 1;

    const pending = await this.getPendingRows(queueRow.correction_id);
    for (const row of pending) {
      try {
        const result = await this.finalizer.finalize(row.event_key);
        await this.markRebuilt(row.id, result.runId);
        rebuiltEvents += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Automatic Clash rating rebuild failed.';
        await this.markFailed(row.id, message);
        return {
          correctionId: queueRow.correction_id,
          rebuiltEvents,
          failedEvent: {eventKey: row.event_key, eventOrder: row.event_order, message},
          remainingEvents: await this.countUnrebuilt(queueRow.correction_id),
        };
      }
    }

    return {
      correctionId: queueRow.correction_id,
      rebuiltEvents,
      failedEvent: null,
      remainingEvents: 0,
    };
  }

  private async findPendingQueueRow(eventKey: string): Promise<QueueRow | null> {
    const {data, error} = await this.db
      .from('clash_rating_rebuild_queue')
      .select('id,correction_id,season_id,event_key,event_order,event_label,status')
      .eq('event_key', eventKey)
      .eq('status', 'Pending')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as QueueRow | null;
  }

  private async getPendingRows(correctionId: string): Promise<QueueRow[]> {
    const {data, error} = await this.db
      .from('clash_rating_rebuild_queue')
      .select('id,correction_id,season_id,event_key,event_order,event_label,status')
      .eq('correction_id', correctionId)
      .eq('status', 'Pending')
      .order('event_order', {ascending: true});
    if (error) throw error;
    return (data ?? []) as QueueRow[];
  }

  private async markRebuilt(id: string, runId: string) {
    const {error} = await this.db
      .from('clash_rating_rebuild_queue')
      .update({
        status: 'Rebuilt',
        run_id: runId,
        error_message: null,
        rebuilt_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  private async markFailed(id: string, message: string) {
    const {error} = await this.db
      .from('clash_rating_rebuild_queue')
      .update({status: 'Failed', error_message: message})
      .eq('id', id);
    if (error) throw error;
  }

  private async countUnrebuilt(correctionId: string): Promise<number> {
    const {count, error} = await this.db
      .from('clash_rating_rebuild_queue')
      .select('id', {count: 'exact', head: true})
      .eq('correction_id', correctionId)
      .neq('status', 'Rebuilt');
    if (error) throw error;
    return count ?? 0;
  }
}
