import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Printer,
  Copy,
  Check,
  Download,
  Code2,
  BookOpen,
  Sparkles,
  RotateCcw,
  FileText,
  Trophy,
  Zap,
  Shield,
  Volume2,
  VolumeX,
  Users,
  Plus,
  Flame,
  Crown,
  Award,
  Clock,
  Target,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Share2,
  TrendingUp,
  History,
  Lock,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import {
  PRESET_ASSESSMENTS,
  DiagnosticAssessment,
  DiagnosticQuestion,
  ClassStudentRecord,
  CompetencyPillar,
  COMPETENCY_PILLARS,
  MILITARY_RANKS,
  INSTRUCTOR_RECORD,
  StudentAttemptLog,
} from './data/presets';
import { DiagnosticCharts } from './components/DiagnosticCharts';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { ShareRankModal } from './components/ShareRankModal';
import { StudentProgressModal } from './components/StudentProgressModal';
import { generateStandaloneHtml } from './utils/standaloneHtmlGenerator';
import { soundFX } from './utils/soundEffects';
import { evaluateAchievements, AchievementBadge } from './utils/achievements';

type AppTab = 'assessment' | 'class-board' | 'material-generator' | 'standalone-export';
type QuizStep = 1 | 2 | 3;

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('assessment');
  const [currentAssessment, setCurrentAssessment] = useState<DiagnosticAssessment>(
    PRESET_ASSESSMENTS[0]
  );

  // Helper para identificar o registro do Instrutor (1º SGT PM GREGÓRIO)
  const isInstructor = (s: ClassStudentRecord) =>
    s.id === 'instructor-gregorio' ||
    s.registration === 'INST-CAS-2026' ||
    s.name.toUpperCase().includes('GREGÓRIO') ||
    s.name.toUpperCase().includes('GREGORIO');

  // Pelotão CAS PMPE 2026 (Instrutor 1º SGT PM Gregório SEMPRE presente e em 1º)
  const [classRoster, setClassRoster] = useState<ClassStudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('sei_cas_roster_pmpe_2026');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normaliza se houver 2º SGT GREGÓRIO para 1º SGT PM GREGÓRIO
          parsed = parsed.map((item: ClassStudentRecord) => {
            if (
              item.name.toUpperCase().includes('GREGÓRIO') ||
              item.name.toUpperCase().includes('GREGORIO') ||
              item.id === 'instructor-gregorio'
            ) {
              return {
                ...INSTRUCTOR_RECORD,
                score: 100,
                tier: 'Avançado' as const,
              };
            }
            return item;
          });

          const hasInst = parsed.some((s: ClassStudentRecord) => isInstructor(s));
          if (!hasInst) {
            parsed.unshift(INSTRUCTOR_RECORD);
          }
          return parsed;
        }
      }
    } catch (e) {
      // fallback
    }
    return [INSTRUCTOR_RECORD];
  });

  // Modal e Notificações do Administrador
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sei_cas_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminLoginIntent, setAdminLoginIntent] = useState<'standalone-export' | 'download' | 'reset'>('standalone-export');

  const [showAdminResetModal, setShowAdminResetModal] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState(false);
  const [attemptNotice, setAttemptNotice] = useState<'new' | 'updated'>('new');
  const [tableFilter, setTableFilter] = useState<'ALL' | '1ª TURMA' | '2ª TURMA'>('ALL');

  // Destaque e Animação Fade-in de Atividade Recente no Quadro Geral
  const [recentStudentId, setRecentStudentId] = useState<string | null>(null);
  const [recentStudentName, setRecentStudentName] = useState<string | null>(null);
  const [recentActionType, setRecentActionType] = useState<'new' | 'updated' | null>(null);
  const [recentActionTime, setRecentActionTime] = useState<number | null>(null);
  const [tableAnimationKey, setTableAnimationKey] = useState<number>(0);

  // Áudio e Feedback
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [instantFeedbackMode, setInstantFeedbackMode] = useState(true);

  // Fluxo Game em 3 Telas
  const [step, setStep] = useState<QuizStep>(1);
  const [selectedRank, setSelectedRank] = useState<string>('2º SGT PM');
  const [studentWarName, setStudentWarName] = useState<string>('');
  const [showRankModal, setShowRankModal] = useState<boolean>(false);
  const [studentId, setStudentId] = useState('');
  const [studentCohort, setStudentCohort] = useState<string>('');
  const [nameError, setNameError] = useState(false);
  const [cohortError, setCohortError] = useState(false);

  // Nome completo formatado com a patente/graduação
  const studentName = studentWarName.trim()
    ? `${selectedRank} ${studentWarName.trim()}`
    : selectedRank;

  // Tela 2: Missões e Cronometragem de Velocidade (para Achievement Badges)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questionTimesSec, setQuestionTimesSec] = useState<Record<number, number>>({});
  const [unansweredWarning, setUnansweredWarning] = useState(false);
  const [hitAnimation, setHitAnimation] = useState<'none' | 'correct' | 'wrong'>('none');
  const questionStartRef = useRef<number>(Date.now());
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);

  // Tela 3: Copiar Score, HTML, Confetti de Conquista e Compartilhamento de Patente
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedHtmlCode, setCopiedHtmlCode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalTarget, setShareModalTarget] = useState<ClassStudentRecord | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedProgressStudent, setSelectedProgressStudent] = useState<ClassStudentRecord | null>(null);
  const [currentStudentAttempts, setCurrentStudentAttempts] = useState<StudentAttemptLog[]>([]);

  // Gerador IA a partir da Apostila
  const [customMaterial, setCustomMaterial] = useState(
    PRESET_ASSESSMENTS[0].sourceMaterial
  );
  const [desiredQuestionCount, setDesiredQuestionCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  const questions = currentAssessment.questions;
  const totalQuestions = questions.length;
  const currentQuestion: DiagnosticQuestion = questions[currentQuestionIdx] || questions[0];

  // Atualizar cronômetro da missão ativa
  useEffect(() => {
    if (step !== 2) return;
    questionStartRef.current = Date.now();
    setLiveElapsedSec(0);
    const interval = setInterval(() => {
      if (answers[currentQuestionIdx] === undefined) {
        setLiveElapsedSec(
          Math.floor((Date.now() - questionStartRef.current) / 1000)
        );
      }
    }, 500);
    return () => clearInterval(interval);
  }, [step, currentQuestionIdx, answers]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
  };

  // Cálculo de Métricas, Patentes, Pilares e Achievement Badges
  const results = useMemo(() => {
    let totalScore = 0;
    let correctCount = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let totalTimeSec = 0;
    let answeredCount = 0;
    let fastestCorrectSec = 999;

    const pillarData: Record<
      CompetencyPillar,
      { earned: number; total: number }
    > = {
      'Segurança & Acesso': { earned: 0, total: 0 },
      'Normas & Tipos Processuais': { earned: 0, total: 0 },
      'Documentos & Blocos': { earned: 0, total: 0 },
      'Tramitação & Integridade': { earned: 0, total: 0 },
    };

    const complexityMap: Record<
      string,
      { earned: number; total: number; correct: number; count: number }
    > = {
      'Básica / Conceitual': { earned: 0, total: 0, correct: 0, count: 0 },
      'Intermediária / Aplicação': { earned: 0, total: 0, correct: 0, count: 0 },
      'Avançada / Análise': { earned: 0, total: 0, correct: 0, count: 0 },
    };

    questions.forEach((q, idx) => {
      const selected = answers[idx];
      const isAnswered = selected !== undefined;
      const isCorrect = selected === q.correctIndex;
      const earnedPts = isCorrect ? q.points : 0;
      const qTime = questionTimesSec[idx] ?? 0;

      const pillarKey: CompetencyPillar =
        q.pillar && COMPETENCY_PILLARS.includes(q.pillar)
          ? q.pillar
          : 'Normas & Tipos Processuais';

      pillarData[pillarKey].total += q.points;
      pillarData[pillarKey].earned += earnedPts;

      totalScore += earnedPts;

      if (isAnswered) {
        answeredCount += 1;
        totalTimeSec += qTime > 0 ? qTime : 5;
      }

      if (isCorrect) {
        correctCount += 1;
        currentStreak += 1;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        if (qTime > 0 && qTime < fastestCorrectSec) {
          fastestCorrectSec = qTime;
        }
      } else if (isAnswered) {
        currentStreak = 0;
      }

      if (!complexityMap[q.complexity]) {
        complexityMap[q.complexity] = { earned: 0, total: 0, correct: 0, count: 0 };
      }
      complexityMap[q.complexity].total += q.points;
      complexityMap[q.complexity].earned += earnedPts;
      complexityMap[q.complexity].count += 1;
      if (isCorrect) complexityMap[q.complexity].correct += 1;
    });

    const pillarPercentages: Record<CompetencyPillar, number> = {
      'Segurança & Acesso': 0,
      'Normas & Tipos Processuais': 0,
      'Documentos & Blocos': 0,
      'Tramitação & Integridade': 0,
    };

    COMPETENCY_PILLARS.forEach((p) => {
      const d = pillarData[p];
      pillarPercentages[p] =
        d.total > 0 ? Math.round((d.earned / d.total) * 100) : 0;
    });

    const avgTimePerQuestionSec =
      answeredCount > 0 ? totalTimeSec / answeredCount : 0;

    // Patente / Nível de Intimidade com o Sistema
    let diagnosticTier: {
      code: 'beginner' | 'intermediate' | 'advanced';
      tierShort: 'Iniciante' | 'Intermediário' | 'Avançado';
      patentTitle: string;
      intimacyLevel: string;
      badgeLabel: string;
      glyph: string;
      headline: string;
      feedback: string;
      recommendations: string[];
      colorClasses: string;
    };

    if (totalScore <= 49) {
      diagnosticTier = {
        code: 'beginner',
        tierShort: 'Iniciante',
        patentTitle: 'Soldado Recruta do SEI',
        intimacyLevel: 'Iniciante / Sem Intimidade',
        badgeLabel: 'Soldado Recruta do SEI (0 a 49 pts)',
        glyph: '▲',
        headline:
          'Soldado Recruta do SEI — Iniciante / Sem Intimidade (Necessita Capacitação Básica)',
        feedback:
          'Sua sondagem indica necessidade de capacitação básica nos fluxos essenciais da Documentação Técnica — SEI (Decreto nº 45.157/2017 e Portaria SAD nº 123/2020). Antes de operar processos críticos em ambiente de produção, consolide a base no ambiente de treinamento.',
        recommendations: [
          'Pratique no Ambiente de Treinamento (www.sei4treina.pe.gov.br) a abertura de processos, inclusão de documentos e uso de Blocos Internos.',
          'Revise na apostila DTSEI as regras de assinatura via Expresso.PE, limite de 200 MB com OCR a 300 dpi e Autenticação em 2 Fatores (2FA).',
          'Estude o gabarito técnico comentado abaixo e reinicie a operação para conquistar a patente de Especialista SEI.',
        ],
        colorClasses: 'bg-amber-950/90 border-amber-500 text-amber-300',
      };
    } else if (totalScore <= 79) {
      diagnosticTier = {
        code: 'intermediate',
        tierShort: 'Intermediário',
        patentTitle: 'Operador Prático do SEI',
        intimacyLevel: 'Intermediário / Conhecimento Básico',
        badgeLabel: 'Operador Prático do SEI (50 a 79 pts)',
        glyph: '●',
        headline:
          'Operador Prático do SEI — Intermediário / Conhecimento Básico (Opera Rotinas com Segurança)',
        feedback:
          'Você já opera as rotinas administrativas do SEI PERNAMBUCO com segurança, demonstrando boa base conceitual. Para ascender à patente de Especialista/Gestor SEI, ajuste os detalhes normativos onde houve perda de pontos.',
        recommendations: [
          'Observe no Gráfico Radar qual dos 4 pilares ficou abaixo de 80% e revise os artigos correspondentes da Portaria SAD nº 123/2020.',
          'Reforce a distinção entre Processo Anexado (subordinado/escravo ao Processo Mater) e Processo Relacionado (tramitação independente).',
          'Atente-se às regras de Processo Sigiloso (acesso pessoal via Credenciais de Acesso e ícone de chave) e vedação de exclusão pós-trâmite.',
        ],
        colorClasses: 'bg-sky-950/90 border-sky-500 text-sky-300',
      };
    } else {
      diagnosticTier = {
        code: 'advanced',
        tierShort: 'Avançado',
        patentTitle: 'Especialista / Gestor SEI',
        intimacyLevel: 'Avançado / Com Intimidade',
        badgeLabel: 'Especialista / Gestor SEI (80 a 100 pts)',
        glyph: '★',
        headline:
          'Especialista / Gestor SEI — Avançado / Com Intimidade (Domínio Total dos Fluxos e Regras)',
        feedback:
          'Excelente missão, Sargento! Você demonstrou domínio técnico integral sobre a Apostila de Documentação Técnica — SEI (CAS PMPE 2026), compreendendo desde a governança SIP/NSI até a integridade processual e gestão de sigilo.',
        recommendations: [
          'Atue como multiplicador técnico na sua OME, auxiliando o efetivo no uso de Textos Padrão (@dia@, @ano@) e Blocos de Assinatura em lote.',
          'Auxilie na fiscalização da correta autenticação de documentos "Digitalizados nesta Unidade" (restrita a servidores públicos/comissionados).',
          'Confira suas Insígnias de Conquista (Achievement Badges) desbloqueadas e sua posição no Ranking Geral da Turma!',
        ],
        colorClasses: 'bg-emerald-950/90 border-emerald-500 text-emerald-300',
      };
    }

    const achievementBadges: AchievementBadge[] = evaluateAchievements({
      totalScore,
      maxStreak,
      totalQuestions,
      avgTimePerQuestionSec,
      fastestQuestionSec: fastestCorrectSec === 999 ? 0 : fastestCorrectSec,
      pillarPercentages,
    });

    return {
      totalScore,
      correctCount,
      currentStreak,
      maxStreak,
      avgTimePerQuestionSec,
      fastestCorrectSec: fastestCorrectSec === 999 ? 0 : fastestCorrectSec,
      complexityMap,
      pillarPercentages,
      diagnosticTier,
      achievementBadges,
    };
  }, [questions, answers, questionTimesSec, totalQuestions]);

  const standaloneHtmlCode = useMemo(
    () => generateStandaloneHtml(currentAssessment, classRoster),
    [currentAssessment, classRoster]
  );

  // Iniciar Missão (Tela 1 -> Tela 2)
  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWar = studentWarName.trim();
    const cleanCohort = studentCohort.trim();
    let hasError = false;

    if (!cleanWar) {
      setNameError(true);
      hasError = true;
    } else {
      setNameError(false);
    }

    if (!cleanCohort) {
      setCohortError(true);
      hasError = true;
    } else {
      setCohortError(false);
    }

    if (hasError) {
      soundFX.playWrong();
      return;
    }

    setCurrentQuestionIdx(0);
    setUnansweredWarning(false);
    questionStartRef.current = Date.now();
    soundFX.playSelect();
    setStep(2);
  };

  // Selecionar Alternativa na Tela 2
  const handleSelectOption = (optionIdx: number) => {
    const isFirstSelectionForQuestion = answers[currentQuestionIdx] === undefined;
    if (isFirstSelectionForQuestion) {
      const elapsedSec = Math.max(
        1,
        (Date.now() - questionStartRef.current) / 1000
      );
      setQuestionTimesSec((prev) => ({
        ...prev,
        [currentQuestionIdx]: elapsedSec,
      }));
    }

    const isCorrect = optionIdx === currentQuestion.correctIndex;
    if (instantFeedbackMode) {
      if (isCorrect) {
        soundFX.playCorrect();
        setHitAnimation('correct');
      } else {
        soundFX.playWrong();
        setHitAnimation('wrong');
      }
      setTimeout(() => setHitAnimation('none'), 350);
    } else {
      soundFX.playSelect();
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: optionIdx,
    }));
    setUnansweredWarning(false);
  };

  // Avançar ou Finalizar Operação (Tela 2 -> Tela 3)
  const handleNextQuestion = () => {
    if (answers[currentQuestionIdx] === undefined) {
      setUnansweredWarning(true);
      soundFX.playWrong();
      return;
    }
    setUnansweredWarning(false);
    if (currentQuestionIdx < totalQuestions - 1) {
      soundFX.playSelect();
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      const cleanWar = studentWarName.trim();
      const cleanFullName = `${selectedRank} ${cleanWar}`.trim();
      const cleanReg = studentId.trim();
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const unlockedBadgeTitles = results.achievementBadges
        .filter((b) => b.unlocked)
        .map((b) => `${b.title} (${b.englishTag})`);

      setClassRoster((prev) => {
        // Se o militar já havia feito o teste, a última nota prevalece, mantendo o histórico de progresso!
        const existingIndex = prev.findIndex((item) => {
          if (isInstructor(item)) return false; // Nunca substitui o instrutor
          const matchName = item.name.toLowerCase() === cleanFullName.toLowerCase();
          const matchReg = cleanReg && item.registration && item.registration.toLowerCase() === cleanReg.toLowerCase();
          return matchName || matchReg;
        });

        let updatedList: ClassStudentRecord[];
        let finalHistory: StudentAttemptLog[];

        if (existingIndex >= 0) {
          setAttemptNotice('updated');
          const existing = prev[existingIndex];
          const prevHistory: StudentAttemptLog[] =
            existing.history && existing.history.length > 0
              ? existing.history
              : [
                  {
                    attemptNumber: 1,
                    score: existing.score,
                    tier: existing.tier,
                    patentTitle:
                      existing.score >= 80
                        ? 'Especialista / Gestor SEI'
                        : existing.score >= 50
                        ? 'Operador Prático do SEI'
                        : 'Soldado Recruta do SEI',
                    intimacyLevel:
                      existing.score >= 80
                        ? 'Avançado / Com Intimidade'
                        : existing.score >= 50
                        ? 'Intermediário / Conhecimento Básico'
                        : 'Iniciante / Sem Intimidade',
                    completedAt: existing.completedAt,
                    date: dateStr,
                    avgTimeSec: existing.avgTimeSec,
                    maxStreak: existing.maxStreak,
                    correctCount: Math.round((existing.score / 100) * totalQuestions),
                    totalQuestions,
                    pillarScores: existing.pillarScores,
                  },
                ];

          const newAttemptLog: StudentAttemptLog = {
            attemptNumber: prevHistory.length + 1,
            score: results.totalScore,
            tier: results.diagnosticTier.tierShort,
            patentTitle: results.diagnosticTier.patentTitle,
            intimacyLevel: results.diagnosticTier.intimacyLevel,
            completedAt: timeStr,
            date: dateStr,
            avgTimeSec: Math.round(results.avgTimePerQuestionSec),
            maxStreak: results.maxStreak,
            correctCount: results.correctCount,
            totalQuestions,
            pillarScores: results.pillarPercentages,
            unlockedBadges: unlockedBadgeTitles,
          };

          finalHistory = [...prevHistory, newAttemptLog];
          setCurrentStudentAttempts(finalHistory);

          const updatedStudent: ClassStudentRecord = {
            id: existing.id,
            name: cleanFullName,
            registration: cleanReg || existing.registration || 'CAS-2026',
            cohort: studentCohort.trim() || existing.cohort || 'CAS PMPE 2026 · 1ª TURMA',
            score: results.totalScore,
            tier: results.diagnosticTier.tierShort,
            completedAt: timeStr,
            avgTimeSec: Math.round(results.avgTimePerQuestionSec),
            maxStreak: results.maxStreak,
            pillarScores: results.pillarPercentages,
            attemptsCount: finalHistory.length,
            history: finalHistory,
          };

          const updated = [...prev];
          updated[existingIndex] = updatedStudent;
          updatedList = updated;

          setRecentStudentId(existing.id);
          setRecentStudentName(cleanFullName);
          setRecentActionType('updated');
          setRecentActionTime(Date.now());
          setTableAnimationKey((k) => k + 1);
        } else {
          setAttemptNotice('new');
          const newAttemptLog: StudentAttemptLog = {
            attemptNumber: 1,
            score: results.totalScore,
            tier: results.diagnosticTier.tierShort,
            patentTitle: results.diagnosticTier.patentTitle,
            intimacyLevel: results.diagnosticTier.intimacyLevel,
            completedAt: timeStr,
            date: dateStr,
            avgTimeSec: Math.round(results.avgTimePerQuestionSec),
            maxStreak: results.maxStreak,
            correctCount: results.correctCount,
            totalQuestions,
            pillarScores: results.pillarPercentages,
            unlockedBadges: unlockedBadgeTitles,
          };

          finalHistory = [newAttemptLog];
          setCurrentStudentAttempts(finalHistory);

          const newStudentId = `student-${Date.now()}`;
          const newRecord: ClassStudentRecord = {
            id: newStudentId,
            name: cleanFullName,
            registration: cleanReg || 'CAS-2026',
            cohort: studentCohort.trim() || 'CAS PMPE 2026 · 1ª TURMA',
            score: results.totalScore,
            tier: results.diagnosticTier.tierShort,
            completedAt: timeStr,
            avgTimeSec: Math.round(results.avgTimePerQuestionSec),
            maxStreak: results.maxStreak,
            pillarScores: results.pillarPercentages,
            attemptsCount: 1,
            history: finalHistory,
          };

          const instItem = prev.find(isInstructor) || INSTRUCTOR_RECORD;
          const otherStudents = prev.filter((s) => !isInstructor(s));
          updatedList = [instItem, newRecord, ...otherStudents];

          setRecentStudentId(newStudentId);
          setRecentStudentName(cleanFullName);
          setRecentActionType('new');
          setRecentActionTime(Date.now());
          setTableAnimationKey((k) => k + 1);
        }

        try {
          localStorage.setItem('sei_cas_roster_pmpe_2026', JSON.stringify(updatedList));
        } catch (e) {}
        return updatedList;
      });

      soundFX.playVictory();
      setShowConfetti(true);
      setStep(3);
    }
  };

  const handleSimulateNewStudent = () => {
    const sampleNames = [
      'ALBUQUERQUE',
      'BARBOSA',
      'NASCIMENTO',
      'CAVALCANTI',
      'MEDEIROS',
      'FERREIRA',
      'OLIVEIRA',
      'WANDERLEY',
      'FIGUEIREDO',
    ];
    const sampleRanks = ['2º SGT PM', '3º SGT PM', '1º SGT PM', 'CB PM', '1º TEN PM'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomRank = sampleRanks[Math.floor(Math.random() * sampleRanks.length)];
    const randomScore = [60, 70, 80, 90, 100][Math.floor(Math.random() * 5)];
    const randomCohort =
      Math.random() > 0.5 ? 'CAS PMPE 2026 · 1ª TURMA' : 'CAS PMPE 2026 · 2ª TURMA';
    const cleanFullName = `${randomRank} ${randomName}`;
    const cleanReg = `PM-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = now.toLocaleDateString('pt-BR');
    const newSimId = `student-sim-${Date.now()}`;

    const newAttempt: StudentAttemptLog = {
      attemptNumber: 1,
      score: randomScore,
      tier: randomScore >= 80 ? 'Avançado' : randomScore >= 50 ? 'Intermediário' : 'Iniciante',
      patentTitle:
        randomScore >= 80
          ? 'Especialista / Gestor SEI'
          : randomScore >= 50
          ? 'Operador Prático do SEI'
          : 'Soldado Recruta do SEI',
      intimacyLevel:
        randomScore >= 80
          ? 'Avançado / Com Intimidade'
          : randomScore >= 50
          ? 'Intermediário / Conhecimento Básico'
          : 'Iniciante / Sem Intimidade',
      completedAt: timeStr,
      date: dateStr,
      avgTimeSec: 8,
      maxStreak: Math.floor(randomScore / 10),
      correctCount: Math.round(randomScore / 10),
      totalQuestions: 10,
      pillarScores: {
        'Segurança & Acesso': randomScore,
        'Normas & Tipos Processuais': randomScore,
        'Documentos & Blocos': randomScore,
        'Tramitação & Integridade': randomScore,
      },
    };

    const newSimRecord: ClassStudentRecord = {
      id: newSimId,
      name: cleanFullName,
      registration: cleanReg,
      cohort: randomCohort,
      score: randomScore,
      tier: newAttempt.tier,
      completedAt: timeStr,
      avgTimeSec: 8,
      maxStreak: newAttempt.maxStreak,
      pillarScores: newAttempt.pillarScores,
      attemptsCount: 1,
      history: [newAttempt],
    };

    setClassRoster((prev) => {
      const inst = prev.find(isInstructor) || INSTRUCTOR_RECORD;
      const others = prev.filter((s) => !isInstructor(s));
      const updated = [inst, newSimRecord, ...others];
      try {
        localStorage.setItem('sei_cas_roster_pmpe_2026', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setRecentStudentId(newSimId);
    setRecentStudentName(cleanFullName);
    setRecentActionType('new');
    setRecentActionTime(Date.now());
    setTableAnimationKey((k) => k + 1);
    soundFX.playVictory();
  };

  const handlePrevQuestion = () => {
    setUnansweredWarning(false);
    if (currentQuestionIdx > 0) {
      soundFX.playSelect();
      setCurrentQuestionIdx((prev) => prev - 1);
    }
  };

  const handleAdminResetRoster = () => {
    // Preserva o Instrutor (1º SGT PM GREGÓRIO) e zera as tentativas dos alunos
    const wiped = [INSTRUCTOR_RECORD];
    setClassRoster(wiped);
    try {
      localStorage.setItem('sei_cas_roster_pmpe_2026', JSON.stringify(wiped));
    } catch (e) {}
    setShowAdminResetModal(false);
    setResetSuccessToast(true);
    soundFX.playSelect();
    setTimeout(() => setResetSuccessToast(false), 4000);
  };

  const handleResetQuizForNewPlayer = () => {
    setAnswers({});
    setQuestionTimesSec({});
    setCurrentQuestionIdx(0);
    setUnansweredWarning(false);
    setShowConfetti(false);
    setSelectedRank('2º SGT PM');
    setStudentWarName('');
    setStudentId('');
    setStudentCohort('');
    setNameError(false);
    setCohortError(false);
    setCurrentStudentAttempts([]);
    soundFX.playSelect();
    setStep(1);
  };

  const handleRetrySamePlayer = () => {
    setAnswers({});
    setQuestionTimesSec({});
    setCurrentQuestionIdx(0);
    setUnansweredWarning(false);
    setShowConfetti(false);
    questionStartRef.current = Date.now();
    soundFX.playSelect();
    setStep(2);
  };

  const handleCopyResultSummary = async () => {
    const unlockedBadges = results.achievementBadges
      .filter((b) => b.unlocked)
      .map((b) => `${b.title} (${b.englishTag})`)
      .join(', ');

    const summaryLines = [
      'OPERAÇÃO SEI EM FOCO: DESAFIO DIAGNÓSTICO PMPE (CAS 2026)',
      `Militar: ${studentName}${studentId ? ` (${studentId})` : ''} · ${studentCohort}`,
      `Pontuação Final: ${results.totalScore} / 100 pontos (${results.correctCount}/${totalQuestions} missões)`,
      `Patente Alcançada: ${results.diagnosticTier.patentTitle} (${results.diagnosticTier.intimacyLevel})`,
      `Melhor Combo Streak: ${results.maxStreak}x · Tempo Médio: ${results.avgTimePerQuestionSec.toFixed(1)}s/missão`,
      `Insígnias Desbloqueadas: ${unlockedBadges || 'Nenhuma'}`,
      '',
      'Perfil de Competência nos 4 Pilares:',
      ...COMPETENCY_PILLARS.map(
        (p) => `- ${p}: ${results.pillarPercentages[p]}%`
      ),
    ].join('\n');

    await navigator.clipboard.writeText(summaryLines);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleOpenStandaloneExportTab = () => {
    if (isAdminAuthenticated) {
      setActiveTab('standalone-export');
      soundFX.playSelect();
    } else {
      setAdminLoginIntent('standalone-export');
      setAdminPasswordInput('');
      setAdminLoginError(null);
      setShowAdminLoginModal(true);
      soundFX.playSelect();
    }
  };

  const handleAdminDownloadClick = () => {
    if (isAdminAuthenticated) {
      handleDownloadStandaloneHtml();
    } else {
      setAdminLoginIntent('download');
      setAdminPasswordInput('');
      setAdminLoginError(null);
      setShowAdminLoginModal(true);
      soundFX.playSelect();
    }
  };

  const handleAdminResetClick = () => {
    if (isAdminAuthenticated) {
      setShowAdminResetModal(true);
    } else {
      setAdminLoginIntent('reset');
      setAdminPasswordInput('');
      setAdminLoginError(null);
      setShowAdminLoginModal(true);
      soundFX.playSelect();
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPwd = adminPasswordInput.trim().toLowerCase();
    const acceptedPasswords = [
      'cas2026',
      'pmpe2026',
      'gregorio',
      'gregório',
      '1ºsgt',
      '1sgt',
      'deip',
      'deip2026',
      'admin',
      '123456',
    ];

    if (acceptedPasswords.includes(cleanPwd)) {
      setIsAdminAuthenticated(true);
      try {
        localStorage.setItem('sei_cas_admin_auth', 'true');
      } catch {}
      setShowAdminLoginModal(false);
      setAdminLoginError(null);
      soundFX.playVictory();

      if (adminLoginIntent === 'standalone-export') {
        setActiveTab('standalone-export');
      } else if (adminLoginIntent === 'download') {
        handleDownloadStandaloneHtml();
      } else if (adminLoginIntent === 'reset') {
        setShowAdminResetModal(true);
      }
    } else {
      setAdminLoginError('Senha incorreta. Acesso restrito ao Instrutor / Administrador.');
      soundFX.playWrong();
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem('sei_cas_admin_auth');
    } catch {}
    if (activeTab === 'standalone-export') {
      setActiveTab('assessment');
    }
    soundFX.playSelect();
  };

  const handleDownloadStandaloneHtml = () => {
    const blob = new Blob([standaloneHtmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyStandaloneHtml = async () => {
    await navigator.clipboard.writeText(standaloneHtmlCode);
    setCopiedHtmlCode(true);
    setTimeout(() => setCopiedHtmlCode(false), 2500);
  };

  const handleGenerateFromMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerationError(null);
    setGenerationSuccess(false);

    if (!customMaterial.trim() || customMaterial.trim().length < 30) {
      setGenerationError(
        'Cole ou digite um conteúdo didático com pelo menos 30 caracteres para formular as missões.'
      );
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: customMaterial,
          questionCount: desiredQuestionCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar material didático.');
      }

      const mappedQuestions: DiagnosticQuestion[] = (data.questions || []).map(
        (q: any, i: number) => ({
          ...q,
          pillar: COMPETENCY_PILLARS[i % COMPETENCY_PILLARS.length],
        })
      );

      const generatedAssessment: DiagnosticAssessment = {
        id: `custom-${Date.now()}`,
        title: data.title || 'Operação SEI em Foco: Desafio Diagnóstico PMPE',
        subtitle:
          data.subtitle ||
          'Sondagem gamificada gerada estritamente a partir do material didático fornecido.',
        subjectArea: data.subjectArea || 'CAS PMPE 2026',
        estimatedMinutes: data.estimatedMinutes || 10,
        sourceMaterial: customMaterial,
        questions: mappedQuestions,
        initialClassRoster: classRoster,
      };

      setCurrentAssessment(generatedAssessment);
      setAnswers({});
      setQuestionTimesSec({});
      setCurrentQuestionIdx(0);
      setStep(1);
      setGenerationSuccess(true);
    } catch (err: any) {
      setGenerationError(
        err?.message || 'Ocorreu um erro ao gerar as questões diagnósticas.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const renderBadgeIcon = (iconName: AchievementBadge['iconName']) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-5 h-5" />;
      case 'flame':
        return <Flame className="w-5 h-5" />;
      case 'crown':
        return <Crown className="w-5 h-5" />;
      case 'shield':
        return <Shield className="w-5 h-5" />;
      case 'clock':
        return <Clock className="w-5 h-5" />;
      case 'award':
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const operationProgressPct = Math.round(
    ((currentQuestionIdx + 1) / totalQuestions) * 100
  );
  const optionLetters = ['A', 'B', 'C', 'D'];
  const selectedCurrentAnswer = answers[currentQuestionIdx];
  const unlockedBadgesCount = results.achievementBadges.filter(
    (b) => b.unlocked
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b131e] text-slate-100 pb-20 md:pb-0">
      <ConfettiOverlay
        active={showConfetti}
        score={results.totalScore}
        onComplete={() => setShowConfetti(false)}
      />
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="bg-slate-950/95 border-b border-emerald-900/60 px-4 sm:px-6 py-3.5 sticky top-0 z-30 backdrop-blur-md no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('assessment');
            }}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            CAS 2026 - DT-SEI - INST. 1ºSGT PM GREGÓRIO
          </a>

          {/* Zone 2: 4 Single-Line Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab('assessment')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'assessment'
                  ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Missão Quiz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('class-board')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'class-board'
                  ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Gráficos da Turma
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('material-generator')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'material-generator'
                  ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Apostila DTSEI
            </button>
            <button
              type="button"
              onClick={handleOpenStandaloneExportTab}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 flex items-center gap-1.5 ${
                activeTab === 'standalone-export'
                  ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                  : 'hover:text-white'
              }`}
              title={isAdminAuthenticated ? 'Área do Administrador' : 'Acesso exclusivo do Administrador'}
            >
              {isAdminAuthenticated ? (
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400/80" />
              )}
              <span>Código index.htm</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  isAdminAuthenticated
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                Admin
              </span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (Restrita ao Administrador) */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden xl:flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Ativo
                </span>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
                  title="Bloquear modo administrador"
                >
                  Sair Admin
                </button>
                <button
                  type="button"
                  onClick={handleDownloadStandaloneHtml}
                  className="min-h-[38px] px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-xl hover:bg-amber-300 active:scale-[0.98] transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar index.html</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdminDownloadClick}
                className="min-h-[38px] px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 border border-slate-700 hover:border-amber-400/60 hover:text-white rounded-xl transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                title="Acesso exclusivo ao Administrador"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Baixar index.html (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Banner Tático Corporativo (Verde Policial Militar, Grafite e Dourado) */}
        <div className="mb-6 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-800/60 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs text-amber-400 font-semibold">
                <span>{currentAssessment.subjectArea}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono-num">{totalQuestions} Missões</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono-num">Escala 0–100 pts</span>
              </div>
              <h1 className="font-display text-base sm:text-xl font-bold text-white tracking-tight">
                {currentAssessment.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            {/* Placar Rápido de Operação */}
            <div className="flex items-center gap-3 sm:gap-4 px-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Score</span>
                <span className="font-mono-num font-bold text-emerald-400 text-xs sm:text-sm">
                  {results.totalScore}/100
                </span>
              </div>
              <div className="h-5 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[10px]">Combo</span>
                <span className="font-mono-num font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {results.currentStreak}x
                </span>
              </div>
              <div className="h-5 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[10px]">Insígnias</span>
                <span className="font-mono-num font-bold text-amber-300 text-xs sm:text-sm">
                  {unlockedBadgesCount}/6
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>

              <a
                href="/assets/aistudio/6._APOSTILA_-_DOCUMENTA__O_T_CNICA__DTSEI__beff3a81.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3.5 py-2 bg-slate-900 border border-slate-700 hover:border-amber-400/60 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Apostila PDF</span>
                <span className="sm:hidden">PDF</span>
              </a>
            </div>
          </div>
        </div>

        {/* ABA 1: OPERAÇÃO SEI EM FOCO (3 TELAS) */}
        {activeTab === 'assessment' && (
          <div className="space-y-5">
            {/* Navegador de Telas da Operação */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 no-print">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`min-h-[48px] flex items-center gap-2.5 text-left p-2 rounded-xl transition cursor-pointer ${
                  step === 1
                    ? 'bg-emerald-950/80 border border-emerald-600/50 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center shrink-0 ${
                    step === 1
                      ? 'bg-amber-400 text-slate-950'
                      : step > 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  01
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Briefing</div>
                  <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                    Identificação do Militar
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (studentName.trim()) setStep(2);
                }}
                disabled={!studentName.trim() && step === 1}
                className={`min-h-[48px] flex items-center gap-2.5 text-left p-2 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  step === 2
                    ? 'bg-emerald-950/80 border border-emerald-600/50 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center shrink-0 ${
                    step === 2
                      ? 'bg-amber-400 text-slate-950'
                      : step > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  02
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Missões</div>
                  <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {Object.keys(answers).length}/{totalQuestions} concluídas
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (Object.keys(answers).length === totalQuestions) setStep(3);
                }}
                disabled={Object.keys(answers).length < totalQuestions && step !== 3}
                className={`min-h-[48px] flex items-center gap-2.5 text-left p-2 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  step === 3
                    ? 'bg-emerald-950/80 border border-emerald-600/50 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center shrink-0 ${
                    step === 3
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  03
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Resultados</div>
                  <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                    Insígnias & Gráficos
                  </div>
                </div>
              </button>
            </div>

            {/* TELA 1: BRIEFING INICIAL */}
            {step === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                <section className="lg:col-span-7 bg-slate-900/90 border border-emerald-900/60 rounded-2xl p-5 sm:p-8 shadow-xl">
                  <div className="text-xs font-semibold text-amber-400 mb-2">
                    Tela 1 de 3 · Briefing Inicial da Missão
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                    Credenciamento Tático — CAS PMPE 2026
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                    {currentAssessment.subtitle}
                  </p>

                  <form onSubmit={handleStartQuiz} className="space-y-4 sm:space-y-5">
                    <div>
                      <label
                        htmlFor="student-name-input"
                        className="block text-sm font-medium text-slate-200 mb-1.5"
                      >
                        Nome de Guerra / Identificação do Militar{' '}
                        <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative flex rounded-xl border border-slate-700 bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => setShowRankModal(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-3 bg-emerald-950/80 hover:bg-emerald-900 active:bg-emerald-800 text-amber-400 font-mono-num font-bold text-xs sm:text-sm border-r border-slate-800 transition cursor-pointer select-none shrink-0"
                          title="Clique para abrir a janela flutuante e escolher sua graduação/patente"
                        >
                          <span>{selectedRank}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-amber-400/80" />
                        </button>
                        <input
                          id="student-name-input"
                          type="text"
                          value={studentWarName}
                          onChange={(e) => {
                            setStudentWarName(e.target.value);
                            if (nameError) setNameError(false);
                          }}
                          placeholder="Digite seu Nome de Guerra (ex.: CARLOS EDUARDO)"
                          className="w-full min-h-[48px] px-3.5 py-3 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Toque no botão <strong className="text-amber-400">{selectedRank}</strong> para abrir a janela flutuante e trocar sua graduação ou patente.
                      </p>
                      {nameError && (
                        <p className="text-xs text-rose-400 mt-1.5 font-semibold">
                          Preencha com o Nome de Guerra do militar para iniciar a missão.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="student-id-input"
                          className="block text-sm font-medium text-slate-200 mb-1.5"
                        >
                          Matrícula / Login Expresso.PE{' '}
                          <span className="text-slate-400 font-normal">(opcional)</span>
                        </label>
                        <input
                          id="student-id-input"
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="Ex.: Mat. 112.450-8"
                          className="w-full min-h-[48px] px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="student-cohort-input"
                          className="block text-sm font-medium text-slate-200 mb-1.5"
                        >
                          Pelotão / Turma CAS{' '}
                          <span className="text-rose-400 font-semibold">* (obrigatório)</span>
                        </label>
                        <select
                          id="student-cohort-input"
                          value={studentCohort}
                          onChange={(e) => {
                            setStudentCohort(e.target.value);
                            if (cohortError) setCohortError(false);
                          }}
                          required
                          className={`w-full min-h-[48px] px-4 py-3 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer ${
                            cohortError
                              ? 'border-rose-500 ring-1 ring-rose-500/50'
                              : 'border-slate-700'
                          }`}
                        >
                          <option value="" disabled>-- Selecione o Pelotão / Turma CAS --</option>
                          <option value="CAS PMPE 2026 · 1ª TURMA">CAS PMPE 2026 · 1ª TURMA</option>
                          <option value="CAS PMPE 2026 · 2ª TURMA">CAS PMPE 2026 · 2ª TURMA</option>
                        </select>
                        {cohortError && (
                          <p className="text-xs text-rose-400 mt-1.5 font-semibold">
                            Selecione o Pelotão / Turma CAS do militar para iniciar a missão.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start gap-3 text-xs">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div>
                        <strong className="text-white block font-semibold mb-0.5">Regra de Tentativas Ilimitadas:</strong>
                        <span className="text-slate-300">
                          Os alunos podem realizar a sondagem diagnóstica quantas vezes for necessário. Prevalecerá sempre a <strong>última nota obtida</strong> no Quadro Geral da Turma.
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          Feedback Explicativo Imediato nas Missões
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Exibe o artigo/diretriz da apostila DTSEI assim que você escolhe uma alternativa
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInstantFeedbackMode(!instantFeedbackMode)}
                        className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          instantFeedbackMode
                            ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {instantFeedbackMode ? 'Ativado' : 'Só no Final'}
                      </button>
                    </div>

                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800">
                      <span className="text-xs text-slate-400">
                        Responda com precisão e agilidade para desbloquear as 6 Insígnias Táticas.
                      </span>
                      <button
                        type="submit"
                        className="w-full sm:w-auto min-h-[50px] px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 whitespace-nowrap"
                      >
                        Iniciar Missão
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </section>

                {/* Card Lateral: Patentes e Insígnias de Conquista */}
                <aside className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                      <Trophy className="w-4 h-4" />
                      <span>Patentes e Níveis de Intimidade SEI</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-white mb-2">
                      Escala de Classificação CAS PMPE 2026
                    </h3>
                    <div className="space-y-2.5 text-xs mt-3">
                      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-amber-300 block">
                            ▲ Soldado Recruta do SEI
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Iniciante / Sem Intimidade — Capacitação básica
                          </span>
                        </div>
                        <span className="font-mono-num font-bold text-amber-300 whitespace-nowrap">
                          0–49 pts
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-700/50 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-sky-300 block">
                            ● Operador Prático do SEI
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Intermediário — Opera rotinas com segurança
                          </span>
                        </div>
                        <span className="font-mono-num font-bold text-sky-300 whitespace-nowrap">
                          50–79 pts
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/50 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-emerald-300 block">
                            ★ Especialista / Gestor SEI
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Avançado / Com Intimidade — Domínio total
                          </span>
                        </div>
                        <span className="font-mono-num font-bold text-emerald-300 whitespace-nowrap">
                          80–100 pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preview das Achievement Badges */}
                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <div className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>Insígnias Desbloqueáveis na Missão:</span>
                      <span className="text-[11px] text-amber-400 font-mono-num">
                        6 Medalhas
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">Fast Responder (≤15s)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Perfect Combo (5x+)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                        <Crown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">SEI Master (80+ pts)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Guardião do Sigilo</span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* TELA 2: PAINEL INTERATIVO DE MISSÕES (QUIZ) */}
            {step === 2 && currentQuestion && (
              <section
                className={`max-w-3xl mx-auto bg-slate-900/95 border rounded-2xl p-5 sm:p-9 shadow-xl transition-transform duration-200 ${
                  hitAnimation === 'correct'
                    ? 'border-emerald-500 scale-[1.005]'
                    : hitAnimation === 'wrong'
                    ? 'border-rose-500'
                    : 'border-emerald-900/60'
                }`}
              >
                {/* Barras Duplas: Progresso da Operação + Nível de Intimidade */}
                <div className="mb-6 bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Barra 1: Progresso da Operação */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">
                          Progresso da Operação
                        </span>
                        <span className="font-mono-num font-bold text-white">
                          Missão {currentQuestionIdx + 1}/{totalQuestions} ({operationProgressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-200"
                          style={{ width: `${operationProgressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Barra 2: Nível de Intimidade com o Sistema */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">
                          Nível de Intimidade SEI
                        </span>
                        <span className="font-mono-num font-bold text-amber-400">
                          {results.diagnosticTier.patentTitle} ({results.totalScore} pts)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 transition-all duration-200"
                          style={{ width: `${results.totalScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metadados da Questão e Cronômetro Tático */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-slate-300 font-medium">
                      <span className="text-amber-400 font-semibold">
                        {currentQuestion.pillar}
                      </span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{currentQuestion.topic}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className="text-slate-400">{currentQuestion.complexity}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono-num">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {questionTimesSec[currentQuestionIdx] !== undefined
                          ? `${questionTimesSec[currentQuestionIdx].toFixed(1)}s`
                          : `${liveElapsedSec}s`}
                      </span>
                      <span className="font-bold text-emerald-400">
                        +{currentQuestion.points} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enunciado da Missão */}
                <div className="mb-6">
                  <h2 className="font-display text-base sm:text-xl font-bold text-white leading-relaxed">
                    {currentQuestion.stem}
                  </h2>
                </div>

                {/* 4 Alternativas Táticas (Touch Hitbox >= 52px) */}
                <div className="space-y-3 mb-6" role="radiogroup">
                  {currentQuestion.options.map((optionText, idx) => {
                    const isSelected = selectedCurrentAnswer === idx;
                    const showResolved =
                      instantFeedbackMode && selectedCurrentAnswer !== undefined;
                    const isRightOption = idx === currentQuestion.correctIndex;

                    let cardStyle =
                      'border-slate-700 bg-slate-950/70 hover:border-slate-500 hover:bg-slate-950 text-slate-200';
                    let badgeStyle = 'bg-slate-800 text-slate-400';

                    if (showResolved) {
                      if (isRightOption) {
                        cardStyle =
                          'border-emerald-500 bg-emerald-950/60 text-white ring-1 ring-emerald-500';
                        badgeStyle = 'bg-emerald-500 text-slate-950';
                      } else if (isSelected && !isRightOption) {
                        cardStyle =
                          'border-rose-500 bg-rose-950/60 text-rose-100 ring-1 ring-rose-500';
                        badgeStyle = 'bg-rose-500 text-white';
                      }
                    } else if (isSelected) {
                      cardStyle =
                        'border-amber-400 bg-emerald-950/50 text-white ring-1 ring-amber-400';
                      badgeStyle = 'bg-amber-400 text-slate-950';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full min-h-[54px] text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 cursor-pointer active:scale-[0.99] ${cardStyle}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                        >
                          {optionLetters[idx] || idx + 1}
                        </span>
                        <span className="text-xs sm:text-base leading-relaxed flex-1">
                          {optionText}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Justificativa Técnica Imediata citando Artigo/Diretriz da Apostila */}
                {instantFeedbackMode && selectedCurrentAnswer !== undefined && (
                  <div
                    className={`mb-6 p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                      selectedCurrentAnswer === currentQuestion.correctIndex
                        ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-100'
                        : 'bg-amber-950/60 border-amber-600/80 text-amber-100'
                    }`}
                  >
                    <strong className="block font-bold text-white mb-1">
                      {selectedCurrentAnswer === currentQuestion.correctIndex
                        ? `✓ Ação Tática Correta (+${currentQuestion.points} pontos · Respondida em ${(questionTimesSec[currentQuestionIdx] || 1).toFixed(1)}s)`
                        : '▲ Correção Técnica Obrigatória — Diretriz da Apostila DTSEI:'}
                    </strong>
                    {currentQuestion.explanation}
                  </div>
                )}

                {unansweredWarning && (
                  <div className="mb-6 px-4 py-3 rounded-xl bg-amber-950/80 border border-amber-600 text-xs text-amber-200 font-medium">
                    Selecione uma das 4 alternativas para registrar sua decisão antes de avançar.
                  </div>
                )}

                {/* Navegação Mobile-First Ergonomic Buttons */}
                <div className="pt-5 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIdx === 0}
                    className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  {/* Seletor Rápido Desktop */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    {questions.map((q, idx) => {
                      const isCurrent = idx === currentQuestionIdx;
                      const isAnswered = answers[idx] !== undefined;
                      const isCorrect = answers[idx] === q.correctIndex;
                      let dotClass = 'bg-slate-800 text-slate-400 hover:bg-slate-700';
                      if (isCurrent) {
                        dotClass = 'bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300';
                      } else if (isAnswered) {
                        dotClass = instantFeedbackMode
                          ? isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                          : 'bg-emerald-900 text-emerald-200';
                      }
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            setUnansweredWarning(false);
                            setCurrentQuestionIdx(idx);
                          }}
                          title={`Missão ${idx + 1}`}
                          className={`w-7 h-7 rounded-lg font-mono-num text-xs transition cursor-pointer ${dotClass}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] rounded-xl transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-md shadow-emerald-950/50"
                  >
                    <span>
                      {currentQuestionIdx === totalQuestions - 1
                        ? 'Concluir & Ver Resultado'
                        : 'Avançar Fase'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* TELA 3: PAINEL DE RESULTADOS, ACHIEVEMENT BADGES & GRÁFICOS DA TURMA */}
            {step === 3 && (
              <div className="space-y-6 sm:space-y-8">
                {/* Card Principal: Patente Individual, Score e Insígnias de Conquista */}
                <section className="bg-slate-900/90 border border-emerald-800/70 rounded-2xl p-5 sm:p-8 shadow-xl">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                    <div>
                      <div className="text-xs text-amber-400 font-semibold mb-1">
                        <span>Patente Diagnóstica: {results.diagnosticTier.patentTitle}</span>
                        <span className="mx-2" aria-hidden="true">·</span>
                        <span className="font-mono-num">
                          {new Date().toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                        {studentName || 'Militar Avaliado'}
                      </h2>
                      <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {studentId && <span>{studentId}</span>}
                        {studentCohort && <span>· {studentCohort}</span>}
                        <span>
                          · Acertos:{' '}
                          <strong className="font-mono-num text-white">
                            {results.correctCount}/{totalQuestions}
                          </strong>
                        </span>
                        <span>
                          · Melhor Combo:{' '}
                          <strong className="font-mono-num text-amber-400">
                            {results.maxStreak}x
                          </strong>
                        </span>
                        <span>
                          · Velocidade Média:{' '}
                          <strong className="font-mono-num text-cyan-400">
                            {results.avgTimePerQuestionSec.toFixed(1)}s/missão
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5">
                      <div>
                        <span className="block text-xs text-slate-400">
                          Score da Operação
                        </span>
                        <div className="font-mono-num text-3xl sm:text-4xl font-bold text-white">
                          {results.totalScore}
                          <span className="text-lg font-normal text-slate-400"> / 100</span>
                        </div>
                      </div>

                      <div
                        className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-bold ${results.diagnosticTier.colorClasses}`}
                      >
                        <span className="mr-1.5" aria-hidden="true">
                          {results.diagnosticTier.glyph}
                        </span>
                        {results.diagnosticTier.badgeLabel}
                      </div>
                    </div>
                  </div>

                  {/* SISTEMA DE INSÍGNIAS DE CONQUISTA (ACHIEVEMENT BADGES) */}
                  <div className="py-6 border-b border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div>
                        <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                          <Trophy className="w-4 h-4" />
                          <span>Achievement Badges · Insígnias de Desempenho Tático</span>
                        </span>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white mt-0.5">
                          Conquistas Desbloqueadas na Missão
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-num text-xs font-semibold text-emerald-400">
                          {unlockedBadgesCount} de {results.achievementBadges.length} Conquistadas
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfetti(false);
                            setTimeout(() => setShowConfetti(true), 20);
                            soundFX.playVictory();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/40 hover:bg-amber-400/25 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer no-print"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Celebrar Conquista
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {results.achievementBadges.map((badge) => {
                        const unlockedStyles: Record<
                          AchievementBadge['accentColor'],
                          string
                        > = {
                          cyan: 'bg-cyan-950/40 border-cyan-500/70 text-cyan-100',
                          gold: 'bg-amber-950/40 border-amber-400/80 text-amber-100',
                          emerald:
                            'bg-emerald-950/40 border-emerald-500/80 text-emerald-100',
                          indigo:
                            'bg-indigo-950/40 border-indigo-500/80 text-indigo-100',
                          rose: 'bg-rose-950/40 border-rose-500/80 text-rose-100',
                        };

                        const iconStyles: Record<
                          AchievementBadge['accentColor'],
                          string
                        > = {
                          cyan: 'bg-cyan-400 text-slate-950',
                          gold: 'bg-amber-400 text-slate-950',
                          emerald: 'bg-emerald-400 text-slate-950',
                          indigo: 'bg-indigo-400 text-slate-950',
                          rose: 'bg-rose-400 text-slate-950',
                        };

                        return (
                          <div
                            key={badge.id}
                            className={`p-4 rounded-xl border transition flex items-start gap-3.5 ${
                              badge.unlocked
                                ? unlockedStyles[badge.accentColor]
                                : 'bg-slate-950/50 border-slate-800/80 text-slate-500 opacity-60'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                badge.unlocked
                                  ? iconStyles[badge.accentColor]
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {renderBadgeIcon(badge.iconName)}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-display text-xs sm:text-sm font-bold text-white truncate">
                                  {badge.title}
                                </h4>
                                <span className="text-[10px] font-mono-num text-slate-400 shrink-0">
                                  {badge.englishTag}
                                </span>
                              </div>
                              <p className="text-[11px] leading-snug opacity-90">
                                {badge.description}
                              </p>
                              <div className="pt-1 flex items-center justify-between text-[10px] font-mono-num">
                                <span
                                  className={
                                    badge.unlocked
                                      ? 'text-amber-300 font-bold'
                                      : 'text-slate-500'
                                  }
                                >
                                  {badge.unlocked ? '★ DESBLOQUEADA' : '🔒 Bloqueada'}
                                </span>
                                <span>{badge.progressText}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diagnóstico e Barras dos 4 Pilares */}
                  <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                    <div className="lg:col-span-7 space-y-4">
                      <div>
                        <h3 className="font-display text-base font-bold text-white mb-1.5">
                          {results.diagnosticTier.headline}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {results.diagnosticTier.feedback}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-amber-400 mb-2">
                          Plano de Ação Recomendado (CAS PMPE 2026):
                        </h4>
                        <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                          {results.diagnosticTier.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="font-mono-num font-bold text-emerald-400">
                                0{i + 1}.
                              </span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-3.5">
                      <div className="text-xs font-bold text-white">
                        Domínio nos 4 Pilares da Apostila DTSEI
                      </div>
                      <div className="space-y-3 text-xs">
                        {COMPETENCY_PILLARS.map((pillar) => {
                          const pct = results.pillarPercentages[pillar] ?? 0;
                          return (
                            <div key={pillar}>
                              <div className="flex justify-between text-slate-300 mb-1">
                                <span>{pillar}</span>
                                <span className="font-mono-num font-bold text-white">
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    pct >= 80
                                      ? 'bg-emerald-500'
                                      : pct >= 50
                                      ? 'bg-sky-400'
                                      : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Progresso do Aluno nas Etapas & Histórico de Tentativas */}
                  <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Progresso do Aluno nas Etapas & Tentativas
                        </span>
                        <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono-num">
                          {currentStudentAttempts.length || 1} {(currentStudentAttempts.length || 1) === 1 ? 'tentativa' : 'tentativas'}
                        </span>
                      </div>

                      {currentStudentAttempts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgressStudent({
                              id: 'current-player',
                              name: studentName,
                              registration: studentId,
                              cohort: studentCohort,
                              score: results.totalScore,
                              tier: results.diagnosticTier.tierShort,
                              completedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                              pillarScores: results.pillarPercentages,
                              attemptsCount: currentStudentAttempts.length,
                              history: currentStudentAttempts,
                            });
                            setShowProgressModal(true);
                          }}
                          className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Ver Linha do Tempo Completa</span>
                        </button>
                      )}
                    </div>

                    {/* Resumo da Linha de Evolução */}
                    {currentStudentAttempts.length > 1 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">1ª Tentativa (Base):</span>
                          <span className="font-mono-num font-bold text-slate-200">
                            {currentStudentAttempts[0]?.score ?? results.totalScore} pts
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Última Tentativa (Atual):</span>
                          <span className="font-mono-num font-bold text-emerald-400">
                            {results.totalScore} pts
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Evolução Conquistada:</span>
                          <span
                            className={`font-mono-num font-bold ${
                              results.totalScore - (currentStudentAttempts[0]?.score ?? results.totalScore) >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {results.totalScore - (currentStudentAttempts[0]?.score ?? results.totalScore) >= 0 ? '+' : ''}
                            {results.totalScore - (currentStudentAttempts[0]?.score ?? results.totalScore)} pts
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Esta é a sua 1ª tentativa registrada. Você pode refazer a missão quantas vezes desejar para acompanhar sua evolução rumo à patente de Especialista SEI — cada nova etapa ficará guardada no seu histórico!
                      </p>
                    )}
                  </div>

                  {/* Aviso de Registro e Prevalência da Última Nota */}
                  <div className={`mt-4 p-4 rounded-xl border flex items-start sm:items-center gap-3 text-xs leading-relaxed ${
                    attemptNotice === 'updated'
                      ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                      : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                  }`}>
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
                    <div className="flex-1">
                      <strong className="block text-white font-semibold">
                        {attemptNotice === 'updated'
                          ? 'Pontuação Atualizada no Quadro da Turma!'
                          : 'Tentativa Registrada com Sucesso!'}
                      </strong>
                      <span>
                        {attemptNotice === 'updated'
                          ? `Sua nova nota (${results.totalScore} pts) substituiu a tentativa anterior no ranking. Você pode realizar o teste quantas vezes desejar — prevalecerá sempre a última nota.`
                          : `Sua nota (${results.totalScore} pts) está gravada no quadro da turma. Você pode refazer a missão a qualquer momento — sua última nota sempre prevalecerá.`}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação com Botão de Compartilhamento em Destaque */}
                  <div className="pt-6 mt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleRetrySamePlayer}
                        className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Refaça o teste para tentar uma nota superior (a última prevalecerá)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Refazer Missão (Atualizar Nota)
                      </button>

                      <button
                        type="button"
                        onClick={handleResetQuizForNewPlayer}
                        className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700 hover:bg-emerald-900 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Novo Militar da Turma
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                      {/* BOTÃO PRINCIPAL DE COMPARTILHAMENTO DA PATENTE E ESCALA CAS PMPE 2026 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShareModalTarget({
                            id: 'current-player',
                            name: studentName,
                            registration: studentId,
                            cohort: studentCohort,
                            score: results.totalScore,
                            tier: results.diagnosticTier.tierShort,
                            completedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                            pillarScores: results.pillarPercentages,
                            attemptsCount: currentStudentAttempts.length || 1,
                            history: currentStudentAttempts,
                          });
                          setShowShareModal(true);
                        }}
                        className="flex-1 sm:flex-initial min-h-[46px] px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/60 ring-1 ring-amber-500/50"
                        title="Compartilhar sua Patente e Escala de Classificação CAS PMPE 2026"
                      >
                        <Share2 className="w-4 h-4 text-slate-950" />
                        <span>Compartilhar Minha Classificação SEI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('class-board');
                          soundFX.playSelect();
                        }}
                        className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/60 hover:bg-emerald-900/80 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        title="Ver sua posição no Quadro Geral de Classificação com animação de destaque suave"
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Ver no Quadro Geral da Turma</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyResultSummary}
                        className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2.5 text-xs font-bold text-slate-200 bg-slate-950 border border-slate-700 hover:bg-slate-800 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Score Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Meu Score
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Exportar Relatório PDF
                      </button>

                      <button
                        type="button"
                        onClick={handleAdminResetClick}
                        className="min-h-[46px] px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Zerar dados da turma e simulações para primeiro uso oficial (Acesso restrito ao Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Zerar Turma (Admin)
                      </button>
                    </div>

                    {/* Chancela Oficial DEIP */}
                    <div className="w-full text-center pt-3 pb-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="font-mono-num text-amber-400/90 font-medium">
                        Chancela oficial: CAS 2026 - DT-SEI - INST. 1ºSGT PM GREGÓRIO · Polícia Militar de Pernambuco (DEIP)
                      </span>
                    </div>
                  </div>
                </section>

                {/* Banner de Confirmação com Atalho Direto para o Quadro Geral */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/70 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 text-xs animate-table-fade-in shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-white text-xs sm:text-sm">
                      Resultado de <strong className="text-amber-400">{studentName}</strong> registrado com sucesso no <strong>Quadro Geral de Classificação da Turma</strong>!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('class-board');
                      soundFX.playSelect();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <span>Conferir no Quadro Geral</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Gráficos Chart.js: Radar Individual + Distribuição e Ranking da Turma */}
                <DiagnosticCharts
                  studentName={studentName}
                  totalScore={results.totalScore}
                  pillarScores={results.pillarPercentages}
                  classRoster={classRoster}
                />

                {/* Gabarito Técnico Comentado Item a Item */}
                <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8">
                  <div className="mb-6">
                    <h3 className="font-display text-lg font-bold text-white">
                      Gabarito Técnico Comentado — Revisão das 10 Missões
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fundamentação estrita no Decreto Estadual nº 45.157/2017, Portaria SAD nº 123/2020 e Apostila DTSEI
                    </p>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {questions.map((q, idx) => {
                      const selectedIdx = answers[idx];
                      const isCorrect = selectedIdx === q.correctIndex;
                      const qTime = questionTimesSec[idx];
                      return (
                        <div key={q.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="text-slate-400 font-medium">
                              <span className="font-mono-num font-bold text-white">
                                Missão 0{idx + 1}
                              </span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span className="text-amber-400">{q.pillar}</span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{q.topic}</span>
                            </div>

                            <div className="flex items-center gap-3 font-mono-num">
                              {qTime !== undefined && (
                                <span className="text-slate-400 text-[11px]">
                                  {qTime.toFixed(1)}s
                                </span>
                              )}
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  isCorrect ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isCorrect ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />+{q.points} pts
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />0/{q.points} pts
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm font-semibold text-white leading-snug">
                            {q.stem}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div
                              className={`p-3 rounded-xl border ${
                                isCorrect
                                  ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
                                  : 'bg-rose-950/50 border-rose-700 text-rose-200'
                              }`}
                            >
                              <span className="block font-semibold text-white mb-0.5">
                                Sua Resposta:
                              </span>
                              {selectedIdx !== undefined
                                ? `(${optionLetters[selectedIdx]}) ${q.options[selectedIdx]}`
                                : 'Não respondida'}
                            </div>

                            {!isCorrect && (
                              <div className="p-3 rounded-xl border bg-emerald-950/50 border-emerald-700 text-emerald-200">
                                <span className="block font-semibold text-white mb-0.5">
                                  Gabarito Oficial DTSEI:
                                </span>
                                ({optionLetters[q.correctIndex]}) {q.options[q.correctIndex]}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-slate-300 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 leading-relaxed">
                            <strong className="text-amber-400">
                              Diretriz da Apostila:{' '}
                            </strong>
                            {q.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: GRÁFICOS GERAIS E LEADERBOARD DA TURMA */}
        {activeTab === 'class-board' && (
          <div className="space-y-6 sm:space-y-8">
            <DiagnosticCharts
              studentName={studentName || classRoster[0]?.name || ''}
              totalScore={results.totalScore || classRoster[0]?.score || 80}
              pillarScores={
                Object.keys(answers).length > 0
                  ? results.pillarPercentages
                  : classRoster[0]?.pillarScores || {
                      'Segurança & Acesso': 100,
                      'Normas & Tipos Processuais': 100,
                      'Documentos & Blocos': 100,
                      'Tramitação & Integridade': 67,
                    }
              }
              classRoster={classRoster}
            />

            <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span>Efetivo Avaliado · CAS PMPE 2026</span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                    Quadro Geral de Classificação da Turma ({classRoster.length} Militares)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tentativas ilimitadas: cada militar pode refazer o desafio quantas vezes for necessário, prevalecendo sempre a última nota.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start">
                  <button
                    type="button"
                    onClick={() => {
                      handleResetQuizForNewPlayer();
                      setActiveTab('assessment');
                    }}
                    className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Avaliar Novo Militar
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateNewStudent}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-600/50 hover:bg-amber-900/50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Adicionar rapidamente um resultado para ver o efeito visual de fade-in e destaque tático"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Simular Novo Aluno (Testar Fade-In)
                  </button>

                  <button
                    type="button"
                    onClick={handleAdminResetClick}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/70 hover:bg-rose-900/60 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    title="Zerar resultados e limpar todas as notas da turma (Acesso restrito ao Admin)"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Zerar Turma (Admin)
                  </button>
                </div>
              </div>

              {/* Banner de Destaque de Atividade Recente no Quadro Geral */}
              {recentActionTime && recentStudentName && (
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-emerald-950/70 border border-amber-500/60 flex flex-wrap items-center justify-between gap-3 text-xs animate-table-fade-in shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                          Atividade Recente Registrada
                        </span>
                      </div>
                      <p className="text-white font-medium text-xs sm:text-sm mt-0.5">
                        <strong className="text-amber-300">{recentStudentName}</strong>
                        {recentActionType === 'updated'
                          ? ' acabou de atualizar sua pontuação no desafio e sua posição foi recalculada!'
                          : ' concluiu a missão diagnóstica e foi posicionado no Quadro de Classificação!'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] text-amber-300 font-mono-num bg-slate-950/80 px-2.5 py-1 rounded-md border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Destaque Ativo
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentStudentId(null);
                        setRecentActionTime(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                      title="Dispensar destaque"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Filtrar por Turma:</span>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setTableFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        tableFilter === 'ALL'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas as Turmas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableFilter('1ª TURMA')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        tableFilter === '1ª TURMA'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1ª Turma
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableFilter('2ª TURMA')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        tableFilter === '2ª TURMA'
                          ? 'bg-sky-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2ª Turma
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-amber-400 font-mono-num flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  1º Lugar Fixo: 1º SGT PM GREGÓRIO (Instrutor)
                </div>
              </div>

              {/* Tabela com Animação Suave de Fade-In e Destaque de Atividade Recente */}
              <div
                key={`class-roster-container-${tableAnimationKey}-${tableFilter}`}
                className="overflow-x-auto rounded-xl border border-slate-800/90 bg-slate-950/40 p-1 animate-table-fade-in shadow-inner"
              >
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs">
                      <th className="py-3 px-3 sm:px-4 font-semibold">Pos.</th>
                      <th className="py-3 px-3 sm:px-4 font-semibold">Nome de Guerra</th>
                      <th className="py-3 px-3 sm:px-4 font-semibold hidden sm:table-cell">
                        Matrícula
                      </th>
                      <th className="py-3 px-3 sm:px-4 font-semibold">Turma</th>
                      <th className="py-3 px-3 sm:px-4 font-semibold">Patente SEI</th>
                      <th className="py-3 px-3 sm:px-4 font-semibold text-center hidden md:table-cell">
                        Tentativas / Progresso
                      </th>
                      <th className="py-3 px-3 sm:px-4 font-semibold text-right">Última Nota</th>
                      <th className="py-3 px-3 sm:px-4 font-semibold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {[...classRoster]
                      .sort((a, b) => {
                        const aIsInst = isInstructor(a);
                        const bIsInst = isInstructor(b);
                        if (aIsInst && !bIsInst) return -1;
                        if (!aIsInst && bIsInst) return 1;
                        return b.score - a.score;
                      })
                      .filter((s) => isInstructor(s) || (tableFilter === 'ALL' ? true : s.cohort.includes(tableFilter)))
                      .map((student, idx) => {
                        const isInst = isInstructor(student);
                        const isCurrentPlayer =
                          !isInst &&
                          studentName.trim() &&
                          student.name.toLowerCase() === studentName.trim().toLowerCase();
                        const isRecent = student.id === recentStudentId;

                        const attemptsCount = student.attemptsCount || student.history?.length || 1;
                        const firstScore = student.history?.[0]?.score ?? student.score;
                        const scoreGain = student.score - firstScore;

                        let rowClass = 'hover:bg-slate-950/50 text-slate-200 transition-colors animate-row-item';
                        if (isInst) {
                          rowClass = 'bg-amber-950/30 text-white border-l-4 border-amber-400 font-semibold';
                          if (isRecent) {
                            rowClass += ' ring-2 ring-amber-400/80 animate-row-recent shadow-lg shadow-amber-950/60';
                          }
                        } else if (isRecent) {
                          rowClass =
                            'bg-amber-400/20 text-white font-semibold border-l-4 border-amber-400 ring-2 ring-amber-400/70 animate-row-recent shadow-lg shadow-amber-950/60';
                        } else if (isCurrentPlayer) {
                          rowClass =
                            'bg-amber-400/10 text-white font-semibold border-l-2 border-amber-400/50 animate-row-item';
                        }

                        return (
                          <tr
                            key={student.id}
                            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                            className={rowClass}
                          >
                            <td className="py-3.5 px-3 sm:px-4 font-mono-num font-bold">
                              {isInst ? (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Crown className="w-3.5 h-3.5" /> #1
                                </span>
                              ) : (
                                <span className="text-slate-400">#{idx + 1}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 font-semibold text-white">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{student.name}</span>
                                {isInst && (
                                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                    Instrutor
                                  </span>
                                )}
                                {isRecent && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse-glow">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {recentActionType === 'updated' ? 'Nota Atualizada' : 'Atividade Recente'}
                                  </span>
                                )}
                                {isCurrentPlayer && !isRecent && (
                                  <span className="text-[11px] text-amber-400 font-mono-num">
                                    (Você)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 font-mono-num text-slate-400 hidden sm:table-cell">
                              {student.registration}
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-slate-300">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                student.cohort.includes('2ª')
                                  ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              }`}>
                                {student.cohort}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 sm:px-4">
                              <span
                                className={`font-semibold ${
                                  student.score >= 80
                                    ? 'text-emerald-400'
                                    : student.score >= 50
                                    ? 'text-sky-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {student.score >= 80
                                  ? '★ Especialista SEI'
                                  : student.score >= 50
                                  ? '● Operador Prático'
                                  : '▲ Soldado Recruta'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-center hidden md:table-cell">
                              <span className="font-mono-num text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                                {attemptsCount} {attemptsCount === 1 ? 'tentativa' : 'tentativas'}
                                {attemptsCount > 1 && scoreGain !== 0 && (
                                  <span className={`ml-1 font-bold ${scoreGain > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ({scoreGain > 0 ? `+${scoreGain}` : scoreGain} pts)
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-right font-mono-num font-bold text-white">
                              {student.score} pts
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProgressStudent(student);
                                    setShowProgressModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Ver histórico de progresso e tentativas em cada etapa"
                                >
                                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShareModalTarget(student);
                                    setShowShareModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/35 border border-amber-400/40 text-amber-300 transition cursor-pointer"
                                  title="Ver e compartilhar escala de patentes e certificação"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Chancela Oficial DEIP no Quadro da Turma */}
              <div className="pt-4 pb-1 text-center border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-mono-num text-amber-400/90 font-medium">
                  Chancela oficial: CAS 2026 - DT-SEI - INST. 1ºSGT PM GREGÓRIO · Polícia Militar de Pernambuco (DEIP)
                </span>
              </div>
            </section>
          </div>
        )}

        {/* ABA 3: APOSTILA DTSEI & GERADOR DE NOVAS MISSÕES */}
        {activeTab === 'material-generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            <section className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Base de Conhecimento Oficial · Apostila DTSEI (PMPE)</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                Documentação Técnica — SEI (CAS PMPE 2026)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Todos os 8 eixos exigidos (Legislação, SIP/NSI, 2FA, Nato-digital vs. Digitalizado, Público/Restrito/Sigiloso, Anexado vs. Relacionado, Blocos e Texto Padrão) estão sintetizados abaixo. Você também pode gerar novas baterias de questões a partir deste material.
              </p>

              <form onSubmit={handleGenerateFromMaterial} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="material-textarea"
                      className="block text-sm font-medium text-slate-200"
                    >
                      Conteúdo Técnico da Apostila <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-xs font-mono-num text-slate-400">
                      {customMaterial.length} caracteres
                    </span>
                  </div>
                  <textarea
                    id="material-textarea"
                    rows={12}
                    value={customMaterial}
                    onChange={(e) => setCustomMaterial(e.target.value)}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="question-count-select"
                      className="text-xs font-medium text-slate-300"
                    >
                      Total de Missões:
                    </label>
                    <select
                      id="question-count-select"
                      value={desiredQuestionCount}
                      onChange={(e) => setDesiredQuestionCount(Number(e.target.value))}
                      className="min-h-[42px] px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono-num font-semibold text-white"
                    >
                      <option value={6}>6 missões (100 pts)</option>
                      <option value={8}>8 missões (100 pts)</option>
                      <option value={10}>10 missões (100 pts)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="min-h-[48px] px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating
                      ? 'Formulando Missões Táticas...'
                      : 'Gerar Nova Bateria de Missões'}
                  </button>
                </div>

                {generationError && (
                  <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-700 text-xs text-rose-200">
                    {generationError}
                  </div>
                )}

                {generationSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-emerald-200">
                      <strong className="font-semibold block text-white">
                        Nova operação gerada com sucesso!
                      </strong>
                      {currentAssessment.questions.length} missões prontas para aplicação.
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('assessment')}
                      className="min-h-[40px] px-4 py-2 bg-amber-400 text-slate-950 text-xs font-bold rounded-lg hover:bg-amber-300 cursor-pointer"
                    >
                      Iniciar Operação
                    </button>
                  </div>
                )}
              </form>
            </section>

            <aside className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">
                Banco de Missões Ativo ({totalQuestions})
              </h3>
              <div className="divide-y divide-slate-800 max-h-[460px] overflow-y-auto pr-1">
                {questions.map((q, i) => (
                  <div key={q.id} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-mono-num font-bold text-amber-400">
                        M0{i + 1} · {q.topic}
                      </span>
                      <span className="font-mono-num text-emerald-400 font-bold">
                        +{q.points} pts
                      </span>
                    </div>
                    <p className="text-slate-200 font-medium line-clamp-2">{q.stem}</p>
                    <span className="block text-[10px] text-slate-400">{q.pillar}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* ABA 4: EXPORTAÇÃO DO ARQUIVO HTML ÚNICO (EXCLUSIVA PARA O ADMINISTRADOR) */}
        {activeTab === 'standalone-export' && (
          isAdminAuthenticated ? (
            <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Área do Administrador · Acesso Autorizado (Instrutor 1º SGT PM Gregório)</span>
                  </div>
                  <h2 className="font-display text-lg sm:text-2xl font-bold text-white">
                    Código <code className="font-mono-num text-base bg-slate-950 px-2 py-0.5 rounded text-emerald-400">index.htm</code> — Operação SEI em Foco
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Arquivo 100% autocontido (HTML5 + Tailwind CDN + Chart.js CDN), responsivo para celular e desktop, com Chancela Oficial DEIP.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleAdminLogout}
                    className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Bloquear sessão administrativa"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Bloquear Admin
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyStandaloneHtml}
                    className="min-h-[42px] px-4 py-2 text-xs font-bold text-slate-200 bg-slate-950 border border-slate-700 hover:bg-slate-800 rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    {copiedHtmlCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        HTML Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Código HTML
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStandaloneHtml}
                    className="min-h-[42px] px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40"
                  >
                    <FileText className="w-4 h-4" />
                    Salvar como index.html
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="w-full max-h-[520px] overflow-auto p-4 sm:p-5 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 font-mono-num text-xs leading-relaxed">
                  <code>{standaloneHtmlCode}</code>
                </pre>
              </div>

              {/* Chancela Oficial DEIP */}
              <div className="pt-3 pb-1 text-center border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-mono-num text-amber-400/90 font-medium">
                  Chancela oficial: CAS 2026 - DT-SEI - INST. 1ºSGT PM GREGÓRIO · Polícia Militar de Pernambuco (DEIP)
                </span>
              </div>
            </section>
          ) : (
            <section className="bg-slate-900/90 border border-rose-900/60 rounded-2xl p-6 sm:p-12 text-center max-w-lg mx-auto space-y-6 animate-in fade-in shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/60 border border-rose-700/60 flex items-center justify-center text-rose-400 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                  Acesso Restrito ao Administrador
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  A aba <strong>"Código index.htm"</strong> e a exportação do código-fonte completo são de visualização exclusiva do Instrutor e Administradores da DEIP / PMPE.
                </p>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-3 max-w-sm mx-auto text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  Senha Administrativa:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminLoginError) setAdminLoginError(null);
                    }}
                    placeholder="Digite a senha (ex: cas2026)..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    Acessar
                  </button>
                </div>
                {adminLoginError && (
                  <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {adminLoginError}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Dica de instrução: senha padrão <span className="text-amber-400/80 font-mono">cas2026</span>
                </p>
              </form>

              <div className="pt-4 border-t border-slate-800 flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('assessment')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para Missão Quiz
                </button>
              </div>
            </section>
          )
        )}
      </main>

      {/* Rodapé Institucional Oficial PMPE / DEIP */}
      <footer className="mt-12 py-6 px-4 text-center border-t border-slate-800 text-xs text-slate-400 no-print pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-1.5">
          <p className="text-amber-400 font-semibold tracking-wide">
            Polícia Militar de Pernambuco · Diretoria de Ensino, Instrução e Pesquisa (DEIP)
          </p>
          <p className="text-[11px] text-slate-300 font-mono-num font-medium">
            Chancela oficial: CAS 2026 - DT-SEI - INST. 1ºSGT PM GREGÓRIO · Polícia Militar de Pernambuco (DEIP)
          </p>
          <p className="text-[10px] text-slate-500">
            Curso de Aperfeiçoamento de Sargentos (CAS PMPE 2026) · Sistema Eletrônico de Informações (SEI)
          </p>
        </div>
      </footer>

      {/* Fixed Bottom Navigation Bar for Mobile Ergonomics (<= 10% viewport height) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-16 px-2 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('assessment')}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition ${
            activeTab === 'assessment' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Target className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Missão</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('class-board')}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition ${
            activeTab === 'class-board' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Turma ({classRoster.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('material-generator')}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition ${
            activeTab === 'material-generator' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Apostila</span>
        </button>

        <button
          type="button"
          onClick={handleOpenStandaloneExportTab}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition ${
            activeTab === 'standalone-export' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          {isAdminAuthenticated ? (
            <Code2 className="w-5 h-5 text-amber-400" />
          ) : (
            <Lock className="w-5 h-5 text-slate-400" />
          )}
          <span className="text-[10px] mt-1 tracking-tight flex items-center gap-0.5">
            index.htm
            {!isAdminAuthenticated && (
              <span className="text-[8px] text-amber-400 font-bold">🔒</span>
            )}
          </span>
        </button>
      </nav>

      {/* Janela Flutuante (Modal) para Seleção de Graduação / Patente */}
      {showRankModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowRankModal(false)}
        >
          <div
            className="bg-slate-900 border border-emerald-700/60 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Escolha sua Graduação / Patente
                  </h3>
                  <p className="text-[11px] text-slate-400">Polícia Militar de Pernambuco (PMPE)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRankModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MILITARY_RANKS.map((rank) => (
                <button
                  key={rank}
                  type="button"
                  onClick={() => {
                    setSelectedRank(rank);
                    setShowRankModal(false);
                    soundFX.playSelect();
                  }}
                  className={`p-2.5 rounded-xl border text-left font-mono-num font-semibold text-xs transition cursor-pointer flex items-center justify-between ${
                    selectedRank === rank
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-lg shadow-amber-950/50'
                      : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{rank}</span>
                  {selectedRank === rank && <Check className="w-3.5 h-3.5 text-slate-950" />}
                </button>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 text-center border-t border-slate-800">
              Graduação padrão do CAS: <strong className="text-amber-400">2º SGT PM</strong>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autenticação do Administrador (Proteção de Código index.htm e Zeramento) */}
      {showAdminLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowAdminLoginModal(false)}
        >
          <div
            className="bg-slate-900 border border-emerald-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Autenticação do Administrador
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {adminLoginIntent === 'standalone-export'
                      ? 'Acesso restrito à aba Código index.htm'
                      : adminLoginIntent === 'download'
                      ? 'Download restrito do arquivo index.html'
                      : 'Permissão para Zerar Dados da Turma'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta funcionalidade é exclusiva para o <strong>Instrutor (1º SGT PM GREGÓRIO)</strong> e coordenação do CAS da DEIP / PMPE. Digite a senha administrativa para liberar o acesso.
            </p>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha do Administrador:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminLoginError) setAdminLoginError(null);
                    }}
                    placeholder="Digite a senha (ex: cas2026)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {adminLoginError && (
                <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminLoginError}</span>
                </p>
              )}

              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Dica (ambiente de instrução):</span>
                <button
                  type="button"
                  onClick={() => setAdminPasswordInput('cas2026')}
                  className="text-amber-400 hover:underline font-mono text-[11px] cursor-pointer"
                >
                  Usar "cas2026"
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Liberar Acesso Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Zerar Dados da Turma (Admin) */}
      {showAdminResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-900/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Zerar Dados da Turma (Admin)
                </h3>
                <span className="text-[11px] text-slate-400">Ação administrativa de limpeza</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Você tem certeza que deseja <strong>zerar todos os resultados e registros</strong> da turma?
              Esta ação removerá todas as notas salvas no navegador, deixando o aplicativo pronto para o primeiro uso oficial.
            </p>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-amber-300">
              💡 <strong>Regra Mantida:</strong> Os alunos continuarão podendo realizar o teste quantas vezes for necessário, prevalecendo sempre a última nota registrada de cada um.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminResetModal(false)}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdminResetRoster}
                className="min-h-[42px] px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/60"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar e Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Confirmação de Zeramento */}
      {resetSuccessToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-emerald-950 border border-emerald-600 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Quadro da turma zerado com sucesso! Pronto para a primeira aplicação.</span>
        </div>
      )}

      {/* Modal de Compartilhamento de Patente e Escala de Classificação CAS PMPE 2026 */}
      <ShareRankModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setShareModalTarget(null);
        }}
        studentName={shareModalTarget?.name || studentName}
        registration={shareModalTarget?.registration || studentId}
        cohort={shareModalTarget?.cohort || studentCohort}
        score={shareModalTarget?.score ?? results.totalScore}
        pillarScores={shareModalTarget?.pillarScores || results.pillarPercentages}
        patentTitle={
          shareModalTarget
            ? shareModalTarget.score >= 80
              ? 'Especialista / Gestor SEI'
              : shareModalTarget.score >= 50
              ? 'Operador Prático do SEI'
              : 'Soldado Recruta do SEI'
            : results.diagnosticTier.patentTitle
        }
        intimacyLevel={
          shareModalTarget
            ? shareModalTarget.score >= 80
              ? 'Avançado / Com Intimidade'
              : shareModalTarget.score >= 50
              ? 'Intermediário / Conhecimento Básico'
              : 'Iniciante / Sem Intimidade'
            : results.diagnosticTier.intimacyLevel
        }
        tierShort={
          shareModalTarget
            ? shareModalTarget.score >= 80
              ? 'Avançado'
              : shareModalTarget.score >= 50
              ? 'Intermediário'
              : 'Iniciante'
            : results.diagnosticTier.tierShort
        }
        unlockedBadges={
          shareModalTarget
            ? shareModalTarget.history?.[shareModalTarget.history.length - 1]?.unlockedBadges || []
            : results.achievementBadges.filter((b) => b.unlocked)
        }
        history={shareModalTarget?.history || currentStudentAttempts}
      />

      {/* Modal de Histórico de Progresso do Aluno */}
      <StudentProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedProgressStudent(null);
        }}
        student={selectedProgressStudent}
        onOpenShareModal={(s) => {
          setShareModalTarget(s);
          setShowShareModal(true);
        }}
      />
    </div>
  );
}
