import { CompetencyPillar } from '../data/presets';

export interface AchievementBadge {
  id: string;
  title: string;
  englishTag: string;
  description: string;
  requirementText: string;
  unlocked: boolean;
  progressText: string;
  accentColor: 'gold' | 'emerald' | 'cyan' | 'indigo' | 'rose';
  iconName: 'zap' | 'flame' | 'crown' | 'shield' | 'award' | 'clock';
}

export interface AchievementInputMetrics {
  totalScore: number;
  maxStreak: number;
  totalQuestions: number;
  avgTimePerQuestionSec: number;
  fastestQuestionSec: number;
  pillarPercentages: Record<CompetencyPillar, number>;
}

export function evaluateAchievements(
  metrics: AchievementInputMetrics
): AchievementBadge[] {
  const {
    totalScore,
    maxStreak,
    totalQuestions,
    avgTimePerQuestionSec,
    fastestQuestionSec,
    pillarPercentages,
  } = metrics;

  const isFastResponder =
    avgTimePerQuestionSec > 0 && avgTimePerQuestionSec <= 15;
  const isPerfectCombo = maxStreak >= 5;
  const isSeiMaster = totalScore >= 80;
  const isFlawlessPrecision = totalScore === 100;
  const isSecurityGuardian =
    (pillarPercentages['Segurança & Acesso'] ?? 0) === 100 &&
    (pillarPercentages['Normas & Tipos Processuais'] ?? 0) === 100;
  const isLightningReflex = fastestQuestionSec > 0 && fastestQuestionSec <= 6;

  return [
    {
      id: 'fast-responder',
      title: 'Resposta Rápida',
      englishTag: 'Fast Responder',
      description:
        'Tomada de decisão ágil com tempo médio de resposta inferior a 15 segundos por missão.',
      requirementText: 'Média ≤ 15s / questão',
      unlocked: isFastResponder,
      progressText:
        avgTimePerQuestionSec > 0
          ? `Sua média: ${avgTimePerQuestionSec.toFixed(1)}s`
          : 'Média: --',
      accentColor: 'cyan',
      iconName: 'zap',
    },
    {
      id: 'perfect-combo',
      title: 'Combo Perfeito',
      englishTag: 'Perfect Combo',
      description:
        'Manteve sequência ininterrupta de 5 ou mais acertos táticos consecutivos.',
      requirementText: 'Streak ≥ 5x seguidos',
      unlocked: isPerfectCombo,
      progressText: `Melhor Streak: ${maxStreak}x`,
      accentColor: 'gold',
      iconName: 'flame',
    },
    {
      id: 'sei-master',
      title: 'Mestre do SEI',
      englishTag: 'SEI Master',
      description:
        'Alcançou nível de excelência (80 a 100 pontos) na Operação SEI em Foco — PMPE.',
      requirementText: 'Score ≥ 80 pontos',
      unlocked: isSeiMaster,
      progressText: `Score: ${totalScore}/100 pts`,
      accentColor: 'emerald',
      iconName: 'crown',
    },
    {
      id: 'security-guardian',
      title: 'Guardião do Sigilo & 2FA',
      englishTag: 'Security Guardian',
      description:
        'Gabaritou 100% dos pilares de Segurança/Acesso (SIP, NSI, 2FA) e Normas/Sigilo.',
      requirementText: '100% em Segurança e Normas',
      unlocked: isSecurityGuardian,
      progressText: `Segurança: ${pillarPercentages['Segurança & Acesso'] ?? 0}% · Normas: ${pillarPercentages['Normas & Tipos Processuais'] ?? 0}%`,
      accentColor: 'indigo',
      iconName: 'shield',
    },
    {
      id: 'lightning-reflex',
      title: 'Reflexo Tático',
      englishTag: 'Tactical Reflex',
      description:
        'Identificou e cravou uma alternativa correta em até 6 segundos de leitura.',
      requirementText: 'Acerto ≤ 6s em 1 item',
      unlocked: isLightningReflex,
      progressText:
        fastestQuestionSec > 0 && fastestQuestionSec < 999
          ? `Mais rápida: ${fastestQuestionSec.toFixed(1)}s`
          : 'Mais rápida: --',
      accentColor: 'rose',
      iconName: 'clock',
    },
    {
      id: 'flawless-commander',
      title: 'Gabarito Impecável CAS',
      englishTag: 'Flawless Commander',
      description:
        'Concluiu todas as missões da operação com 100% de aproveitamento sem nenhum erro.',
      requirementText: `100 / 100 pontos (${totalQuestions}/${totalQuestions})`,
      unlocked: isFlawlessPrecision,
      progressText: `Acertos: ${Math.round(totalScore / 10)}/${totalQuestions}`,
      accentColor: 'gold',
      iconName: 'award',
    },
  ];
}
