import type { Template, CompressionResult } from '../types.js';

/**
 * Format templates as a compact summary.
 */
export function formatSummary(
  templates: Template[],
  stats: CompressionResult['stats']
): string {
  const lines: string[] = [];

  // Header
  lines.push('=== Log Compression Summary ===');
  lines.push(
    `Input: ${stats.inputLines.toLocaleString()} lines → ${stats.uniqueTemplates} templates ` +
    `(${(stats.compressionRatio * 100).toFixed(1)}% reduction)`
  );
  lines.push('');

  if (templates.length === 0) {
    lines.push('No templates discovered.');
    return lines.join('\n');
  }

  // Top templates by frequency
  lines.push('Top templates by frequency:');

  const topTemplates = templates.slice(0, 20);
  topTemplates.forEach((template, index) => {
    const count = template.occurrences.toLocaleString();
    lines.push(`${index + 1}. [${count}x] ${template.pattern}`);
  });

  if (templates.length > 20) {
    lines.push(`... and ${templates.length - 20} more templates`);
  }

  // Rare events section
  const rareTemplates = templates.filter((t) => t.occurrences <= 5);
  if (rareTemplates.length > 0) {
    lines.push('');
    lines.push(`Rare events (≤5 occurrences): ${rareTemplates.length} templates`);

    const shownRare = rareTemplates.slice(0, 5);
    for (const template of shownRare) {
      lines.push(`- [${template.occurrences}x] ${template.pattern}`);
    }

    if (rareTemplates.length > 5) {
      lines.push(`... and ${rareTemplates.length - 5} more rare templates`);
    }
  }

  return lines.join('\n');
}

/**
 * Format templates with full details including sample variables.
 */
export function formatDetailed(
  templates: Template[],
  stats: CompressionResult['stats']
): string {
  const lines: string[] = [];

  // Header
  lines.push('=== Log Compression Details ===');
  lines.push(
    `Input: ${stats.inputLines.toLocaleString()} lines → ${stats.uniqueTemplates} templates ` +
    `(${(stats.compressionRatio * 100).toFixed(1)}% reduction)`
  );
  lines.push(`Estimated token reduction: ${(stats.estimatedTokenReduction * 100).toFixed(1)}%`);
  lines.push('');

  if (templates.length === 0) {
    lines.push('No templates discovered.');
    return lines.join('\n');
  }

  // Each template with samples
  for (const template of templates) {
    lines.push(`=== Template ${template.id} (${template.occurrences.toLocaleString()} occurrences) ===`);
    lines.push(`Pattern: ${template.pattern}`);
    lines.push(`Severity: ${template.severity}${template.isStackFrame ? ' (stack frame)' : ''}`);
    lines.push(`First seen: line ${template.firstSeen + 1}`);
    lines.push(`Last seen: line ${template.lastSeen + 1}`);

    if (template.fullUrlSamples.length > 0) {
      lines.push('URLs:');
      for (const url of template.fullUrlSamples) {
        lines.push(`  - ${url}`);
      }
    }

    if (template.statusCodeSamples.length > 0) {
      lines.push(`Status codes: ${template.statusCodeSamples.join(', ')}`);
    }

    if (template.correlationIdSamples.length > 0) {
      lines.push(`Correlation IDs: ${template.correlationIdSamples.join(', ')}`);
    }

    if (template.durationSamples.length > 0) {
      lines.push(`Durations: ${template.durationSamples.join(', ')}`);
    }

    if (template.sampleVariables.length > 0) {
      lines.push('Sample variables:');
      for (const vars of template.sampleVariables) {
        if (vars.length > 0) {
          lines.push(`  - ${vars.join(', ')}`);
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format templates as JSON.
 */
export function formatJson(
  templates: Template[],
  stats: CompressionResult['stats']
): string {
  const output = {
    version: '1.1',
    stats: {
      inputLines: stats.inputLines,
      uniqueTemplates: stats.uniqueTemplates,
      compressionRatio: Math.round(stats.compressionRatio * 1000) / 1000,
      estimatedTokenReduction: Math.round(stats.estimatedTokenReduction * 1000) / 1000,
    },
    templates: templates.map((t) => ({
      id: t.id,
      pattern: t.pattern,
      occurrences: t.occurrences,
      severity: t.severity,
      isStackFrame: t.isStackFrame,
      samples: t.sampleVariables,
      urlSamples: t.urlSamples,
      fullUrlSamples: t.fullUrlSamples,
      statusCodeSamples: t.statusCodeSamples,
      correlationIdSamples: t.correlationIdSamples,
      durationSamples: t.durationSamples,
      firstSeen: t.firstSeen,
      lastSeen: t.lastSeen,
    })),
  };

  return JSON.stringify(output, null, 2);
}
