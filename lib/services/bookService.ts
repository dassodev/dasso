import { supabase } from '../supabaseClient';
import { localStorageService, LocalBook } from './localStorageService';

export interface SupabaseBook {
  id: string;
  title: string;
  author: string;
  content_url: string;
  cover_image: string;
  narration_url: string | null;
  podcast_url: string | null;
  content_category: string;
  current_page: number;
  total_pages: number;
  last_read: string | null;
  narration_status: string | null;
  podcast_status: string | null;
  highlighted_words: string[] | null;
  difficult_words: string[] | null;
  vocab_mastery: any | null;
  read_progress: number;
  audio_progress: number | null;
  book_language: string;
  is_favorite: boolean;
  is_offline: boolean;
  synced_with_supabase: boolean;
  is_crafted: boolean;
  created_at: string;
  updated_at: string;
}

class BookService {
  private static instance: BookService;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {
    this.testConnection();
  }

  private async testConnection() {
    try {
      const { data, error } = await supabase.from('books').select('count');
      if (error) {
        console.error('Supabase connection test failed:', error);
      } else {
        console.log('Supabase connection test successful');
      }
    } catch (error) {
      console.error('Error testing Supabase connection:', error);
    }
  }

  public static getInstance(): BookService {
    if (!BookService.instance) {
      BookService.instance = new BookService();
    }
    return BookService.instance;
  }

  public async fetchBooks(): Promise<LocalBook[]> {
    try {
      // First, try to get books from local storage
      console.log('Fetching books from local storage...');
      const localBooks = await localStorageService.getBooks();
      console.log('Local books found:', localBooks.length);
      
      const now = new Date().toISOString();

      // Filter out expired books
      const validBooks = localBooks.filter(book => {
        return book.is_manual || (book.cache_expiry && book.cache_expiry > now);
      });
      console.log('Valid cached books:', validBooks.length);

      // If we're offline, return valid cached books
      if (!navigator.onLine) {
        console.log('Offline mode: returning cached books');
        return validBooks;
      }

      // Fetch updates from Supabase
      console.log('Fetching books from Supabase...');
      const { data: supabaseBooks, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching books from Supabase:', error);
        return validBooks; // Return cached books on error
      }

      console.log('Books fetched from Supabase:', supabaseBooks?.length || 0);

      // Process and cache Supabase books
      const processedBooks = await this.processSupabaseBooks(supabaseBooks || []);
      console.log('Processed Supabase books:', processedBooks.length);
      
      // Merge manual books with Supabase books
      const manualBooks = validBooks.filter(book => book.is_manual);
      const allBooks = [...processedBooks, ...manualBooks];

      console.log('Total books after merge:', allBooks.length);
      return allBooks;
    } catch (error) {
      console.error('Error in fetchBooks:', error);
      throw error;
    }
  }

  private async processSupabaseBooks(supabaseBooks: SupabaseBook[]): Promise<LocalBook[]> {
    const processedBooks: LocalBook[] = [];

    for (const book of supabaseBooks) {
      try {
        // Check if book exists in local storage
        const localBook = await localStorageService.getBook(book.id);
        const cacheExpiry = new Date(Date.now() + this.CACHE_DURATION).toISOString();

        // Prepare the local book object
        const newLocalBook: LocalBook = {
          ...book,
          is_manual: false,
          cache_expiry: cacheExpiry,
          local_content_path: localBook?.local_content_path || null,
          local_narration_path: localBook?.local_narration_path || null,
          local_podcast_path: localBook?.local_podcast_path || null,
          synced_with_supabase: true
        };

        // Cache the book's files if they're not already cached
        if (!localBook?.local_content_path) {
          newLocalBook.local_content_path = await localStorageService.cacheFile(
            book.content_url,
            'epub'
          );
        }

        if (book.narration_url && !localBook?.local_narration_path) {
          newLocalBook.local_narration_path = await localStorageService.cacheFile(
            book.narration_url,
            'audio'
          );
        }

        if (book.podcast_url && !localBook?.local_podcast_path) {
          newLocalBook.local_podcast_path = await localStorageService.cacheFile(
            book.podcast_url,
            'audio'
          );
        }

        // Save the book to local storage
        await localStorageService.saveBook(newLocalBook);
        processedBooks.push(newLocalBook);
      } catch (error) {
        console.error(`Error processing book ${book.id}:`, error);
      }
    }

    return processedBooks;
  }

  public async fetchBookFile(url: string): Promise<File | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch book file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = url.split('/').pop() || 'book.epub';
      return new File([blob], filename, { type: 'application/epub+zip' });
    } catch (error) {
      console.error('Error fetching book file:', error);
      return null;
    }
  }

  public async updateBookProgress(bookId: string, progress: number): Promise<void> {
    try {
      // Update local storage first
      const localBook = await localStorageService.getBook(bookId);
      if (localBook) {
        localBook.read_progress = progress;
        localBook.updated_at = new Date().toISOString();
        await localStorageService.saveBook(localBook);
      }

      // If book is synced with Supabase and we're online, update Supabase
      if (localBook?.synced_with_supabase && navigator.onLine) {
        const { error } = await supabase
          .from('books')
          .update({ read_progress: progress })
          .eq('id', bookId);

        if (error) {
          console.error('Error updating book progress in Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error in updateBookProgress:', error);
      throw error;
    }
  }

  public async addManualBook(file: File, title: string, coverUrl?: string): Promise<LocalBook> {
    try {
      const now = new Date().toISOString();
      const bookId = `manual_${Date.now()}`;

      // Cache the book file
      const localContentPath = await localStorageService.cacheFile(
        URL.createObjectURL(file),
        'epub'
      );

      const newBook: LocalBook = {
        id: bookId,
        title,
        author: '',
        content_url: URL.createObjectURL(file),
        cover_image: coverUrl || '',
        narration_url: null,
        podcast_url: null,
        content_category: 'manual',
        current_page: 0,
        total_pages: 0,
        last_read: null,
        narration_status: null,
        podcast_status: null,
        highlighted_words: [],
        difficult_words: [],
        vocab_mastery: null,
        read_progress: 0,
        audio_progress: null,
        book_language: 'zh',
        is_favorite: false,
        is_offline: true,
        is_manual: true,
        synced_with_supabase: false,
        is_crafted: false,
        cache_expiry: new Date(Date.now() + this.CACHE_DURATION).toISOString(),
        local_content_path: localContentPath,
        local_narration_path: null,
        local_podcast_path: null,
        created_at: now,
        updated_at: now
      };

      await localStorageService.saveBook(newBook);
      return newBook;
    } catch (error) {
      console.error('Error adding manual book:', error);
      throw error;
    }
  }

  public async removeBook(bookId: string): Promise<void> {
    try {
      // Get the book details first
      const localBook = await localStorageService.getBook(bookId);
      
      if (!localBook) {
        console.error('Book not found:', bookId);
        return;
      }

      // Only allow removing manual books
      if (!localBook.is_manual) {
        throw new Error('Cannot remove non-manual books');
      }

      // Delete from local storage (this will also remove cached files)
      await localStorageService.deleteBook(bookId);

      console.log('Successfully removed book:', bookId);
    } catch (error) {
      console.error('Error removing book:', error);
      throw error;
    }
  }
}

export const bookService = BookService.getInstance(); 