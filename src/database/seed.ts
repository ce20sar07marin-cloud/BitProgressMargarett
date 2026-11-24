import {
  initStorageDatabase,
  type PersistenceDatabase,
} from "./storageDatabase";

export async function seedDatabase(db: PersistenceDatabase) {
  await initStorageDatabase(db);
}
