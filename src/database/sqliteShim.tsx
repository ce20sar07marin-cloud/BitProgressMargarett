import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getStorageDatabase,
  initStorageDatabase,
  type PersistenceDatabase,
  type StorageDatabase,
} from "./storageDatabase";

export type SQLiteDatabase = StorageDatabase;

const SQLiteContext = createContext<StorageDatabase>(getStorageDatabase());

export function SQLiteProvider({
  children,
  databaseName,
  onInit,
}: {
  children: React.ReactNode;
  databaseName?: string;
  onInit?: (db: PersistenceDatabase) => Promise<void>;
}) {
  const [ready, setReady] = useState(false);
  const [dbInstance, setDbInstance] = useState<StorageDatabase>(getStorageDatabase());

  useEffect(() => {
    let mounted = true;
    async function setup() {
      const db = getStorageDatabase();
      if (onInit) await onInit(db);
      else await initStorageDatabase(db);
      if (mounted) {
        setDbInstance(db);
        setReady(true);
      }
    }
    setup();
    return () => {
      mounted = false;
    };
  }, [onInit]);

  if (!ready) {
    return null;
  }

  return (
    <SQLiteContext.Provider value={dbInstance}>
      {children}
    </SQLiteContext.Provider>
  );
}

export function useSQLiteContext(): StorageDatabase {
  const db = useContext(SQLiteContext);
  return db || getStorageDatabase();
}
