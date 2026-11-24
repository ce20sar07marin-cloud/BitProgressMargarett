import {
  loadState,
  saveState,
  DBLeccion,
  DBEvaluacion,
  DBPregunta,
  DBRespuesta,
  DBProgreso,
  LessonSummary,
  DBLeccionCompleta,
  EvalSummary,
} from "./storageDatabase";

export type {
  DBLeccion,
  DBEvaluacion,
  DBPregunta,
  DBRespuesta,
  DBProgreso,
  LessonSummary,
  DBLeccionCompleta,
  EvalSummary,
};

const TOTAL_LECCIONES = 9;

export async function getLecciones(_db?: any): Promise<DBLeccion[]> {
  const state = loadState();
  return state.Leccion.filter((l) => l.estado === 1);
}

export async function getLeccionById(
  _db: any,
  id: number
): Promise<DBLeccion | null> {
  const state = loadState();
  return state.Leccion.find((l) => l.id_leccion === Number(id)) || null;
}

export async function getEvaluaciones(_db?: any): Promise<DBEvaluacion[]> {
  const state = loadState();
  return state.Evaluacion;
}

export async function getEvaluacionById(
  _db: any,
  id: number
): Promise<DBEvaluacion | null> {
  const state = loadState();
  return state.Evaluacion.find((e) => e.id_evaluacion === Number(id)) || null;
}

export async function getEvaluacionByLeccionId(
  _db: any,
  leccionId: number
): Promise<DBEvaluacion | null> {
  const state = loadState();
  return state.Evaluacion.find((e) => e.id_leccion === Number(leccionId)) || null;
}

export async function getPreguntas(
  _db: any,
  evaluacionId: number
): Promise<DBPregunta[]> {
  const state = loadState();
  return state.Pregunta.filter((p) => p.id_evaluacion === Number(evaluacionId)).sort(
    (a, b) => a.orden_pregunta - b.orden_pregunta
  );
}

export async function getRespuestas(
  _db: any,
  preguntaId: number
): Promise<DBRespuesta[]> {
  const state = loadState();
  return state.Respuesta.filter((r) => r.id_pregunta === Number(preguntaId));
}

export async function getProgresoUsuario(
  _db: any,
  usuarioId: number
): Promise<DBProgreso[]> {
  const state = loadState();
  return state.Progreso.filter((p) => p.id_usuario === Number(usuarioId));
}

export async function getProgresoLeccion(
  _db: any,
  usuarioId: number,
  leccionId: number
): Promise<DBProgreso | null> {
  const state = loadState();
  return (
    state.Progreso.find(
      (p) => p.id_usuario === Number(usuarioId) && p.id_leccion === Number(leccionId)
    ) || null
  );
}

function sanitizeNonNegativeInt(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
}

function sanitizePercentageScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export async function saveLeccionCompletada(
  _db: any,
  usuarioId: number,
  leccionId: number,
  xpGanado: number
): Promise<void> {
  const safeUserId = Number(usuarioId);
  const safeLeccionId = Number(leccionId);
  if (!Number.isFinite(safeUserId) || !Number.isFinite(safeLeccionId)) {
    throw new Error("Invalid user or lesson ID.");
  }
  const safeXp = sanitizeNonNegativeInt(xpGanado, 0);

  const state = loadState();
  const existingIndex = state.Progreso.findIndex(
    (p) => p.id_usuario === safeUserId && p.id_leccion === safeLeccionId
  );

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = state.Progreso[existingIndex];
    state.Progreso[existingIndex] = {
      ...existing,
      leccion_completada: 1,
      puntuacion: Math.max(sanitizeNonNegativeInt(existing.puntuacion, 0), safeXp),
      fecha_completado: now,
    };
  } else {
    const maxId = state.Progreso.reduce((m, p) => Math.max(m, p.id_progreso || 0), 0);
    state.Progreso.push({
      id_progreso: maxId + 1,
      id_usuario: safeUserId,
      id_leccion: safeLeccionId,
      leccion_completada: 1,
      evaluacion_aprobada: 0,
      puntuacion: safeXp,
      fecha_completado: now,
    });
  }

  await saveState(state);
}

