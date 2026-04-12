import { describe, expect, it } from 'vitest';
import {
  pauseShortDramaTask,
  resumeShortDramaTask,
  runShortDramaPipeline,
  updateCheckpointStatus,
} from '../services/shortDramaPipeline';

describe('shortDramaPipeline', () => {
  it('creates a structured short-drama contract from source text', () => {
    const result = runShortDramaPipeline({
      sourceText: 'A cautious commander receives impossible intelligence, hesitates, then chooses a risky public move that changes the balance of power.',
      requestedRuntimeMinutes: 4,
      desiredSceneCount: 3,
      batchSize: 2,
    });

    expect(result.task.status).toBe('reviewing');
    expect(result.task.scenes).toHaveLength(3);
    expect(result.summary.totalScenes).toBe(3);
    expect(result.summary.totalShots).toBe(6);
    expect(result.summary.totalBatches).toBeGreaterThan(0);
    expect(result.task.checkpoints).toHaveLength(3);
    expect(result.task.visualConstraints.styleDirection).toContain('cinematic');
  });

  it('can pause and resume a planned task without losing batches', () => {
    const result = runShortDramaPipeline({
      sourceText: 'A founder hides a fatal flaw in the company demo until the final pitch exposes the truth.',
    });

    const paused = pauseShortDramaTask(result.task, 'Waiting for storyboard approval.');
    expect(paused.status).toBe('paused');

    const resumed = resumeShortDramaTask(paused);
    expect(resumed.status).toBe('ready-to-produce');
    expect(resumed.batches).toHaveLength(result.task.batches.length);
  });

  it('moves into storyboarding when the planning checkpoint is approved', () => {
    const result = runShortDramaPipeline({
      sourceText: 'A young analyst discovers the peace deal is a trap and races to prove it before dawn.',
    });
    const planningCheckpoint = result.task.checkpoints.find((checkpoint) => checkpoint.stage === 'planning');

    expect(planningCheckpoint).toBeDefined();

    const updated = updateCheckpointStatus(
      result.task,
      planningCheckpoint!.id,
      'approved',
      'Story spine approved.',
    );

    expect(updated.status).toBe('storyboarded');
    expect(updated.currentStage).toBe('storyboarding');
  });
});
