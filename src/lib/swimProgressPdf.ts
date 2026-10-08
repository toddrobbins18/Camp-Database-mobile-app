import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import type { LevelRecord } from './swimProgram';
import {
  getSwimProgressLevelDef,
  readNestSkillStatus,
  type SwimProgressReportLevel,
  type SwimProgressSkillDef,
} from './swimProgressSkills';
import { installTextCodecPolyfill } from './textCodecPolyfill';

export type SwimChartCheckbox = {
  skillId: string;
  x: number;
  y: number;
};

type ChartColumnLayout = {
  x: number;
  yStart: number;
  rowStep: number;
  skillIds: string[];
};

export const RED_CROSS_1_CHART = {
  width: 793,
  height: 1024,
  assetFile: 'red-cross-1.jpg',
  columns: [
    { x: 0.06, yStart: 0.193, rowStep: 0.03, skillIds: ['1A1', '1A2', '1A3', '1A4'] },
    { x: 0.402, yStart: 0.193, rowStep: 0.03, skillIds: ['1B1', '1B2', '1B3', '1B4', '1B5', '1B6'] },
    { x: 0.734, yStart: 0.193, rowStep: 0.03, skillIds: ['1C1', '1C2', '1C3', '1C4'] },
  ] satisfies ChartColumnLayout[],
  exitSkills: [
    { skillId: 'EXIT1', x: 0.06, y: 0.786 },
    { skillId: 'EXIT2', x: 0.06, y: 0.854 },
  ],
} as const;

function buildRedCross1Checkboxes(): SwimChartCheckbox[] {
  const { width, height, columns, exitSkills } = RED_CROSS_1_CHART;
  const boxes: SwimChartCheckbox[] = [];
  for (const col of columns) {
    col.skillIds.forEach((skillId, index) => {
      boxes.push({
        skillId,
        x: Math.round(col.x * width),
        y: Math.round((col.yStart + index * col.rowStep) * height),
      });
    });
  }
  for (const exit of exitSkills) {
    boxes.push({
      skillId: exit.skillId,
      x: Math.round(exit.x * width),
      y: Math.round(exit.y * height),
    });
  }
  return boxes;
}

export const RED_CROSS_1_CHECKBOXES = buildRedCross1Checkboxes();

export function getChartCheckboxes(levelId: SwimProgressReportLevel): SwimChartCheckbox[] {
  if (levelId === 'red-cross-1') return RED_CROSS_1_CHECKBOXES;
  return [];
}

const SWIM_CHART_MODULES: Partial<Record<SwimProgressReportLevel, number>> = {
  'red-cross-1': require('../../assets/swim-charts/red-cross-1.jpg'),
};

async function loadChartImage(levelId: SwimProgressReportLevel): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const moduleId = SWIM_CHART_MODULES[levelId];
  if (moduleId == null) {
    throw new Error('No chart asset bundled for this level');
  }
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Chart asset URI missing');

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const width = levelId === 'red-cross-1' ? RED_CROSS_1_CHART.width : 793;
  const height = levelId === 'red-cross-1' ? RED_CROSS_1_CHART.height : 1024;

  return {
    dataUrl: `data:image/jpeg;base64,${base64}`,
    width,
    height,
  };
}

export function listAchievedSkillIds(levelId: SwimProgressReportLevel, levels: LevelRecord): string[] {
  const def = getSwimProgressLevelDef(levelId);
  if (!def) return [];

  const achieved: string[] = [];
  const consider = (skill: SwimProgressSkillDef) => {
    if (!skill.nestKey) return;
    if (readNestSkillStatus(levels, skill.nestKey) === 'A') achieved.push(skill.id);
  };

  for (const group of def.groups) {
    for (const skill of group.skills) consider(skill);
  }
  for (const skill of def.exitSkills ?? []) consider(skill);
  return achieved;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'camper';
}

export type SwimProgressPdfResult =
  | { ready: false; reason: string }
  | { ready: true; filename: string; base64: string; mimeType: 'application/pdf' };

export async function buildSwimProgressPdf(params: {
  levelId: SwimProgressReportLevel;
  levels: LevelRecord;
  childName: string;
}): Promise<SwimProgressPdfResult> {
  const def = getSwimProgressLevelDef(params.levelId);
  if (!def) {
    return { ready: false, reason: 'No chart configured for this level' };
  }

  const checkboxes = getChartCheckboxes(params.levelId);
  if (checkboxes.length === 0) {
    return { ready: false, reason: 'Checkbox layout not configured for this level' };
  }

  try {
    installTextCodecPolyfill();
    const chart = await loadChartImage(params.levelId);
    const achieved = new Set(listAchievedSkillIds(params.levelId, params.levels));

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: chart.width >= chart.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [chart.width, chart.height],
      hotfixes: ['px_scaling'],
    });

    doc.addImage(chart.dataUrl, 'JPEG', 0, 0, chart.width, chart.height);

    doc.setDrawColor(22, 101, 52);
    doc.setLineCap('round');
    for (const box of checkboxes) {
      if (!achieved.has(box.skillId)) continue;
      const size = 16;
      doc.setLineWidth(2.8);
      doc.line(box.x, box.y + size * 0.55, box.x + size * 0.32, box.y + size * 0.88);
      doc.line(box.x + size * 0.32, box.y + size * 0.88, box.x + size * 0.95, box.y + size * 0.12);
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1] ?? '';
    if (!pdfBase64) {
      return { ready: false, reason: 'Failed to encode PDF' };
    }

    const levelLabel = params.levelId.replace('red-cross-', 'Red-Cross-');
    const filename = `${sanitizeFilename(params.childName)}-${levelLabel}-Skills-Chart.pdf`;

    return {
      ready: true,
      filename,
      base64: pdfBase64,
      mimeType: 'application/pdf',
    };
  } catch (err) {
    return {
      ready: false,
      reason: err instanceof Error ? err.message : 'Failed to build skills chart PDF',
    };
  }
}
