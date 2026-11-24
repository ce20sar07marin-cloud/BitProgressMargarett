import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import defaultData from "./defaultData.json";

export interface DBLeccion {
  id_leccion: number;
  external_id: string;
  titulo: string;
  descripcion: string;
  contenido: string;
  nivel: string;
  xp_recompensa: number;
  estado: number;
}

export interface DBEvaluacion {
  id_evaluacion: number;
  id_leccion: number;
  titulo: string;
  descripcion: string;
  puntaje_minimo: number;
}

export interface DBPregunta {
  id_pregunta: number;
  id_evaluacion: number;
  enunciado: string;
  tipo_pregunta: string;
  puntaje: number;
  orden_pregunta: number;
}

export interface DBRespuesta {
  id_respuesta: number;
  id_pregunta: number;
  texto_respuesta: string;
  es_correcta: number;
}

export interface DBProgreso {
  id_progreso: number;
  id_usuario: number;
  id_leccion: number;
  leccion_completada: number;
  evaluacion_aprobada: number;
  puntuacion: number;
  puntuacion_evaluacion?: number;
  fecha_completado: string;
}

export interface DBUsuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  password_hash: string;
  xp_total: number;
  fecha_registro: string;
  estado: number;
  avatar: string;
}

export interface LessonSummary {
  external_id: string;
  titulo: string;
  nivel: string;
}

export interface DBLeccionCompleta extends DBLeccion {
  pages_json: string;
}

export interface EvalSummary {
  id_evaluacion: number;
  external_id: string;
  titulo: string;
  nivel: string;
  id_leccion: number;
}

export interface StorageDBState {
  version: number;
  Leccion: DBLeccion[];
  Evaluacion: DBEvaluacion[];
  Pregunta: DBPregunta[];
  Respuesta: DBRespuesta[];
  Usuario: DBUsuario[];
  Progreso: DBProgreso[];
}

export interface PersistenceDatabase {
  getFirstAsync<T = any>(query: string, ...params: any[]): Promise<T | null>;
  getAllAsync<T = any>(query: string, ...params: any[]): Promise<T[]>;
  runAsync(
    query: string,
    ...params: any[]
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  execAsync(query: string): Promise<void>;
}

const STORAGE_KEY = "@bitprogress_db_state_v5";
const STATE_TABLE = "bitprogress_state";
const KEY_VALUE_TABLE = "bitprogress_kv";

let cachedState: StorageDBState | null = null;
let initPromise: Promise<StorageDatabase> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let activeDatabase: PersistenceDatabase | null = null;
let initializedDatabase: PersistenceDatabase | null = null;
let memoryFallbackEnabled = false;
const memoryValues = new Map<string, string>();

function enableMemoryFallback(error?: unknown): void {
  if (!memoryFallbackEnabled) {
    console.error(
      "Persistent storage is unavailable; using in-memory storage for this session.",
      error,
    );
    memoryFallbackEnabled = true;
  }
  activeDatabase = storageDbInstance;
  if (cachedState) {
    memoryValues.set(STORAGE_KEY, JSON.stringify(cachedState));
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function parsePersistedState(raw: string): StorageDBState | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.Leccion)) {
      if (Array.isArray(parsed.Usuario)) {
        parsed.Usuario.forEach((u: any) => {
          if (!u.avatar) u.avatar = "boy";
        });
      }
      if (!Array.isArray(parsed.Progreso)) {
        parsed.Progreso = [];
      }
      if (!Array.isArray(parsed.Evaluacion)) parsed.Evaluacion = [];
      if (!Array.isArray(parsed.Pregunta)) parsed.Pregunta = [];
      if (!Array.isArray(parsed.Respuesta)) parsed.Respuesta = [];
      if (!Array.isArray(parsed.Usuario)) parsed.Usuario = [];
      return parsed as StorageDBState;
    }
  } catch (e) {
    console.warn("Failed to parse persisted db state:", e);
  }
  return null;
}

