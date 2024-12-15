import { SupabaseBook } from './bookService';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import initSqlJs from 'sql.js';

export interface LocalBook extends SupabaseBook {
  is_manual: boolean;
  cache_expiry: string;
  local_content_path: string | null;
  local_narration_path: string | null;
  local_podcast_path: string | null;
  synced_with_supabase: boolean;
}

interface SQLiteDB {
  execute(query: string, params?: any[]): Promise<any>;
  run(query: string, params?: any[]): Promise<any>;
  close(): Promise<void>;
}

class LocalStorageService {
  private static instance: LocalStorageService;
  private sqlite: SQLiteDB | null = null;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly DB_NAME = 'dassoshu_local.db';

  private constructor() {
    this.initializeStorage();
  }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  private async initializeStorage() {
    console.log('Initializing storage...');
    console.log('Platform:', Capacitor.isNativePlatform() ? 'Mobile' : 'Web');

    if (Capacitor.isNativePlatform()) {
      // Initialize SQLite for mobile
      try {
        console.log('Initializing SQLite for mobile...');
        const sqlite = new SQLiteConnection(CapacitorSQLite);
        const db = await sqlite.createConnection(
          this.DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );

        if (db) {
          console.log('SQLite connection created successfully');
          await db.open();
          console.log('SQLite database opened');
          this.sqlite = {
            execute: async (query: string, params?: any[]) => {
              return await db.query(query, params || []);
            },
            run: async (query: string, params?: any[]) => {
              const statements = [{
                statement: query,
                values: params || []
              }];
              return await db.executeSet(statements);
            },
            close: async () => {
              await db.close();
            }
          };
          await this.createTables();
          console.log('SQLite tables created successfully');
        }
      } catch (error) {
        console.error('Error initializing SQLite:', error);
      }
    } else {
      // Initialize sql.js for web
      try {
        console.log('Initializing sql.js for web...');
        const initSql = await initSqlJs({
          locateFile: (filename: string) => `https://sql.js.org/dist/${filename}`
        });
        console.log('sql.js loaded successfully');
        const db = new initSql.Database();
        this.sqlite = {
          execute: async (query: string, params?: any[]) => {
            return db.exec(query, params);
          },
          run: async (query: string, params?: any[]) => {
            return db.run(query, params);
          },
          close: async () => {
            db.close();
          }
        };
        await this.createTables();
        console.log('sql.js tables created successfully');
      } catch (error) {
        console.error('Error initializing sql.js:', error);
      }
    }
  }