export async function saveEvaluacionCompletada(
  _db: any,
  usuarioId: number,
  leccionId: number,
  puntuacion: number,
  aprobada: boolean
): Promise<void> {
  const safeUserId = Number(usuarioId);
  const safeLeccionId = Number(leccionId);
  if (!Number.isFinite(safeUserId) || !Number.isFinite(safeLeccionId)) {
    throw new Error("Invalid user or lesson ID.");
  }
  const safeScore = sanitizePercentageScore(puntuacion);
  const safeApproved = Boolean(aprobada);

  const state = loadState();
  const existingIndex = state.Progreso.findIndex(
    (p) => p.id_usuario === safeUserId && p.id_leccion === safeLeccionId
  );

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = state.Progreso[existingIndex];
    const prevScore =
      typeof existing.puntuacion_evaluacion === "number" &&
      Number.isFinite(existing.puntuacion_evaluacion)
        ? sanitizePercentageScore(existing.puntuacion_evaluacion)
        : 0;
    state.Progreso[existingIndex] = {
      ...existing,
      evaluacion_aprobada: existing.evaluacion_aprobada === 1 || safeApproved ? 1 : 0,
      puntuacion_evaluacion: Math.max(prevScore, safeScore),
      fecha_completado: now,
    };
  } else {
    const maxId = state.Progreso.reduce((m, p) => Math.max(m, p.id_progreso || 0), 0);
    state.Progreso.push({
      id_progreso: maxId + 1,
      id_usuario: safeUserId,
      id_leccion: safeLeccionId,
      leccion_completada: 0,
      evaluacion_aprobada: safeApproved ? 1 : 0,
      puntuacion_evaluacion: safeScore,
      puntuacion: 0,
      fecha_completado: now,
    });
  }

  await saveState(state);
}

export async function updateUsuarioXP(
  _db: any,
  usuarioId: number,
  xpTotal: number
): Promise<void> {
  const safeUserId = Number(usuarioId);
  if (!Number.isFinite(safeUserId)) return;
  const safeXpTotal = sanitizeNonNegativeInt(xpTotal, 0);

  const state = loadState();
  const user = state.Usuario.find((u) => u.id_usuario === safeUserId);
  if (user) {
    user.xp_total = safeXpTotal;
    await saveState(state);
  }
}

export async function getUsuario(
  _db: any,
  usuarioId: number
): Promise<{ xp_total: number } | null> {
  const state = loadState();
  const user = state.Usuario.find((u) => u.id_usuario === Number(usuarioId));
  return user ? { xp_total: user.xp_total } : null;
}

export async function getLeccionesCompletadasCount(
  _db: any,
  usuarioId: number
): Promise<number> {
  const state = loadState();
  const activeLessonIds = new Set(
    state.Leccion.filter((lesson) => lesson.estado === 1).map((lesson) => lesson.id_leccion),
  );
  const completedLessonIds = new Set(
    state.Progreso
      .filter(
        (progress) =>
          progress.id_usuario === Number(usuarioId) &&
          progress.leccion_completada === 1 &&
          activeLessonIds.has(progress.id_leccion),
      )
      .map((progress) => progress.id_leccion),
  );
  return Math.min(completedLessonIds.size, TOTAL_LECCIONES);
}

export async function isLeccionCompletada(
  _db: any,
  titulo: string,
  usuarioId: number
): Promise<boolean> {
  const state = loadState();
  const leccion = state.Leccion.find((l) => l.titulo === titulo);
  if (!leccion) return false;

  const prog = state.Progreso.find(
    (p) => p.id_usuario === Number(usuarioId) && p.id_leccion === leccion.id_leccion
  );
  return prog?.leccion_completada === 1;
}

export async function isLeccionCompletadaByExternalId(
  _db: any,
  externalId: string,
  usuarioId: number
): Promise<boolean> {
  const state = loadState();
  const leccion = state.Leccion.find((l) => l.external_id === externalId);
  if (!leccion) return false;

  const prog = state.Progreso.find(
    (p) => p.id_usuario === Number(usuarioId) && p.id_leccion === leccion.id_leccion
  );
  return prog?.leccion_completada === 1;
}

export async function getLeccionesResumen(
  _db?: any
): Promise<LessonSummary[]> {
  const state = loadState();
  return state.Leccion.filter((l) => l.estado === 1).map((l) => ({
    external_id: l.external_id,
    titulo: l.titulo,
    nivel: l.nivel,
  }));
}

export async function getLeccionByExternalId(
  _db: any,
  externalId: string
): Promise<DBLeccionCompleta | null> {
  const state = loadState();
  const found = state.Leccion.find((l) => l.external_id === externalId);
  if (!found) return null;
  return {
    ...found,
    pages_json: found.contenido,
  };
}