function normalizeState(state: StorageDBState): void {
  for (const user of state.Usuario) {
    if (!user.avatar) user.avatar = "boy";
  }

  const rowsByUserAndLesson = new Map<string, DBProgreso>();
  for (const row of state.Progreso) {
    const key = `${row.id_usuario}:${row.id_leccion}`;
    const existing = rowsByUserAndLesson.get(key);
    if (existing) {
      existing.leccion_completada = Math.max(
        existing.leccion_completada,
        row.leccion_completada,
      );
      existing.evaluacion_aprobada = Math.max(
        existing.evaluacion_aprobada,
        row.evaluacion_aprobada,
      );
      existing.puntuacion = Math.max(existing.puntuacion || 0, row.puntuacion || 0);
      const existingEvalScore =
        typeof existing.puntuacion_evaluacion === "number" &&
        Number.isFinite(existing.puntuacion_evaluacion)
          ? existing.puntuacion_evaluacion
          : undefined;
      const rowEvalScore =
        typeof row.puntuacion_evaluacion === "number" &&
        Number.isFinite(row.puntuacion_evaluacion)
          ? row.puntuacion_evaluacion
          : undefined;
      if (existingEvalScore !== undefined || rowEvalScore !== undefined) {
        existing.puntuacion_evaluacion = Math.max(
          existingEvalScore ?? 0,
          rowEvalScore ?? 0,
        );
      }
      if (row.fecha_completado > existing.fecha_completado) {
        existing.fecha_completado = row.fecha_completado;
      }
    } else {
      rowsByUserAndLesson.set(key, { ...row });
    }
  }
  state.Progreso = [...rowsByUserAndLesson.values()];
}

function createInitialState(): StorageDBState {
  const typedDefault = defaultData as unknown as {
    Leccion: DBLeccion[];
    Evaluacion: DBEvaluacion[];
    Pregunta: DBPregunta[];
    Respuesta: DBRespuesta[];
    Usuario: DBUsuario[];
  };

  return {
    version: 5,
    Leccion: typedDefault.Leccion || [],
    Evaluacion: typedDefault.Evaluacion || [],
    Pregunta: typedDefault.Pregunta || [],
    Respuesta: typedDefault.Respuesta || [],
    Usuario: typedDefault.Usuario || [
      {
        id_usuario: 1,
        nombre: "Usuario",
        apellido: "Default",
        correo: "default@bitprogress.app",
        password_hash: "",
        xp_total: 0,
        fecha_registro: new Date().toISOString(),
        estado: 1,
        avatar: "boy",
      },
    ],
    Progreso: [],
  };
}

export function loadState(): StorageDBState {
  if (!cachedState) {
    throw new Error("BitProgress storage has not been initialized.");
  }
  return cachedState;
}

export function saveState(state: StorageDBState): Promise<void> {
  cachedState = state;
  const payload = JSON.stringify(state);

  if (memoryFallbackEnabled) {
    memoryValues.set(STORAGE_KEY, payload);
    return Promise.resolve();
  }

  if (Platform.OS === "web") {
    try {
      const storage = getLocalStorage();
      if (!storage) throw new Error("Web local storage is unavailable.");
      storage.setItem(STORAGE_KEY, payload);
      return Promise.resolve();
    } catch (error) {
      enableMemoryFallback(error);
      memoryValues.set(STORAGE_KEY, payload);
      return Promise.resolve();
    }
  }

  if (!activeDatabase) {
    enableMemoryFallback(new Error("SQLite database is unavailable."));
    memoryValues.set(STORAGE_KEY, payload);
    return Promise.resolve();
  }

  const db = activeDatabase;
  writeChain = writeChain
    .then(async () => {
      await db.runAsync(
        `INSERT INTO ${STATE_TABLE} (id, payload) VALUES (1, ?) ` +
          "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
        payload,
      );
    })
    .catch((error) => {
      enableMemoryFallback(error);
      memoryValues.set(STORAGE_KEY, payload);
    });
  return writeChain;
}

