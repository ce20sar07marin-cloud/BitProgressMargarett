import {
  loadState,
  saveState,
  removeStorageValue,
  type DBUsuario,
  type PersistenceDatabase,
} from "./storageDatabase";
import {
  hashPassword,
  isHashed,
  verifyPassword,
} from "@/utils/password";

export type { DBUsuario };
export type PublicDBUsuario = Omit<DBUsuario, "password_hash">;

const FAVORITES_KEY_PREFIX = "@bitprogress_favorites_";
const ACHIEVEMENTS_KEY_PREFIX = "@bitprogress_achievements_";

function withoutPasswordHash(user: DBUsuario): PublicDBUsuario {
  const { password_hash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function getUsuarioByEmail(
  _db: PersistenceDatabase,
  correo: string
): Promise<PublicDBUsuario | null> {
  const state = loadState();
  const c = correo.trim().toLowerCase();
  const user = state.Usuario.find((u) => u.correo.toLowerCase() === c && u.estado === 1);
  return user ? withoutPasswordHash(user) : null;
}

export async function getUsuarioById(
  _db: PersistenceDatabase,
  id: number
): Promise<PublicDBUsuario | null> {
  const state = loadState();
  const user = state.Usuario.find((u) => u.id_usuario === Number(id));
  return user ? withoutPasswordHash(user) : null;
}

export async function createUsuario(
  _db: PersistenceDatabase,
  nombre: string,
  correo: string,
  password: string,
  avatar: string
): Promise<number> {
  const passwordHash = await hashPassword(password);
  const state = loadState();
  const maxId = state.Usuario.reduce((m, u) => Math.max(m, u.id_usuario || 0), 0);
  const newId = maxId + 1;

  const newUser: DBUsuario = {
    id_usuario: newId,
    nombre: nombre.trim(),
    apellido: "",
    correo: correo.trim().toLowerCase(),
    password_hash: passwordHash,
    xp_total: 0,
    fecha_registro: new Date().toISOString(),
    estado: 1,
    avatar: avatar || "boy",
  };

  state.Usuario.push(newUser);
  await saveState(state);
  return newId;
}

export async function loginUsuario(
  _db: PersistenceDatabase,
  correo: string,
  password: string
): Promise<PublicDBUsuario | null> {
  const state = loadState();
  const c = correo.trim().toLowerCase();
  const user = state.Usuario.find(
    (u) => u.correo.toLowerCase() === c && u.estado === 1
  );
  if (!user) return null;

  if (!(await verifyPassword(password, user.password_hash))) return null;

  // Migración de contraseñas legacy en texto plano al primer inicio exitoso.
  if (!isHashed(user.password_hash)) {
    user.password_hash = await hashPassword(password);
    await saveState(state);
  }

  return withoutPasswordHash(user);
}

export async function existeCorreo(
  _db: PersistenceDatabase,
  correo: string
): Promise<boolean> {
  const state = loadState();
  const c = correo.trim().toLowerCase();
  return state.Usuario.some((u) => u.correo.toLowerCase() === c);
}

/**
 * Restablece la contraseña a un valor temporal aleatorio.
 * Devuelve la contraseña temporal para mostrarla en pantalla (no hay correo).
 */
export async function resetPassword(
  _db: PersistenceDatabase,
  _correo: string
): Promise<string | null> {
  // Password recovery cannot be verified locally by email alone. Returning a
  // temporary password here would allow account takeover without proof of ownership.
  return null;
}

export async function deleteUsuario(
  _db: PersistenceDatabase,
  usuarioId: number
): Promise<void> {
  const state = loadState();
  state.Progreso = state.Progreso.filter((p) => p.id_usuario !== Number(usuarioId));
  state.Usuario = state.Usuario.filter((u) => u.id_usuario !== Number(usuarioId));
  await saveState(state);
  await removeStorageValue(_db, FAVORITES_KEY_PREFIX + usuarioId);
  await removeStorageValue(_db, ACHIEVEMENTS_KEY_PREFIX + usuarioId);
}

export async function changePassword(
  _db: PersistenceDatabase,
  usuarioId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const state = loadState();
  const user = state.Usuario.find((u) => u.id_usuario === Number(usuarioId));
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    return { success: false, error: "La contraseña actual es incorrecta" };
  }

  user.password_hash = await hashPassword(newPassword);
  await saveState(state);
  return { success: true };
}
