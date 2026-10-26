import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  ClassStudentRecord,
  CompetencyPillar,
  COMPETENCY_PILLARS,
} from '../data/presets';
import { Users, Trophy, Crown, ArrowRight, Award } from 'lucide-react';

Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

interface DiagnosticChartsProps {
  studentName: string;
  totalScore: number;
  pillarScores: Record<CompetencyPillar, number>;
  classRoster: ClassStudentRecord[];
}

export const DiagnosticCharts: React.FC<DiagnosticChartsProps> = ({
  studentName,
  totalScore,
  pillarScores,
  classRoster,
}) => {
  const [rankingFilter, setRankingFilter] = useState<'ALL' | '1ª TURMA' | '2ª TURMA'>('ALL');

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cohortCompareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const classDistCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const classRankingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const radarInstanceRef = useRef<Chart | null>(null);
  const cohortCompareInstanceRef = useRef<Chart | null>(null);
  const classDistInstanceRef = useRef<Chart | null>(null);
  const classRankingInstanceRef = useRef<Chart | null>(null);

  // Helper para identificar o registro do Instrutor
  const isInstructor = (s: ClassStudentRecord) =>
    s.id === 'instructor-gregorio' ||
    s.registration === 'INST-CAS-2026' ||
    s.name.toUpperCase().includes('GREGÓRIO') ||
    s.name.toUpperCase().includes('GREGORIO');

  // Efetivo e Métricas por Turma
  const cohortMetrics = useMemo(() => {
    // Alunos reais (excluindo ou incluindo conforme a turma)
    const turma1 = classRoster.filter(
      (s) => !isInstructor(s) && (s.cohort.includes('1ª TURMA') || s.cohort.includes('1ª'))
    );
    const turma2 = classRoster.filter(
      (s) => !isInstructor(s) && (s.cohort.includes('2ª TURMA') || s.cohort.includes('2ª'))
    );

    const calcAvg = (list: ClassStudentRecord[]) =>
      list.length > 0
        ? Math.round(list.reduce((acc, s) => acc + s.score, 0) / list.length)
        : 0;

    const calcPillarAvg = (list: ClassStudentRecord[], pillar: CompetencyPillar) => {
      if (list.length === 0) return 0;
      const sum = list.reduce(
        (acc, s) => acc + (s.pillarScores?.[pillar] ?? s.score),
        0
      );
      return Math.round(sum / list.length);
    };

    const calcPctAdv = (list: ClassStudentRecord[]) =>
      list.length > 0
        ? Math.round(
            (list.filter((s) => s.score >= 80).length / list.length) * 100
          )
        : 0;

    return {
      t1: {
        count: turma1.length,
        avg: calcAvg(turma1),
        pctAdv: calcPctAdv(turma1),
        pillarAvg: COMPETENCY_PILLARS.map((p) => calcPillarAvg(turma1, p)),
      },
      t2: {
        count: turma2.length,
        avg: calcAvg(turma2),
        pctAdv: calcPctAdv(turma2),
        pillarAvg: COMPETENCY_PILLARS.map((p) => calcPillarAvg(turma2, p)),
      },
    };
  }, [classRoster]);

  // Gráfico 1: Radar de Competências nos 4 Pilares (Individual vs Média da Turma)
  useEffect(() => {
    if (!radarCanvasRef.current) return;
    if (radarInstanceRef.current) {
      radarInstanceRef.current.destroy();
    }

    const studentValues = COMPETENCY_PILLARS.map((p) => pillarScores[p] ?? 0);

    const classAvgValues = COMPETENCY_PILLARS.map((p) => {
      if (classRoster.length === 0) return 0;
      const sum = classRoster.reduce((acc, st) => {
        const val = st.pillarScores?.[p];
        return acc + (typeof val === 'number' ? val : st.score);
      }, 0);
      return Math.round(sum / classRoster.length);
    });

    const datasets: any[] = [
      {
        label: 'Seu Perfil de Competência (%)',
        data: studentValues,
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: '#10b981',
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#0f172a',
        pointHoverBackgroundColor: '#ffffff',
        borderWidth: 2.5,
      },
    ];

    if (classRoster.length > 0) {
      datasets.push({
        label: 'Média Geral do CAS (%)',
        data: classAvgValues,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderColor: '#f59e0b',
        pointBackgroundColor: '#f59e0b',
        borderDash: [4, 4],
        borderWidth: 2,
      });
    }

    radarInstanceRef.current = new Chart(radarCanvasRef.current, {
      type: 'radar',
      data: {
        labels: COMPETENCY_PILLARS,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            angleLines: { color: 'rgba(148, 163, 184, 0.2)' },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            pointLabels: {
              color: '#e2e8f0',
              font: { family: 'DM Sans, sans-serif', size: 11, weight: 600 },
            },
            ticks: {
              stepSize: 25,
              backdropColor: 'transparent',
              color: '#94a3b8',
              font: { family: 'IBM Plex Mono, monospace', size: 10 },
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 12,
              color: '#cbd5e1',
              font: { family: 'DM Sans, sans-serif', size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r}%`,
            },
          },
        },
      },
    });

    return () => {
      if (radarInstanceRef.current) {
        radarInstanceRef.current.destroy();
      }
    };
  }, [pillarScores, classRoster]);

  // Gráfico 2: COMPARATIVO ENTRE AS TURMAS (1ª TURMA VS 2ª TURMA)
  useEffect(() => {
    if (!cohortCompareCanvasRef.current) return;
    if (cohortCompareInstanceRef.current) {
      cohortCompareInstanceRef.current.destroy();
    }

    const labels = [
      'Média Geral (pts)',
      'Segurança & Acesso',
      'Normas & Tipos',
      'Documentos & Blocos',
      'Tramitação & Integridade',
    ];

    const dataTurma1 = [
      cohortMetrics.t1.avg,
      ...cohortMetrics.t1.pillarAvg,
    ];

    const dataTurma2 = [
      cohortMetrics.t2.avg,
      ...cohortMetrics.t2.pillarAvg,
    ];

    cohortCompareInstanceRef.current = new Chart(cohortCompareCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `1ª TURMA (${cohortMetrics.t1.count} militares · Média: ${cohortMetrics.t1.avg} pts)`,
            data: dataTurma1,
            backgroundColor: '#10b981',
            borderRadius: 6,
            maxBarThickness: 28,
          },
          {
            label: `2ª TURMA (${cohortMetrics.t2.count} militares · Média: ${cohortMetrics.t2.avg} pts)`,
            data: dataTurma2,
            backgroundColor: '#38bdf8',
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: '#94a3b8',
              font: { family: 'IBM Plex Mono, monospace', size: 10 },
              callback: (v) => `${v}%`,
            },
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { family: 'DM Sans, sans-serif', size: 10 },
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              color: '#cbd5e1',
              font: { family: 'DM Sans, sans-serif', size: 11, weight: 600 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label?.split('(')[0].trim()}: ${ctx.parsed.y} pts/aproveitamento`,
            },
          },
        },
      },
    });

    return () => {
      if (cohortCompareInstanceRef.current) {
        cohortCompareInstanceRef.current.destroy();
      }
    };
  }, [cohortMetrics]);

  // Gráfico 3: Distribuição Geral por Faixa Diagnóstica (Barras)
  useEffect(() => {
    if (!classDistCanvasRef.current) return;
    if (classDistInstanceRef.current) {
      classDistInstanceRef.current.destroy();
    }

    const totalStudents = Math.max(1, classRoster.length);
    const countRecruta = classRoster.filter((s) => s.score <= 49).length;
    const countOperador = classRoster.filter(
      (s) => s.score >= 50 && s.score <= 79
    ).length;
    const countEspecialista = classRoster.filter((s) => s.score >= 80).length;

    classDistInstanceRef.current = new Chart(classDistCanvasRef.current, {
      type: 'bar',
      data: {
        labels: [
          `Soldado Recruta (${Math.round((countRecruta / totalStudents) * 100)}%)`,
          `Operador Prático (${Math.round((countOperador / totalStudents) * 100)}%)`,
          `Especialista SEI (${Math.round((countEspecialista / totalStudents) * 100)}%)`,
        ],
        datasets: [
          {
            label: 'Efetivo de Militares na Faixa',
            data: [countRecruta, countOperador, countEspecialista],
            backgroundColor: ['#f59e0b', '#38bdf8', '#10b981'],
            borderRadius: 8,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#94a3b8',
              font: { family: 'IBM Plex Mono, monospace', size: 11 },
            },
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { family: 'DM Sans, sans-serif', size: 11 },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} militar(es) nesta faixa`,
            },
          },
        },
      },
    });

    return () => {
      if (classDistInstanceRef.current) {
        classDistInstanceRef.current.destroy();
      }
    };
  }, [classRoster]);

  // Lista ordenada de alunos garantindo que o INSTRUTOR (1º SGT GREGÓRIO) É SEMPRE O PRIMEIRO (#1)
  const sortedStudents = useMemo(() => {
    const list = [...classRoster];
    return list.sort((a, b) => {
      const aIsInst = isInstructor(a);
      const bIsInst = isInstructor(b);
      if (aIsInst && !bIsInst) return -1;
      if (!aIsInst && bIsInst) return 1;
      return b.score - a.score;
    });
  }, [classRoster]);

  // Lista filtrada por Turma
  const filteredStudents = useMemo(() => {
    if (rankingFilter === 'ALL') return sortedStudents;
    return sortedStudents.filter(
      (s) => isInstructor(s) || s.cohort.includes(rankingFilter)
    );
  }, [sortedStudents, rankingFilter]);

  // Gráfico 4: Ranking Comparativo dos Alunos (Barras Horizontais)
  useEffect(() => {
    if (!classRankingCanvasRef.current) return;
    if (classRankingInstanceRef.current) {
      classRankingInstanceRef.current.destroy();
    }

    if (filteredStudents.length === 0) {
      if (classRankingInstanceRef.current) {
        classRankingInstanceRef.current.destroy();
        classRankingInstanceRef.current = null;
      }
      return;
    }

    const labels = filteredStudents.map((s) => {
      const name = isInstructor(s)
        ? `★ ${s.name} [INSTRUTOR]`
        : s.name.length > 22
        ? s.name.slice(0, 22) + '…'
        : s.name;
      return name;
    });

    const scores = filteredStudents.map((s) => s.score);
    const barColors = filteredStudents.map((s) => {
      if (isInstructor(s)) return '#f59e0b'; // Dourado Instrutor
      if (studentName.trim() && s.name.toLowerCase() === studentName.trim().toLowerCase()) {
        return '#fbbf24'; // Destaque Amarelo (Você)
      }
      if (s.cohort.includes('2ª TURMA') || s.cohort.includes('2ª')) {
        return '#38bdf8'; // Azul 2ª Turma
      }
      return '#10b981'; // Verde 1ª Turma
    });

    classRankingInstanceRef.current = new Chart(classRankingCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Pontuação Final (0–100)',
            data: scores,
            backgroundColor: barColors,
            borderRadius: 6,
            maxBarThickness: 22,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'IBM Plex Mono, monospace', size: 10 },
              callback: (v) => `${v} pts`,
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { family: 'DM Sans, sans-serif', size: 11 },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Score: ${ctx.parsed.x} / 100 pts`,
            },
          },
        },
      },
    });

    return () => {
      if (classRankingInstanceRef.current) {
        classRankingInstanceRef.current.destroy();
      }
    };
  }, [filteredStudents, studentName]);

  const classAverage =
    classRoster.length > 0
      ? Math.round(
          classRoster.reduce((acc, s) => acc + s.score, 0) / classRoster.length
        )
      : totalScore;

  const totalStudents = classRoster.length;
  const pctAdvanced =
    totalStudents > 0
      ? Math.round(
          (classRoster.filter((s) => s.score >= 80).length / totalStudents) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* CARDS COMPARATIVOS DE CABEÇALHO: 1ª TURMA vs 2ª TURMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 1ª TURMA */}
        <div className="bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-emerald-400 font-mono-num uppercase tracking-wider">
              CAS PMPE 2026 · 1ª TURMA
            </span>
            <span className="text-xs bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60 text-emerald-300 font-semibold">
              {cohortMetrics.t1.count} militares
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-[10px] text-slate-400 block">Média de Pontuação</span>
              <span className="font-mono-num text-2xl font-bold text-white">
                {cohortMetrics.t1.avg} <span className="text-xs text-slate-400">/100 pts</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Especialistas SEI</span>
              <span className="font-mono-num text-lg font-bold text-emerald-400">
                {cohortMetrics.t1.pctAdv}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: 2ª TURMA */}
        <div className="bg-slate-900/90 border border-sky-800/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-sky-400 font-mono-num uppercase tracking-wider">
              CAS PMPE 2026 · 2ª TURMA
            </span>
            <span className="text-xs bg-sky-950 px-2 py-0.5 rounded border border-sky-700/60 text-sky-300 font-semibold">
              {cohortMetrics.t2.count} militares
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-[10px] text-slate-400 block">Média de Pontuação</span>
              <span className="font-mono-num text-2xl font-bold text-white">
                {cohortMetrics.t2.avg} <span className="text-xs text-slate-400">/100 pts</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Especialistas SEI</span>
              <span className="font-mono-num text-lg font-bold text-sky-400">
                {cohortMetrics.t2.pctAdv}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: INSTRUTOR LÍDER */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-600/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-amber-400 font-mono-num uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Instrutor do Curso
            </span>
            <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold">
              1º LUGAR FIXO
            </span>
          </div>
          <div className="mt-1">
            <span className="text-sm font-bold text-white block">
              1º SGT PM GREGÓRIO
            </span>
            <span className="text-[11px] text-slate-400 block">
              Gabarito 100/100 pts · Especialista SEI
            </span>
          </div>
        </div>
      </div>

      {/* LINHA 1: COMPARATIVO ENTRE AS TURMAS (NOVO GRÁFICO SOLICITADO) + RADAR INDIVIDUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRÁFICO COMPARATIVO ENTRE AS TURMAS (1ª TURMA VS 2ª TURMA) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Gráfico Comparativo entre as Turmas
              </span>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">
                1ª TURMA vs 2ª TURMA · Desempenho nos 4 Pilares
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono-num">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 1ª Turma
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> 2ª Turma
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Comparação direta do aproveitamento médio geral e por pilar normativo do SEI entre as turmas do CAS PMPE 2026.
          </p>
          <div className="relative flex-1 min-h-[270px]">
            <canvas ref={cohortCompareCanvasRef} />
          </div>
        </div>

        {/* GRÁFICO 1 · RADAR DE COMPETÊNCIAS INDIVIDUAIS */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="mb-3">
            <span className="text-[11px] font-semibold text-emerald-400">
              Gráfico Individual
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">
              Radar nos 4 Pilares SEI
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Seu perfil comparado à média geral
            </p>
          </div>
          <div className="relative flex-1 min-h-[270px] flex items-center justify-center">
            <canvas ref={radarCanvasRef} />
          </div>
        </div>
      </div>

      {/* LINHA 2: GRÁFICO COMPARATIVO ENTRE OS ALUNOS (RANKING COM FILTROS) */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Comparativo Nominal entre os Alunos
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">
              Ranking Geral de Pontuação (Instrutor 1º SGT Gregório sempre no topo)
            </h3>
          </div>

          {/* Filtros por Turma */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setRankingFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                rankingFilter === 'ALL'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas as Turmas ({classRoster.length})
            </button>
            <button
              type="button"
              onClick={() => setRankingFilter('1ª TURMA')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                rankingFilter === '1ª TURMA'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1ª Turma ({cohortMetrics.t1.count})
            </button>
            <button
              type="button"
              onClick={() => setRankingFilter('2ª TURMA')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                rankingFilter === '2ª TURMA'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2ª Turma ({cohortMetrics.t2.count})
            </button>
          </div>
        </div>

        <div className="relative min-h-[270px]">
          <canvas ref={classRankingCanvasRef} />
        </div>
      </div>

      {/* LINHA 3: DISTRIBUIÇÃO GERAL POR FAIXA DIAGNÓSTICA */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-amber-400">
              Distribuição Geral do Efetivo ({classRoster.length} militares)
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">
              Efetivo por Patente / Faixa Diagnóstica
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Média do Pelotão</span>
            <span className="font-mono-num text-base font-bold text-emerald-400">
              {classAverage} pts · {pctAdvanced}% Avançado
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Quantitativo de militares em Soldado Recruta (0–49), Operador Prático (50–79) e Especialista SEI (80–100)
        </p>
        <div className="relative min-h-[220px]">
          <canvas ref={classDistCanvasRef} />
        </div>
      </div>
    </div>
  );
};
