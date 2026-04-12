import type {
  CreateShortDramaPlanInput,
  PipelineCheckpoint,
  ShortDramaScene,
  ShortDramaTask,
  StoryBeat,
  StoryCharacter,
  StoryboardShot,
  VisualConstraint,
} from './shortDramaTypes';

interface PlannerDependencies {
  now?: () => number;
  createId?: (prefix: string) => string;
}

const defaultNow = () => Date.now();

function defaultCreateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toSentences(sourceText: string): string[] {
  return sourceText
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function inferTitle(sourceText: string): string {
  const normalized = normalizeWhitespace(sourceText);
  if (!normalized) {
    return 'Untitled Short Drama';
  }

  const firstSentence = toSentences(normalized)[0] || normalized;
  return firstSentence.length > 48 ? `${firstSentence.slice(0, 45)}...` : firstSentence;
}

function inferSceneCount(input: CreateShortDramaPlanInput, sentenceCount: number): number {
  if (input.desiredSceneCount && input.desiredSceneCount > 0) {
    return input.desiredSceneCount;
  }

  if (sentenceCount <= 3) {
    return 3;
  }

  if (sentenceCount <= 8) {
    return 4;
  }

  return 5;
}

function createCharacters(
  input: CreateShortDramaPlanInput,
  createId: (prefix: string) => string,
): StoryCharacter[] {
  const names = input.characterNames?.filter(Boolean) ?? ['Lead', 'Counterforce'];

  return names.map((name, index) => ({
    id: createId('char'),
    name,
    role: index === 0 ? 'protagonist' : index === 1 ? 'antagonist' : 'supporting',
    summary: `Placeholder character profile for ${name}.`,
    personality: index === 0 ? 'decisive, emotionally visible' : 'pressure source for the protagonist',
  }));
}

function createVisualConstraints(input: CreateShortDramaPlanInput): VisualConstraint {
  return {
    styleDirection: input.styleDirection || 'grounded cinematic realism',
    palette: ['steel blue', 'muted amber', 'soft grey'],
    lightingDirection: 'high contrast key light with practical motivated fills',
    lensLanguage: 'mix of medium close-ups and controlled wide establishing shots',
    continuityNotes: [
      'Keep protagonist silhouette and wardrobe stable across all scenes.',
      'Do not let location tone drift between adjacent scenes.',
      'Reserve the strongest color accent for the emotional turning point.',
    ],
  };
}

function createShot(
  sceneId: string,
  beat: StoryBeat,
  index: number,
  createId: (prefix: string) => string,
): StoryboardShot {
  const isAnchorShot = index === 0;

  return {
    id: createId('shot'),
    sceneId,
    beatId: beat.id,
    title: `Shot ${index + 1}`,
    purpose: isAnchorShot ? 'Establish dramatic context' : 'Advance character action',
    description: beat.summary,
    camera: isAnchorShot ? 'wide establishing' : 'medium close-up',
    composition: isAnchorShot ? 'layered depth with foreground anchor' : 'character-weighted frame',
    movement: isAnchorShot ? 'slow push-in' : 'locked or restrained handheld drift',
    emotionalTone: beat.emotionalGoal,
    generationMode: isAnchorShot ? 'video' : 'image',
    durationSeconds: isAnchorShot ? 4 : 2,
    userCheckpointRequired: isAnchorShot,
  };
}

function createScenes(
  sourceText: string,
  sceneCount: number,
  characters: StoryCharacter[],
  createId: (prefix: string) => string,
): ShortDramaScene[] {
  const sentences = toSentences(sourceText);
  const groups: string[][] = Array.from({ length: sceneCount }, () => []);

  sentences.forEach((sentence, index) => {
    groups[index % sceneCount].push(sentence);
  });

  return groups.map((group, index) => {
    const sceneId = createId('scene');
    const summary = group.join(' ') || `Scene ${index + 1} needs a detailed summary.`;
    const beat: StoryBeat = {
      id: createId('beat'),
      title: `Beat ${index + 1}`,
      summary,
      emotionalGoal: index === sceneCount - 1 ? 'release tension with a decisive turn' : 'increase dramatic pressure',
      conflict: index === 0 ? 'introduce the central conflict' : 'force the next escalation step',
    };

    return {
      id: sceneId,
      title: `Scene ${index + 1}`,
      summary,
      location: index === 0 ? 'primary location' : `location ${index + 1}`,
      timeOfDay: index % 2 === 0 ? 'day' : 'night',
      emotionalTone: beat.emotionalGoal,
      characterIds: characters.map((character) => character.id),
      beats: [beat],
      shots: [createShot(sceneId, beat, 0, createId), createShot(sceneId, beat, 1, createId)],
    };
  });
}

function createCheckpoints(createId: (prefix: string) => string): PipelineCheckpoint[] {
  return [
    {
      id: createId('checkpoint'),
      stage: 'planning',
      label: 'Confirm story spine and character assumptions',
      required: true,
      status: 'pending',
    },
    {
      id: createId('checkpoint'),
      stage: 'storyboarding',
      label: 'Confirm storyboard pack before production',
      required: true,
      status: 'pending',
    },
    {
      id: createId('checkpoint'),
      stage: 'reviewing',
      label: 'Review dailies and approve reshoots',
      required: true,
      status: 'pending',
    },
  ];
}

export function createShortDramaPlan(
  input: CreateShortDramaPlanInput,
  deps: PlannerDependencies = {},
): ShortDramaTask {
  const now = deps.now ?? defaultNow;
  const createId = deps.createId ?? defaultCreateId;
  const timestamp = now();
  const sourceText = normalizeWhitespace(input.sourceText);
  const title = input.title || inferTitle(sourceText);
  const characters = createCharacters(input, createId);
  const scenes = createScenes(sourceText, inferSceneCount(input, toSentences(sourceText).length), characters, createId);

  return {
    id: createId('task'),
    title,
    sourceType: input.sourceType || 'logline',
    sourceText,
    logline: inferTitle(sourceText),
    status: 'planned',
    currentStage: 'planning',
    requestedRuntimeMinutes: input.requestedRuntimeMinutes || 3,
    characters,
    scenes,
    visualConstraints: createVisualConstraints(input),
    checkpoints: createCheckpoints(createId),
    batches: [],
    reviewIssues: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