export async function getStorageValue(
  db: PersistenceDatabase,
  key: string,
): Promise<string | null> {
  if (memoryFallbackEnabled) {
    return memoryValues.get(key) ?? null;
  }
  try {
    if (Platform.OS === "web") {
      return getLocalStorage()?.getItem(key) ?? null;
    }
    const row = await (activeDatabase ?? db).getFirstAsync<{ value: string }>(
      `SELECT value FROM ${KEY_VALUE_TABLE} WHERE key = ?`,
      key,
    );
    return row?.value ?? null;
  } catch (error) {
    enableMemoryFallback(error);
    return memoryValues.get(key) ?? null;
  }
}

export async function setStorageValue(
  db: PersistenceDatabase,
  key: string,
  value: string,
): Promise<void> {
  if (memoryFallbackEnabled) {
    memoryValues.set(key, value);
    return;
  }
  try {
    if (Platform.OS === "web") {
      const storage = getLocalStorage();
      if (!storage) throw new Error("Web local storage is unavailable.");
      storage.setItem(key, value);
      return;
    }
    await (activeDatabase ?? db).runAsync(
      `INSERT INTO ${KEY_VALUE_TABLE} (key, value) VALUES (?, ?) ` +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  } catch (error) {
    enableMemoryFallback(error);
    memoryValues.set(key, value);
  }
}

export async function removeStorageValue(
  db: PersistenceDatabase,
  key: string,
): Promise<void> {
  if (memoryFallbackEnabled) {
    memoryValues.delete(key);
    return;
  }
  try {
    if (Platform.OS === "web") {
      getLocalStorage()?.removeItem(key);
      return;
    }
    await (activeDatabase ?? db).runAsync(
      `DELETE FROM ${KEY_VALUE_TABLE} WHERE key = ?`,
      key,
    );
  } catch (error) {
    enableMemoryFallback(error);
    memoryValues.delete(key);
  }
}

async function migrateLegacyAsyncStorage(db: PersistenceDatabase): Promise<void> {
  const legacyKeys = (await AsyncStorage.getAllKeys()).filter(
    (key) => key.startsWith("@bitprogress_") && key !== STORAGE_KEY,
  );

  for (const key of legacyKeys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      await db.runAsync(
        `INSERT INTO ${KEY_VALUE_TABLE} (key, value) VALUES (?, ?) ` +
          "ON CONFLICT(key) DO NOTHING",
        key,
        value,
      );
    }
  }

  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys);
  }
}

/**
 * StorageDatabase provides SQLiteDatabase-compatible async methods backed by localStorage
 */
export class StorageDatabase implements PersistenceDatabase {
  async getFirstAsync<T = any>(query: string, ...params: any[]): Promise<T | null> {
    const cleanQuery = query.trim().replace(/\s+/g, " ");
    if (memoryFallbackEnabled) {
      if (/SELECT payload FROM bitprogress_state WHERE id = \?/i.test(cleanQuery)) {
        const payload = memoryValues.get(STORAGE_KEY);
        return (payload === undefined ? null : { payload }) as T | null;
      }
      if (/SELECT value FROM bitprogress_kv WHERE key = \?/i.test(cleanQuery)) {
        const value = memoryValues.get(String(params[0]));
        return (value === undefined ? null : { value }) as T | null;
      }
      return null;
    }
    const storage = getLocalStorage();

    if (/SELECT payload FROM bitprogress_state WHERE id = \?/i.test(cleanQuery)) {
      const payload = storage?.getItem(STORAGE_KEY);
      return (payload === null || payload === undefined ? null : { payload }) as T | null;
    }
    if (/SELECT value FROM bitprogress_kv WHERE key = \?/i.test(cleanQuery)) {
      const value = storage?.getItem(String(params[0]));
      return (value === null || value === undefined ? null : { value }) as T | null;
    }

    return null;
  }