export async function getEvaluacionesResumen(
  _db?: any
): Promise<EvalSummary[]> {
  const state = loadState();
  const leccionMap = new Map(state.Leccion.map((l) => [l.id_leccion, l]));

  return state.Evaluacion.map((e) => {
    const leccion = leccionMap.get(e.id_leccion);
    return {
      id_evaluacion: e.id_evaluacion,
      external_id: leccion?.external_id ?? "",
      titulo: e.titulo,
      nivel: leccion?.nivel ?? "basic",
      id_leccion: e.id_leccion,
    };
  });
}

export async function getEvaluacionByExternalId(
  _db: any,
  externalId: string
): Promise<DBEvaluacion | null> {
  const state = loadState();
  const leccion = state.Leccion.find((l) => l.external_id === externalId);
  if (!leccion) return null;
  return state.Evaluacion.find((e) => e.id_leccion === leccion.id_leccion) || null;
}

export async function resetAllProgress(
  _db: any,
  usuarioId: number
): Promise<void> {
  const state = loadState();
  state.Progreso = state.Progreso.filter((p) => p.id_usuario !== Number(usuarioId));
  const user = state.Usuario.find((u) => u.id_usuario === Number(usuarioId));
  if (user) {
    user.xp_total = 0;
  }
  await saveState(state);
}

export async function isEvaluacionAprobadaByExternalId(
  _db: any,
  externalId: string,
  usuarioId: number
): Promise<boolean> {
  const state = loadState();
  const leccion = state.Leccion.find((l) => l.external_id === externalId);
  if (!leccion) return false;

  const prog = state.Progreso.find(
    (p) => p.id_usuario === Number(usuarioId) && p.id_leccion === leccion.id_leccion
  );
  return prog?.evaluacion_aprobada === 1;
}

export async function getLeccionesCompletadasMap(
  _db: any,
  usuarioId: number
): Promise<Record<string, boolean>> {
  const state = loadState();
  const progMap = new Map(
    state.Progreso.filter((p) => p.id_usuario === Number(usuarioId)).map((p) => [
      p.id_leccion,
      p.leccion_completada === 1,
    ])
  );

  const map: Record<string, boolean> = {};
  for (const l of state.Leccion) {
    if (l.estado === 1) {
      map[l.external_id] = progMap.get(l.id_leccion) === true;
    }
  }
  return map;
}

export async function getPreguntasConRespuestas(
  _db: any,
  evaluacionId: number
): Promise<{ preguntas: DBPregunta[]; respuestasMap: Record<number, DBRespuesta[]> }> {
  const state = loadState();
  const preguntas = state.Pregunta.filter(
    (p) => p.id_evaluacion === Number(evaluacionId)
  ).sort((a, b) => a.orden_pregunta - b.orden_pregunta);

  const respuestasMap: Record<number, DBRespuesta[]> = {};
  for (const p of preguntas) {
    respuestasMap[p.id_pregunta] = [];
  }
  for (const respuesta of state.Respuesta) {
    respuestasMap[respuesta.id_pregunta]?.push(respuesta);
  }

  return { preguntas, respuestasMap };
}

export async function getEvaluacionesData(
  _db: any,
  usuarioId: number
): Promise<{
  summaries: EvalSummary[];
  progresoMap: Record<number, DBProgreso>;
  pregCountMap: Record<number, number>;
  unlockedMap: Record<string, boolean>;
}> {
  const state = loadState();
  const summaries = await getEvaluacionesResumen(_db);

  const progresoRows = state.Progreso.filter((p) => p.id_usuario === Number(usuarioId));
  const progresoMap: Record<number, DBProgreso> = {};
  for (const p of progresoRows) {
    progresoMap[p.id_leccion] = p;
  }

  const pregCountMap: Record<number, number> = {};
  for (const p of state.Pregunta) {
    pregCountMap[p.id_evaluacion] = (pregCountMap[p.id_evaluacion] || 0) + 1;
  }

  const unlockedMap = await getLeccionesCompletadasMap(_db, usuarioId);

  return { summaries, progresoMap, pregCountMap, unlockedMap };
}

export async function getProgresoMapByExternalId(
  _db: any,
  usuarioId: number
): Promise<Record<string, { lessonDone: boolean; evalDone: boolean }>> {
  const state = loadState();
  const userProgMap = new Map(
    state.Progreso.filter((p) => p.id_usuario === Number(usuarioId)).map((p) => [
      p.id_leccion,
      p,
    ])
  );

  const map: Record<string, { lessonDone: boolean; evalDone: boolean }> = {};
  for (const l of state.Leccion) {
    if (l.estado === 1) {
      const prog = userProgMap.get(l.id_leccion);
      map[l.external_id] = {
        lessonDone: prog?.leccion_completada === 1,
        evalDone: prog?.evaluacion_aprobada === 1,
      };
    }
  }
  return map;
}
