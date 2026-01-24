/**
 * LogEval-style evaluation metrics for log parsing accuracy.
 *
 * Based on the LogEval benchmark methodology:
 * - Grouping Accuracy (GA): Are logs correctly grouped by template?
 * - Parsing Accuracy (PA): Are template patterns correctly extracted?
 * - F1 variants: Template-level metrics that are robust to imbalanced data
 *
 * @see https://arxiv.org/abs/2407.01206
 */

/**
 * A single log entry with its ground truth annotation.
 */
export interface GroundTruthEntry {
  /** Line content */
  content: string;
  /** Ground truth template ID (for grouping) */
  templateId: string;
  /** Ground truth template pattern (for parsing accuracy) */
  template: string;
}

/**
 * A prediction from the log parser.
 */
export interface PredictionEntry {
  /** Line content */
  content: string;
  /** Predicted template ID */
  templateId: string;
  /** Predicted template pattern */
  template: string;
}

/**
 * Evaluation result containing all accuracy metrics.
 */
export interface EvalResult {
  /** Message-level grouping accuracy (0-1) */
  groupingAccuracy: number;
  /** Message-level parsing accuracy (0-1) */
  parsingAccuracy: number;
  /** Template-level F1 for grouping (rand index based) */
  f1GroupingAccuracy: number;
  /** Template-level F1 for template patterns */
  f1ParsingAccuracy: number;
  /** Number of ground truth templates */
  groundTruthTemplateCount: number;
  /** Number of predicted templates */
  predictedTemplateCount: number;
}

/**
 * Calculate Grouping Accuracy (GA).
 *
 * Two logs are correctly grouped if:
 * - Both have same ground truth template AND same predicted template, OR
 * - Both have different ground truth templates AND different predicted templates
 *
 * GA = (correct pairs) / (total pairs)
 *
 * This is equivalent to the Rand Index.
 */
export function calculateGroupingAccuracy(
  groundTruth: GroundTruthEntry[],
  predictions: PredictionEntry[]
): number {
  if (groundTruth.length !== predictions.length || groundTruth.length < 2) {
    return 0;
  }

  const n = groundTruth.length;
  let correctPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const gtEntry1 = groundTruth[i];
      const gtEntry2 = groundTruth[j];
      const predEntry1 = predictions[i];
      const predEntry2 = predictions[j];

      if (!gtEntry1 || !gtEntry2 || !predEntry1 || !predEntry2) continue;

      const gtSame = gtEntry1.templateId === gtEntry2.templateId;
      const predSame = predEntry1.templateId === predEntry2.templateId;

      if (gtSame === predSame) {
        correctPairs++;
      }
      totalPairs++;
    }
  }

  return totalPairs > 0 ? correctPairs / totalPairs : 0;
}

/**
 * Calculate Parsing Accuracy (PA).
 *
 * A log is correctly parsed if its predicted template matches
 * the ground truth template exactly (after normalization).
 *
 * PA = (correctly parsed logs) / (total logs)
 */
export function calculateParsingAccuracy(
  groundTruth: GroundTruthEntry[],
  predictions: PredictionEntry[]
): number {
  if (groundTruth.length !== predictions.length || groundTruth.length === 0) {
    return 0;
  }

  let correct = 0;
  for (let i = 0; i < groundTruth.length; i++) {
    const gtEntry = groundTruth[i];
    const predEntry = predictions[i];

    if (!gtEntry || !predEntry) continue;

    if (normalizeTemplate(gtEntry.template) === normalizeTemplate(predEntry.template)) {
      correct++;
    }
  }

  return correct / groundTruth.length;
}

/**
 * Normalize a template for comparison.
 * - Normalize whitespace
 * - Lowercase for case-insensitive comparison
 */