  async getAllAsync<T = any>(query: string, ...params: any[]): Promise<T[]> {
    return [];
  }

  async runAsync(query: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const cleanQuery = query.trim().replace(/\s+/g, " ");
    if (memoryFallbackEnabled) {
      if (/INSERT INTO bitprogress_state/i.test(cleanQuery)) {
        memoryValues.set(STORAGE_KEY, String(params[0]));
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (/INSERT INTO bitprogress_kv/i.test(cleanQuery)) {
        memoryValues.set(String(params[0]), String(params[1]));
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (/DELETE FROM bitprogress_kv WHERE key = \?/i.test(cleanQuery)) {
        memoryValues.delete(String(params[0]));
        return { lastInsertRowId: 0, changes: 1 };
      }
      throw new Error(`Unsupported in-memory SQLite operation: ${cleanQuery}`);
    }
    const storage = getLocalStorage();
    if (!storage) throw new Error("Web local storage is unavailable.");

    if (/INSERT INTO bitprogress_state/i.test(cleanQuery)) {
      storage.setItem(STORAGE_KEY, String(params[0]));
      return { lastInsertRowId: 1, changes: 1 };
    }
    if (/INSERT INTO bitprogress_kv/i.test(cleanQuery)) {
      storage.setItem(String(params[0]), String(params[1]));
      return { lastInsertRowId: 1, changes: 1 };
    }
    if (/DELETE FROM bitprogress_kv WHERE key = \?/i.test(cleanQuery)) {
      storage.removeItem(String(params[0]));
      return { lastInsertRowId: 0, changes: 1 };
    }

    throw new Error(`Unsupported web SQLite operation: ${cleanQuery}`);
  }

  async execAsync(query: string): Promise<void> {
    // Schema creation is represented by localStorage keys on web.
  }

  async withTransactionAsync<T>(callback: () => Promise<T>): Promise<T> {
    return await callback();
  }
}

const storageDbInstance = new StorageDatabase();

export function initStorageDatabase(
  db: PersistenceDatabase,
): Promise<StorageDatabase> {
  if (initializedDatabase === db && initPromise) return initPromise;

  activeDatabase = db;
  initializedDatabase = db;
  initPromise = (async () => {
    try {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS ${STATE_TABLE} (` +
          "id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL); " +
          `CREATE TABLE IF NOT EXISTS ${KEY_VALUE_TABLE} (` +
          "key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
      );

      const persisted = await db.getFirstAsync<{ payload: string }>(
        `SELECT payload FROM ${STATE_TABLE} WHERE id = ?`,
        1,
      );
      if (persisted?.payload) {
        cachedState = parsePersistedState(persisted.payload);
      } else if (Platform.OS !== "web") {
        const legacy = await AsyncStorage.getItem(STORAGE_KEY);
        cachedState = legacy ? parsePersistedState(legacy) : null;
      } else {
        const legacy = getLocalStorage()?.getItem(STORAGE_KEY);
        cachedState = legacy ? parsePersistedState(legacy) : null;
      }

      if (!cachedState) cachedState = createInitialState();
      normalizeState(cachedState);
      await saveState(cachedState);

      if (Platform.OS !== "web") {
        await migrateLegacyAsyncStorage(db);
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      enableMemoryFallback(error);
      if (!cachedState) cachedState = createInitialState();
      normalizeState(cachedState);
      await saveState(cachedState);
    }
    return storageDbInstance;
  })();
  return initPromise;
}

export async function initMemoryStorageDatabase(): Promise<StorageDatabase> {
  enableMemoryFallback();
  if (!cachedState) cachedState = createInitialState();
  normalizeState(cachedState);
  memoryValues.set(STORAGE_KEY, JSON.stringify(cachedState));
  initializedDatabase = storageDbInstance;
  initPromise = Promise.resolve(storageDbInstance);
  return storageDbInstance;
}

export function getStorageDatabase(): StorageDatabase {
  return storageDbInstance;
}
