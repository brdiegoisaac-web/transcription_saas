import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, transcriptions, InsertTranscription, Transcription, categories, competitors, competitorCreatives } from "../drizzle/schema";
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
    // Construir objeto de inserção sem a coluna 'name' se não fornecida
    const dataToInsert: any = {
      userId: transcription.userId,
      fileName: transcription.fileName,
      originalText: transcription.originalText,
      segments: transcription.segments,
      inputLanguage: transcription.inputLanguage,
      outputLanguage: transcription.outputLanguage,
      duration: transcription.duration,
    };
    
    // Adicionar name apenas se fornecido e não vazio
    if (transcription.name && transcription.name.trim()) {
      dataToInsert.name = transcription.name;
    }
    
    const result = await db.insert(transcriptions).values(dataToInsert);
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

/**
 * Atualizar nome de uma transcrição
 */
export async function updateTranscriptionName(id: number, userId: number, name: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update transcription: database not available");
    return false;
  }

  try {
    // Verificar permissão primeiro
    const transcription = await getTranscriptionById(id, userId);
    if (!transcription) {
      return false;
    }

    await db.update(transcriptions).set({ name }).where(eq(transcriptions.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update transcription name:", error);
    return false;
  }
}


/**
 * Funções para Categorias
 */
export async function createCategory(userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create category: database not available");
    return null;
  }

  try {
    const result = await db.insert(categories).values({
      userId,
      name,
      description,
    });
    const id = (result as any)[0]?.insertId;
    if (id) {
      const saved = await db.select().from(categories).where(eq(categories.id, id as number)).limit(1);
      return saved.length > 0 ? saved[0] : null;
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to create category:", error);
    throw error;
  }
}

export async function getUserCategories(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get categories: database not available");
    return [];
  }

  try {
    return await db.select().from(categories).where(eq(categories.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get categories:", error);
    return [];
  }
}

/**
 * Funções para Concorrentes
 */
export async function createCompetitor(userId: number, categoryId: number, name: string, data: any) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create competitor: database not available");
    return null;
  }

  try {
    const result = await db.insert(competitors).values({
      userId,
      categoryId,
      name,
      description: data.description,
      website: data.website,
      adAccountUrl: data.adAccountUrl,
      notes: data.notes,
    });
    const id = (result as any)[0]?.insertId;
    if (id) {
      const saved = await db.select().from(competitors).where(eq(competitors.id, id as number)).limit(1);
      return saved.length > 0 ? saved[0] : null;
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to create competitor:", error);
    throw error;
  }
}

export async function getCategoryCompetitors(categoryId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get competitors: database not available");
    return [];
  }

  try {
    return await db.select().from(competitors).where(
      and(eq(competitors.categoryId, categoryId), eq(competitors.userId, userId))
    );
  } catch (error) {
    console.error("[Database] Failed to get competitors:", error);
    return [];
  }
}

export async function deleteCompetitor(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete competitor: database not available");
    return false;
  }

  try {
    const competitor = await db.select().from(competitors).where(
      and(eq(competitors.id, id), eq(competitors.userId, userId))
    ).limit(1);
    
    if (competitor.length === 0) return false;

    await db.delete(competitors).where(eq(competitors.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete competitor:", error);
    return false;
  }
}

/**
 * Funções para associar criativos a concorrentes
 */
export async function linkCreativeToCompetitor(transcriptionId: number, competitorId: number, notes?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot link creative: database not available");
    return null;
  }

  try {
    const result = await db.insert(competitorCreatives).values({
      transcriptionId,
      competitorId,
      notes,
    });
    const id = (result as any)[0]?.insertId;
    if (id) {
      const saved = await db.select().from(competitorCreatives).where(eq(competitorCreatives.id, id as number)).limit(1);
      return saved.length > 0 ? saved[0] : null;
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to link creative:", error);
    throw error;
  }
}

export async function getCompetitorCreatives(competitorId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get competitor creatives: database not available");
    return [];
  }

  try {
    return await db.select().from(competitorCreatives).where(eq(competitorCreatives.competitorId, competitorId));
  } catch (error) {
    console.error("[Database] Failed to get competitor creatives:", error);
    return [];
  }
}