export function normalizeTemplate(template: string): string {
  return template
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Calculate F1 Grouping Accuracy (F1-GA).
 *
 * Template-level metric using precision and recall:
 * - For each ground truth template, find the best matching predicted template
 * - Precision: fraction of predicted cluster that belongs to the GT cluster
 * - Recall: fraction of GT cluster captured by the predicted cluster
 * - F1 = 2 * P * R / (P + R)
 *
 * Final score is the weighted average across all GT templates.
 */
export function calculateF1GroupingAccuracy(
  groundTruth: GroundTruthEntry[],
  predictions: PredictionEntry[]
): number {
  if (groundTruth.length !== predictions.length || groundTruth.length === 0) {
    return 0;
  }

  // Group by ground truth template
  const gtGroups = new Map<string, number[]>();
  for (let i = 0; i < groundTruth.length; i++) {
    const entry = groundTruth[i];
    if (!entry) continue;
    const indices = gtGroups.get(entry.templateId) ?? [];
    indices.push(i);
    gtGroups.set(entry.templateId, indices);
  }

  // Group by predicted template
  const predGroups = new Map<string, Set<number>>();
  for (let i = 0; i < predictions.length; i++) {
    const entry = predictions[i];
    if (!entry) continue;
    const indices = predGroups.get(entry.templateId) ?? new Set();
    indices.add(i);
    predGroups.set(entry.templateId, indices);
  }

  let totalF1 = 0;
  let totalWeight = 0;

  for (const [_gtTemplateId, gtIndices] of gtGroups) {
    let bestF1 = 0;

    // Find the predicted cluster with best F1 for this GT cluster
    for (const [_predTemplateId, predIndices] of predGroups) {
      // Calculate intersection
      let intersection = 0;
      for (const idx of gtIndices) {
        if (predIndices.has(idx)) {
          intersection++;
        }
      }

      if (intersection === 0) continue;

      const precision = intersection / predIndices.size;
      const recall = intersection / gtIndices.length;
      const f1 = (2 * precision * recall) / (precision + recall);

      if (f1 > bestF1) {
        bestF1 = f1;
      }
    }

    // Weight by cluster size
    totalF1 += bestF1 * gtIndices.length;
    totalWeight += gtIndices.length;
  }

  return totalWeight > 0 ? totalF1 / totalWeight : 0;
}

/**
 * Calculate F1 Parsing Accuracy (F1-PA).
 *
 * For each ground truth template, check if there's a predicted template
 * with an exact match. Uses precision/recall at the template level.
 */
export function calculateF1ParsingAccuracy(
  groundTruth: GroundTruthEntry[],
  predictions: PredictionEntry[]
): number {
  if (groundTruth.length !== predictions.length || groundTruth.length === 0) {
    return 0;
  }

  // Get unique ground truth templates
  const gtTemplates = new Map<string, { template: string; count: number }>();
  for (const entry of groundTruth) {
    const existing = gtTemplates.get(entry.templateId);
    if (existing) {
      existing.count++;
    } else {
      gtTemplates.set(entry.templateId, { template: entry.template, count: 1 });
    }
  }

  // Get unique predicted templates
  const predTemplates = new Set<string>();
  for (const entry of predictions) {
    predTemplates.add(normalizeTemplate(entry.template));
  }

  // Calculate weighted accuracy
  let correctWeight = 0;
  let totalWeight = 0;

  for (const [_templateId, { template, count }] of gtTemplates) {
    const normalized = normalizeTemplate(template);
    if (predTemplates.has(normalized)) {
      correctWeight += count;
    }
    totalWeight += count;
  }

  return totalWeight > 0 ? correctWeight / totalWeight : 0;
}

/**
 * Evaluate parsing accuracy using all LogEval metrics.
 */
export function evaluateParsing(
  groundTruth: GroundTruthEntry[],
  predictions: PredictionEntry[]
): EvalResult {
  const gtTemplateIds = new Set(groundTruth.map(e => e.templateId));
  const predTemplateIds = new Set(predictions.map(e => e.templateId));

  return {
    groupingAccuracy: calculateGroupingAccuracy(groundTruth, predictions),
    parsingAccuracy: calculateParsingAccuracy(groundTruth, predictions),
    f1GroupingAccuracy: calculateF1GroupingAccuracy(groundTruth, predictions),
    f1ParsingAccuracy: calculateF1ParsingAccuracy(groundTruth, predictions),
    groundTruthTemplateCount: gtTemplateIds.size,
    predictedTemplateCount: predTemplateIds.size,
  };
}

/**
 * Format evaluation results as a human-readable report.
 */
export function formatEvalReport(result: EvalResult): string {
  const lines = [
    '=== Parsing Accuracy Report ===',
    '',
    'Message-level metrics:',
    `  Grouping Accuracy (GA):  ${(result.groupingAccuracy * 100).toFixed(1)}%`,
    `  Parsing Accuracy (PA):   ${(result.parsingAccuracy * 100).toFixed(1)}%`,
    '',
    'Template-level metrics (F1):',
    `  F1 Grouping Accuracy:    ${(result.f1GroupingAccuracy * 100).toFixed(1)}%`,
    `  F1 Parsing Accuracy:     ${(result.f1ParsingAccuracy * 100).toFixed(1)}%`,
    '',
    'Template counts:',
    `  Ground truth templates:  ${result.groundTruthTemplateCount}`,
    `  Predicted templates:     ${result.predictedTemplateCount}`,
  ];

  return lines.join('\n');
}
