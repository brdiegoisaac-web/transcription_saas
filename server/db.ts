import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, transcriptions, InsertTranscription, Transcription } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Salvar uma transcrição no banco de dados
 */
export async function saveTranscription(transcription: InsertTranscription): Promise<Transcription | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save transcription: database not available");
    return null;
  }

  try {
    const result = await db.insert(transcriptions).values(transcription);
    const id = (result as any)[0]?.insertId;
    if (id) {
      const saved = await db.select().from(transcriptions).where(eq(transcriptions.id, id as number)).limit(1);
      return saved.length > 0 ? saved[0] : null;
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to save transcription:", error);
    throw error;
  }
}

/**
 * Obter histórico de transcrições de um usuário
 */
export async function getUserTranscriptions(userId: number, limit: number = 50): Promise<Transcription[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get transcriptions: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.userId, userId))
      .orderBy(desc(transcriptions.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get transcriptions:", error);
    return [];
  }
}

/**
 * Obter uma transcrição específica
 */
export async function getTranscriptionById(id: number, userId: number): Promise<Transcription | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get transcription: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.id, id))
      .limit(1);
    
    if (result.length === 0) return null;
    
    // Verificar se o usuário tem permissão
    if (result[0].userId !== userId) {
      console.warn("[Database] User does not have permission to access this transcription");
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get transcription:", error);
    return null;
  }
}

/**
 * Deletar uma transcrição
 */
export async function deleteTranscription(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete transcription: database not available");
    return false;
  }

  try {
    // Verificar permissão primeiro
    const transcription = await getTranscriptionById(id, userId);
    if (!transcription) {
      return false;
    }

    await db.delete(transcriptions).where(eq(transcriptions.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete transcription:", error);
    return false;
  }
}
