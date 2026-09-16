// Copyright 2026 Aditya Gudal. SPDX-License-Identifier: Apache-2.0
// Honest before/after: replay two RETAINED fits on an identical starting scene
// and report the decisions that actually differ.
//
// Every decision comes from the ordinary ranker via `predictAs`. Nothing here
// consults the task compiler, desired destinations, completion predicates or
// task-card order, and nothing writes to the player's live game - each replay
// builds its own scene from the same seed. A difference shown to the player is
// therefore a real consequence of what they taught, never a staged one.
import { Game } from './game.js';
import { createLessonScene } from './lessons.js';

const MAX_STEPS = 32;

// Advance the headless game until the pending assisted action has resolved.
function settle(game, limit = 2400) {
  for (let i = 0; i < limit; i++) {
    game.update(.05);
    if (!game.pending && !game.path.length) { for (let k = 0; k < 15; k++) game.update(.05); return true; }
  }
  return false;
}

/** Run one retained fit from a fresh copy of the same seeded scene. */
export function replayVersion(model, snapshot, { context, seed, maxSteps = MAX_STEPS } = {}) {
  const game = new Game(createLessonScene(context, seed));
  const decisions = [];
  for (let i = 0; i < maxSteps && game.status === 'playing'; i++) {
    const p = model.predictAs(game, snapshot);
    if (p.ask) { decisions.push({ ask: true, reason: p.reason }); break; }
    const a = p.action;
    decisions.push({ ask: false, kind: a.kind, id: a.id, label: a.label || a.id,
      preference: p.preference, gap: p.gap, evidence: p.evidence || null });
    const accepted = a.kind === 'finish' ? game.finish() : game.command(a.id);
    // A refused action is a real outcome, not something to retry around.
    if (!accepted) { decisions.push({ ask: true, reason: game.lastMessage || 'The move was refused.' }); break; }
    if (!settle(game)) { decisions.push({ ask: true, reason: 'The attempt did not settle.' }); break; }
  }
  return { version: snapshot.version, examples: snapshot.examples, decisions, status: game.status };
}

const same = (a, b) => Boolean(a) && Boolean(b) && a.ask === b.ask &&
  (a.ask ? a.reason === b.reason : a.kind === b.kind && a.id === b.id);

/**
 * Compare two retained fits on one seeded scene.
 * Returns both traces and the first decision that genuinely differs.
 */
export function compareVersions(model, { context = 'collect', seed = 'compare-1', from, to } = {}) {
  const snapshots = model.snapshots || [];
  if (snapshots.length < 2) throw new Error('Two fitted versions are needed for a comparison');
  const older = from ? snapshots.find(s => s.version === from) : snapshots[snapshots.length - 2];
  const newer = to ? snapshots.find(s => s.version === to) : snapshots[snapshots.length - 1];
  if (!older || !newer) throw new Error('No such fitted version');
  if (older.version >= newer.version) throw new Error('Compare an older fit against a newer one');

  const before = replayVersion(model, older, { context, seed });
  const after = replayVersion(model, newer, { context, seed });

  let firstChange = null;
  const steps = Math.max(before.decisions.length, after.decisions.length);
  for (let i = 0; i < steps; i++) {
    const b = before.decisions[i], a = after.decisions[i];
    if (!same(b, a)) { firstChange = { step: i, before: b || null, after: a || null }; break; }
  }
  return {
    context, seed, before, after, firstChange,
    // No difference is a legitimate result: the player is told to teach more,
    // never shown an invented change.
    changed: Boolean(firstChange),
    completedBefore: before.status === 'won',
    completedAfter: after.status === 'won'
  };
}
