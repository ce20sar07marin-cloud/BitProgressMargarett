import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import * as SQLite from "expo-sqlite";
import {
  getStorageDatabase,
  initMemoryStorageDatabase,
  initStorageDatabase,
  type PersistenceDatabase,
  type StorageDatabase,
} from "./storageDatabase";

const DatabaseContext = createContext<PersistenceDatabase>(getStorageDatabase());

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<StorageDatabase | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize(): Promise<void> {
      try {
        const db =
          Platform.OS === "web"
            ? getStorageDatabase()
            : await SQLite.openDatabaseAsync("BitProgress.db");
        const storageDatabase = await initStorageDatabase(db);
        if (mounted) setDatabase(storageDatabase);
      } catch (error) {
        console.error("Failed to open the app database; using memory storage:", error);
        const storageDatabase = await initMemoryStorageDatabase();
        if (mounted) setDatabase(storageDatabase);
      }
    }

    void initialize().catch((error) => {
      console.error("Failed to initialize the in-memory app database:", error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!database) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={database}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useStorageDatabase(): PersistenceDatabase {
  return useContext(DatabaseContext);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
