import type {
  ReviewIssue,
  ShortDramaReviewOptions,
  ShortDramaTask,
} from './shortDramaTypes';

interface ReviewDependencies {
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

export function reviewShortDramaTask(
  task: ShortDramaTask,
  options: ShortDramaReviewOptions = {},
  deps: ReviewDependencies = {},
): ReviewIssue[] {
  const createId = deps.createId ?? defaultCreateId;
  const maxShotsPerScene = Math.max(1, options.maxShotsPerScene || 5);
  const requireVideoShot = options.requireVideoShot ?? true;
  const issues: ReviewIssue[] = [];

  if (!task.visualConstraints.styleDirection) {
    issues.push({
      id: createId('review'),
      severity: 'major',
      category: 'style-drift',
      summary: 'Visual direction is missing a stable style definition.',
      fixSuggestion: 'Confirm a single styleDirection before production starts.',
      requiresReshoot: false,
    });
  }

  task.scenes.forEach((scene) => {
    if (scene.shots.length === 0) {
      issues.push({
        id: createId('review'),
        severity: 'critical',
        category: 'missing-shot',
        summary: `${scene.title} has no storyboard shots.`,
        fixSuggestion: 'Add at least one anchor shot and one action shot for the scene.',
        requiresReshoot: true,
        sceneId: scene.id,
      });
    }

    if (scene.shots.length > maxShotsPerScene) {
      issues.push({
        id: createId('review'),
        severity: 'minor',
        category: 'pacing',
        summary: `${scene.title} has ${scene.shots.length} shots, which may slow down a short sample cut.`,
        fixSuggestion: 'Merge duplicate coverage and keep only the shots that carry plot or emotion.',
        requiresReshoot: false,
        sceneId: scene.id,
      });
    }

    if (requireVideoShot && !scene.shots.some((shot) => shot.generationMode !== 'image')) {
      issues.push({
        id: createId('review'),
        severity: 'major',
        category: 'continuity',
        summary: `${scene.title} has no video anchor shot.`,
        fixSuggestion: 'Promote one anchor shot in the scene to video or hybrid generation.',
        requiresReshoot: true,
        sceneId: scene.id,
      });
    }
  });

  return issues;
}

export function attachReviewIssues(
  task: ShortDramaTask,
  options: ShortDramaReviewOptions = {},
  deps: ReviewDependencies = {},
): ShortDramaTask {
  const now = deps.now ?? Date.now;
  const nextTask = cloneTask(task);
  nextTask.reviewIssues = reviewShortDramaTask(nextTask, options, deps);
  nextTask.status = nextTask.reviewIssues.some((issue) => issue.severity === 'critical') ? 'failed' : 'reviewing';
  nextTask.currentStage = 'reviewing';
  nextTask.updatedAt = now();
  return nextTask;
}
