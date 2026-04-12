import type {
  ProductionBatch,
  ShortDramaExecutionOptions,
  ShortDramaTask,
} from './shortDramaTypes';

interface ExecutionDependencies {
  createId?: (prefix: string) => string;
  now?: () => number;
}

function defaultCreateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

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

export function buildProductionBatches(
  task: ShortDramaTask,
  options: ShortDramaExecutionOptions = {},
  deps: ExecutionDependencies = {},
): ProductionBatch[] {
  const createId = deps.createId ?? defaultCreateId;
  const batchSize = Math.max(1, options.batchSize || 2);
  const prioritizeVideoShots = options.prioritizeVideoShots ?? true;

  const batches: ProductionBatch[] = [];

  task.scenes.forEach((scene) => {
    const orderedShots = [...scene.shots].sort((left, right) => {
      if (!prioritizeVideoShots) {
        return 0;
      }

      if (left.generationMode === right.generationMode) {
        return 0;
      }

      return left.generationMode === 'video' ? -1 : 1;
    });

    for (let index = 0; index < orderedShots.length; index += batchSize) {
      const shotGroup = orderedShots.slice(index, index + batchSize);
      const mode = shotGroup.some((shot) => shot.generationMode === 'video')
        ? shotGroup.some((shot) => shot.generationMode === 'image')
          ? 'hybrid'
          : 'video'
        : 'image';

      batches.push({
        id: createId('batch'),
        sceneId: scene.id,
        shotIds: shotGroup.map((shot) => shot.id),
        mode,
        status: 'queued',
        dependsOn: index === 0 ? [] : [batches[batches.length - 1].id],
        notes: `Scene ${scene.title} batch ${Math.floor(index / batchSize) + 1}`,
      });
    }
  });

  return batches;
}

export function attachProductionPlan(
  task: ShortDramaTask,
  options: ShortDramaExecutionOptions = {},
  deps: ExecutionDependencies = {},
): ShortDramaTask {
  const now = deps.now ?? Date.now;
  const nextTask = cloneTask(task);
  nextTask.batches = buildProductionBatches(nextTask, options, deps);
  nextTask.status = 'ready-to-produce';
  nextTask.currentStage = 'batching';
  nextTask.updatedAt = now();

  return nextTask;
}

export function updateBatchStatus(
  task: ShortDramaTask,
  batchId: string,
  status: ProductionBatch['status'],
  now: () => number = Date.now,
): ShortDramaTask {
  const nextTask = cloneTask(task);
  nextTask.batches = nextTask.batches.map((batch) =>
    batch.id === batchId ? { ...batch, status } : batch,
  );

  if (nextTask.batches.every((batch) => batch.status === 'completed')) {
    nextTask.status = 'reviewing';
    nextTask.currentStage = 'reviewing';
  } else if (nextTask.batches.some((batch) => batch.status === 'running')) {
    nextTask.status = 'producing';
    nextTask.currentStage = 'producing';
  }

  if (nextTask.batches.some((batch) => batch.status === 'failed')) {
    nextTask.status = 'failed';
  }

  nextTask.updatedAt = now();
  return nextTask;
}
