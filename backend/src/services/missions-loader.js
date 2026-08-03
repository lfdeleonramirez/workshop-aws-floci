import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../missions-config.json');

let config = null;

/**
 * Carga y cachea la configuración de misiones desde el JSON.
 * Se lee una sola vez al iniciar el servidor.
 */
function loadConfig() {
  if (!config) {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    config = JSON.parse(raw);
  }
  return config;
}

/**
 * Fuerza recarga del archivo (útil para hot-reload en desarrollo).
 */
export function reloadConfig() {
  config = null;
  return loadConfig();
}

/**
 * Retorna la lista de misiones con info pública (sin respuestas correctas).
 */
export function getMissions() {
  const { missions } = loadConfig();
  return missions.map(m => ({
    id: m.id,
    title: m.title,
    service: m.service,
    icon: m.icon,
    concepts: m.concepts,
    analogy: m.analogy,
    description: m.description
  }));
}

/**
 * Retorna la configuración completa de una misión por ID.
 */
export function getMissionById(id) {
  const { missions } = loadConfig();
  return missions.find(m => m.id === id) || null;
}

/**
 * Retorna la config pública de una misión (sin respuestas correctas ni scoring interno).
 * Esto es lo que se envía al frontend.
 */
export function getMissionPublicConfig(id) {
  const mission = getMissionById(id);
  if (!mission) return null;

  // Copiar sin campos sensibles
  const { scoring, validation, ...publicData } = mission;

  // Limpiar correctOption/correctAccess/correctRole/correctPorts de los steps
  const cleanSteps = (publicData.steps || []).map(step => {
    const { correctOption, correctAccess, correctRole, correctPorts, insecurePort, ...cleanStep } = step;
    // Limpiar "correct" de las opciones de remediación en misión 5
    if (cleanStep.options) {
      cleanStep.options = cleanStep.options.map(opt => {
        const { correct, ...cleanOpt } = opt;
        return cleanOpt;
      });
    }
    return cleanStep;
  });

  // Limpiar issues (quitar campo correct de remediation options)
  let cleanIssues = undefined;
  if (publicData.issues) {
    cleanIssues = publicData.issues.map(issue => ({
      ...issue,
      remediation: issue.remediation ? {
        question: issue.remediation.question,
        options: issue.remediation.options.map(opt => ({ id: opt.id, label: opt.label }))
      } : undefined
    }));
  }

  return {
    ...publicData,
    steps: cleanSteps,
    ...(cleanIssues ? { issues: cleanIssues } : {})
  };
}

/**
 * Retorna el scoring config de una misión.
 */
export function getMissionScoring(id) {
  const mission = getMissionById(id);
  return mission?.scoring || null;
}

/**
 * Retorna la validation config de una misión.
 */
export function getMissionValidation(id) {
  const mission = getMissionById(id);
  return mission?.validation || null;
}

/**
 * Retorna los issues de la misión 5 con las respuestas correctas (para validación server-side).
 */
export function getRemediationAnswers() {
  const mission5 = getMissionById(5);
  if (!mission5?.issues) return {};

  const answers = {};
  for (const issue of mission5.issues) {
    if (issue.remediation) {
      const correct = issue.remediation.options.find(o => o.correct === true);
      answers[issue.id] = correct?.id || null;
    }
  }
  return answers;
}

/**
 * Retorna la configuración de time bonus.
 */
export function getTimeBonusConfig() {
  const { timeBonus } = loadConfig();
  return timeBonus;
}

/**
 * Retorna la configuración de badges.
 */
export function getBadgesConfig() {
  const { badges } = loadConfig();
  return badges;
}

/**
 * Retorna toda la config (para uso interno del backend, incluye respuestas).
 */
export function getFullConfig() {
  return loadConfig();
}
