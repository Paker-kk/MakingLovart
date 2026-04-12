import { attachProductionPlan } from './shortDramaExecution';
import { createShortDramaPlan } from './shortDramaPlanner';
import { attachReviewIssues } from './shortDramaReview';
import type {
  PipelineCheckpoint,
  ShortDramaPipelineResult,
  ShortDramaPipelineRunOptions,
  ShortDramaTask,
} from './shortDramaTypes';

function cloneTask(task: ShortDramaTask): ShortDramaTask {
  return {
    ...task,
    scenes: task.scenes.map((scene) => ({
      ...scene,
      beats: scene.beats.map((beat) => ({ ...beat })),
      shots: scene.shots.map((shot) => ({ ...shot })),
    })),
    checkpoints: task.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    batches: task.batches.map((batch) => ({ ...batch, shotIds: [...batch.shotIds], dependsOn: [...batch.dependsOn] })),
    reviewIssues: task.reviewIssues.map((issue) => ({ ...issue })),
    characters: task.characters.map((character) => ({ ...character })),
    visualConstraints: {
      ...task.visualConstraints,
      palette: [...task.visualConstraints.palette],
      continuityNotes: [...task.visualConstraints.continuityNotes],
    },
  };
}

function summarizeTask(task: ShortDramaTask): ShortDramaPipelineResult['summary'] {
  const totalShots = task.scenes.reduce((count, scene) => count + scene.shots.length, 0);
  const blockingIssueCount = task.reviewIssues.filter((issue) => issue.severity === 'critical').length;

  return {
    totalScenes: task.scenes.length,
    totalShots,
    totalBatches: task.batches.length,
    checkpointCount: task.checkpoints.length,
    reviewIssueCount: task.reviewIssues.length,
    blockingIssueCount,
  };
}

export function runShortDramaPipeline(
  options: ShortDramaPipelineRunOptions,
): ShortDramaPipelineResult {
  const plannedTask = createShortDramaPlan(options);
  const batchedTask = attachProductionPlan(plannedTask, {
    batchSize: options.batchSize,
    prioritizeVideoShots: options.prioritizeVideoShots,
  });
  const reviewedTask = attachReviewIssues(batchedTask, {
    maxShotsPerScene: options.maxShotsPerScene,
    requireVideoShot: options.requireVideoShot,
  });

  return {
    task: reviewedTask,
    summary: summarizeTask(reviewedTask),
  };
}

export function updateCheckpointStatus(
  task: ShortDramaTask,
  checkpointId: string,
  status: PipelineCheckpoint['status'],
  reason?: string,
  now: () => number = Date.now,
): ShortDramaTask {
  const nextTask = cloneTask(task);
  nextTask.checkpoints = nextTask.checkpoints.map((checkpoint) =>
    checkpoint.id === checkpointId ? { ...checkpoint, status, reason } : checkpoint,
  );

  const planningApproved = nextTask.checkpoints.some(
    (checkpoint) => checkpoint.stage === 'planning' && checkpoint.status === 'approved',
  );
  const storyboardApproved = nextTask.checkpoints.some(
    (checkpoint) => checkpoint.stage === 'storyboarding' && checkpoint.status === 'approved',
  );
  const reviewApproved = nextTask.checkpoints.some(
    (checkpoint) => checkpoint.stage === 'reviewing' && checkpoint.status === 'approved',
  );

  if (reviewApproved && nextTask.reviewIssues.length === 0) {
    nextTask.status = 'completed';
    nextTask.currentStage = 'completed';
  } else if (storyboardApproved) {
    nextTask.status = 'ready-to-produce';
    nextTask.currentStage = 'batching';
  } else if (planningApproved) {
    nextTask.status = 'storyboarded';
    nextTask.currentStage = 'storyboarding';
  }

  nextTask.updatedAt = now();
  return nextTask;
}

export function pauseShortDramaTask(
  task: ShortDramaTask,
  reason: string,
  now: () => number = Date.now,
): ShortDramaTask {
  const nextTask = cloneTask(task);
  nextTask.status = 'paused';
  nextTask.updatedAt = now();
  nextTask.checkpoints = nextTask.checkpoints.map((checkpoint, index) =>
    index === 0 && checkpoint.status === 'pending'
      ? { ...checkpoint, reason: checkpoint.reason || reason }
      : checkpoint,
  );
  return nextTask;
}

export function resumeShortDramaTask(
  task: ShortDramaTask,
  now: () => number = Date.now,
): ShortDramaTask {
  const nextTask = cloneTask(task);
  if (nextTask.status === 'paused') {
    nextTask.status = nextTask.batches.length > 0 ? 'ready-to-produce' : 'planned';
  }
  nextTask.updatedAt = now();
  return nextTask;
}
