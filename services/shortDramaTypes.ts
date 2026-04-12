export type ShortDramaSourceType = 'logline' | 'treatment' | 'novel-excerpt' | 'script';

export type ShortDramaTaskStatus =
  | 'draft'
  | 'planned'
  | 'storyboarded'
  | 'ready-to-produce'
  | 'producing'
  | 'paused'
  | 'reviewing'
  | 'completed'
  | 'failed';

export type PipelineStage =
  | 'planning'
  | 'storyboarding'
  | 'batching'
  | 'producing'
  | 'reviewing'
  | 'completed';

export type GenerationMode = 'image' | 'video' | 'hybrid';

export type BatchStatus = 'queued' | 'running' | 'completed' | 'failed';

export type CheckpointStatus = 'pending' | 'approved' | 'skipped';

export type ReviewSeverity = 'critical' | 'major' | 'minor';

export type ReviewCategory =
  | 'missing-shot'
  | 'character-drift'
  | 'style-drift'
  | 'pacing'
  | 'continuity'
  | 'other';

export interface StoryCharacter {
  id: string;
  name: string;
  role: string;
  summary: string;
  appearance?: string;
  wardrobe?: string;
  personality?: string;
}

export interface StoryBeat {
  id: string;
  title: string;
  summary: string;
  emotionalGoal: string;
  conflict: string;
}

export interface StoryboardShot {
  id: string;
  sceneId: string;
  beatId?: string;
  title: string;
  purpose: string;
  description: string;
  camera: string;
  composition: string;
  movement?: string;
  emotionalTone: string;
  generationMode: GenerationMode;
  durationSeconds?: number;
  userCheckpointRequired: boolean;
}

export interface ShortDramaScene {
  id: string;
  title: string;
  summary: string;
  location: string;
  timeOfDay: string;
  emotionalTone: string;
  characterIds: string[];
  beats: StoryBeat[];
  shots: StoryboardShot[];
}

export interface VisualConstraint {
  styleDirection: string;
  palette: string[];
  lightingDirection: string;
  lensLanguage: string;
  era?: string;
  environmentNotes?: string;
  continuityNotes: string[];
}

export interface ProductionBatch {
  id: string;
  sceneId: string;
  shotIds: string[];
  mode: GenerationMode;
  status: BatchStatus;
  dependsOn: string[];
  notes?: string;
}

export interface ReviewIssue {
  id: string;
  severity: ReviewSeverity;
  category: ReviewCategory;
  summary: string;
  fixSuggestion: string;
  requiresReshoot: boolean;
  sceneId?: string;
  shotId?: string;
}

export interface PipelineCheckpoint {
  id: string;
  stage: PipelineStage;
  label: string;
  required: boolean;
  status: CheckpointStatus;
  reason?: string;
}

export interface ShortDramaTask {
  id: string;
  title: string;
  sourceType: ShortDramaSourceType;
  sourceText: string;
  logline: string;
  status: ShortDramaTaskStatus;
  currentStage: PipelineStage;
  requestedRuntimeMinutes: number;
  characters: StoryCharacter[];
  scenes: ShortDramaScene[];
  visualConstraints: VisualConstraint;
  checkpoints: PipelineCheckpoint[];
  batches: ProductionBatch[];
  reviewIssues: ReviewIssue[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateShortDramaPlanInput {
  sourceText: string;
  title?: string;
  sourceType?: ShortDramaSourceType;
  requestedRuntimeMinutes?: number;
  desiredSceneCount?: number;
  styleDirection?: string;
  characterNames?: string[];
}

export interface ShortDramaExecutionOptions {
  batchSize?: number;
  prioritizeVideoShots?: boolean;
}

export interface ShortDramaReviewOptions {
  maxShotsPerScene?: number;
  requireVideoShot?: boolean;
}

export interface ShortDramaPipelineRunOptions extends CreateShortDramaPlanInput {
  batchSize?: number;
  prioritizeVideoShots?: boolean;
  maxShotsPerScene?: number;
  requireVideoShot?: boolean;
}

export interface ShortDramaPipelineSummary {
  totalScenes: number;
  totalShots: number;
  totalBatches: number;
  checkpointCount: number;
  reviewIssueCount: number;
  blockingIssueCount: number;
}

export interface ShortDramaPipelineResult {
  task: ShortDramaTask;
  summary: ShortDramaPipelineSummary;
}
