import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { material, questionCount = 8 } = req.body;
    if (!material || typeof material !== 'string' || material.trim().length < 30) {
      return res.status(400).json({
        error: 'Forneça um material didático válido (mínimo de 30 caracteres) para gerar as questões diagnósticas.',
      });
    }

    const numQuestions = Math.min(Math.max(Number(questionCount) || 8, 6), 10);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Atue como especialista em avaliação educacional e design instrucional.
Com base EXCLUSIVAMENTE no material didático fornecido abaixo, elabore um Teste de Sondagem Diagnóstica contendo exatamente ${numQuestions} questões de múltipla escolha.

Diretrizes obrigatórias:
1. Extraia as questões estritamente dos conceitos centrais do material fornecido.
2. Distribua as questões nos três níveis de complexidade:
   - "Básica / Conceitual" (aprox. 35% das questões)
   - "Intermediária / Aplicação" (aprox. 35% das questões)
   - "Avançada / Análise" (aprox. 30% das questões)
3. Cada questão deve ter exatamente 4 alternativas claras e plausíveis, com apenas 1 correta (índice 0 a 3).
4. Atribua pesos (points) inteiros para cada questão de modo que a soma exata de todas as ${numQuestions} questões seja igual a 100 pontos.
5. Inclua uma justificativa pedagógica ("explanation") explicando por que a alternativa correta é a adequada segundo o material.

MATERIAL DIDÁTICO FORNECIDO:
"""
${material.slice(0, 30000)}
"""`,
      config: {
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Título formal da Sondagem Diagnóstica baseado no tema do material.',
            },
            subtitle: {
              type: Type.STRING,
              description: 'Subtítulo descritivo resumindo o escopo pedagógico avaliado.',
            },
            subjectArea: {
              type: Type.STRING,
              description: 'Área do conhecimento ou disciplina (ex: Engenharia de Software, Biologia Celular, Gestão Ágil).',
            },
            estimatedMinutes: {
              type: Type.INTEGER,
              description: 'Tempo estimado de resolução em minutos.',
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  topic: {
                    type: Type.STRING,
                    description: 'Tópico específico ou eixo temático curto (máx 4 palavras) para agrupamento nos gráficos.',
                  },
                  complexity: {
                    type: Type.STRING,
                    description: 'Deve ser exatamente um destes: "Básica / Conceitual", "Intermediária / Aplicação" ou "Avançada / Análise".',
                  },
                  points: {
                    type: Type.INTEGER,
                    description: 'Valor da questão em pontos (a soma de todas as questões deve ser exatamente 100).',
                  },
                  stem: {
                    type: Type.STRING,
                    description: 'Enunciado completo, contextualizado e claro da questão.',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exatamente 4 alternativas de resposta (sem letras A/B/C/D no início).',
                  },
                  correctIndex: {
                    type: Type.INTEGER,
                    description: 'Índice da alternativa correta (0, 1, 2 ou 3).',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Explicação didática detalhada do gabarito com base no material.',
                  },
                },
                required: ['id', 'topic', 'complexity', 'points', 'stem', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['title', 'subtitle', 'subjectArea', 'estimatedMinutes', 'questions'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('O modelo não retornou dados válidos.');
    }

    const parsed = JSON.parse(rawText);

    // Garantir que a soma dos pontos seja exatamente 100
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      const count = parsed.questions.length;
      const basePoints = Math.floor(100 / count);
      let remainder = 100 - basePoints * count;
      parsed.questions = parsed.questions.map((q: any, idx: number) => {
        const extra = idx >= count - remainder ? 1 : 0;
        return {
          ...q,
          id: idx + 1,
          options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
          correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
          points: basePoints + extra,
        };
      });
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Erro ao gerar sondagem:', error);
    return res.status(500).json({
      error: error?.message || 'Não foi possível gerar a sondagem diagnóstica a partir do material.',
    });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