  private async createTables() {
    const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        content_url TEXT,
        cover_image TEXT,
        narration_url TEXT,
        podcast_url TEXT,
        content_category TEXT,
        current_page INTEGER DEFAULT 0,
        total_pages INTEGER,
        last_read TEXT,
        narration_status TEXT,
        podcast_status TEXT,
        highlighted_words TEXT,
        difficult_words TEXT,
        vocab_mastery TEXT,
        read_progress REAL DEFAULT 0,
        audio_progress REAL,
        book_language TEXT,
        is_favorite BOOLEAN DEFAULT FALSE,
        is_offline BOOLEAN DEFAULT FALSE,
        is_manual BOOLEAN DEFAULT FALSE,
        synced_with_supabase BOOLEAN DEFAULT FALSE,
        cache_expiry TEXT,
        local_content_path TEXT,
        local_narration_path TEXT,
        local_podcast_path TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `;

    try {
      await this.sqlite?.execute(createBooksTable);
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  public async saveBook(book: LocalBook): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO books (
        id, title, author, content_url, cover_image, narration_url, podcast_url,
        content_category, current_page, total_pages, last_read, narration_status,
        podcast_status, highlighted_words, difficult_words, vocab_mastery,
        read_progress, audio_progress, book_language, is_favorite, is_offline,
        is_manual, synced_with_supabase, cache_expiry, local_content_path,
        local_narration_path, local_podcast_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      book.id,
      book.title,
      book.author,
      book.content_url,
      book.cover_image,
      book.narration_url,
      book.podcast_url,
      book.content_category,
      book.current_page,
      book.total_pages,
      book.last_read,
      book.narration_status,
      book.podcast_status,
      JSON.stringify(book.highlighted_words),
      JSON.stringify(book.difficult_words),
      JSON.stringify(book.vocab_mastery),
      book.read_progress,
      book.audio_progress,
      book.book_language,
      book.is_favorite ? 1 : 0,
      book.is_offline ? 1 : 0,
      book.is_manual ? 1 : 0,
      book.synced_with_supabase ? 1 : 0,
      book.cache_expiry,
      book.local_content_path,
      book.local_narration_path,
      book.local_podcast_path,
      book.created_at,
      book.updated_at
    ];

    try {
      await this.sqlite?.run(query, values);
    } catch (error) {
      console.error('Error saving book:', error);
      throw error;
    }
  }

  public async getBooks(): Promise<LocalBook[]> {
    const query = 'SELECT * FROM books';
    try {
      const result = await this.sqlite?.execute(query);
      return this.transformQueryResult(result);
    } catch (error) {
      console.error('Error getting books:', error);
      throw error;
    }
  }

  public async getBook(id: string): Promise<LocalBook | null> {
    const query = 'SELECT * FROM books WHERE id = ?';
    try {
      const result = await this.sqlite?.execute(query, [id]);
      const books = this.transformQueryResult(result);
      return books.length > 0 ? books[0] : null;
    } catch (error) {
      console.error('Error getting book:', error);
      throw error;
    }
  }

  public async deleteBook(id: string): Promise<void> {
    const query = 'DELETE FROM books WHERE id = ?';
    try {
      await this.sqlite?.run(query, [id]);
      // Also delete associated files
      const book = await this.getBook(id);
      if (book) {
        await this.deleteBookFiles(book);
      }
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  }

  private async deleteBookFiles(book: LocalBook) {
    const filesToDelete = [
      book.local_content_path,
      book.local_narration_path,
      book.local_podcast_path
    ].filter(path => path !== null);

    for (const path of filesToDelete) {
      try {
        await Filesystem.deleteFile({
          path: path!,
          directory: Directory.Data
        });
      } catch (error) {
        console.error(`Error deleting file ${path}:`, error);
      }
    }
  }

  public async cacheFile(fileUrl: string, fileType: string): Promise<string> {
    try {
      console.log(`[Storage Debug] Starting to cache file from ${fileUrl}`);
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      console.log(`[Storage Debug] File fetched, size: ${blob.size} bytes`);
      
      const fileName = `${Date.now()}_${fileType}`;
      const path = `cache/${fileName}`;
      console.log(`[Storage Debug] Generated path: ${path}`);

      // Convert blob to base64 without data URL prefix
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.includes('base64,') 
            ? base64String.split('base64,')[1]
            : base64String;
          console.log(`[Storage Debug] Converted to base64, length: ${base64Content.length}`);
          resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write the file with base64 data
      console.log(`[Storage Debug] Writing file to ${path}`);
      const writeResult = await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });
      console.log(`[Storage Debug] File written successfully, URI: ${writeResult.uri}`);

      return path;
    } catch (error) {
      console.error('[Storage Debug] Error caching file:', error);
      throw error;
    }
  }

  public async readCachedFile(path: string): Promise<Blob> {
    try {
      console.log(`[Storage Debug] Reading cached file from ${path}`);
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Data
      });
      console.log(`[Storage Debug] File read successfully, data type: ${typeof result.data}`);

      // Convert base64 back to Blob
      if (result.data instanceof Blob) {
        console.log(`[Storage Debug] Data is already a Blob, size: ${result.data.size} bytes`);
        return result.data;
      } else if (typeof result.data === 'string') {
        console.log(`[Storage Debug] Converting base64 string to Blob, length: ${result.data.length}`);
        const response = await fetch(`data:application/epub+zip;base64,${result.data}`);
        const blob = await response.blob();
        console.log(`[Storage Debug] Converted to Blob successfully, size: ${blob.size} bytes`);
        return blob;
      } else {
        throw new Error('Unexpected data type from Filesystem.readFile');
      }
    } catch (error) {
      console.error('[Storage Debug] Error reading cached file:', error);
      throw error;
    }
  }

  public async listCachedFiles(): Promise<void> {
    try {
      console.log('[Storage Debug] Listing all cached files:');
      const result = await Filesystem.readdir({
        path: 'cache',
        directory: Directory.Data
      });
      
      console.log('[Storage Debug] Files found:', result.files);
      
      // Get details for each file
      for (const file of result.files) {
        const stat = await Filesystem.stat({
          path: `cache/${file.name}`,
          directory: Directory.Data
        });
        console.log(`[Storage Debug] File: ${file.name}`);
        console.log(`  - Size: ${stat.size} bytes`);
        console.log(`  - Modified: ${new Date(stat.mtime).toLocaleString()}`);
        console.log(`  - Type: ${stat.type}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('Directory does not exist')) {
          console.log('[Storage Debug] Cache directory does not exist yet');
        } else {
          console.error('[Storage Debug] Error listing cached files:', error.message);
        }
      } else {
        console.error('[Storage Debug] Unknown error listing cached files:', error);
      }
    }
  }

  private transformQueryResult(result: any): LocalBook[] {
    if (!result || result.length === 0) return [];
    
    // SQL.js returns an array of objects with columns and values
    const rows = result[0]?.values || [];
    const columns = result[0]?.columns || [];
    
    return rows.map((row: any[]) => {
      const book: any = {};
      columns.forEach((col: string, index: number) => {
        // Parse JSON strings for array/object fields
        if (['highlighted_words', 'difficult_words', 'vocab_mastery'].includes(col)) {
          try {
            book[col] = JSON.parse(row[index] || '[]');
          } catch {
            book[col] = [];
          }
        } else if (['is_favorite', 'is_offline', 'is_manual', 'synced_with_supabase'].includes(col)) {
          // Convert SQLite boolean (0/1) to actual boolean
          book[col] = Boolean(row[index]);
        } else {
          book[col] = row[index];
        }
      });
      return book as LocalBook;
    });
  }
}

export const localStorageService = LocalStorageService.getInstance(); 