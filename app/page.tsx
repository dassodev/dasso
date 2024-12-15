'use client'

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar"
import { Button } from "components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { BookOpen, FileText, Library, Sun, Compass, MoreVertical } from "lucide-react"
import { ScrollArea } from "components/ui/scroll-area"
import { cn } from "lib/utils"
import Image from "next/image"
import { Progress } from "components/ui/progress"
import { FileUpload } from "components/FileUpload"
import { Reader } from "components/Reader"
import { ProfileMenu } from "components/ui/profile-menu"
import { useAuth } from "contexts/auth-context"
import { useRouter } from "next/navigation"
import { coverService } from "lib/services/coverService"
import { extractEpubCover, extractPdfCover } from "lib/utils/bookCoverExtractor"
import { bookService, SupabaseBook } from "lib/services/bookService"
import { localStorageService } from "lib/services/localStorageService"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu"

interface Book {
  id: string;
  title: string;
  type: string;
  progress: number;
  file: File;
  shelf: number;
  coverUrl?: string;
  supabaseId?: string;
  is_manual: boolean;
  local_content_path: string | null;
}

interface BookshelfRowProps {
  books: Book[];
  onBookClick: (book: Book) => void;
}

function BookCard({ id, title, type, progress, coverUrl, onClick, is_manual, onRemove }: Book & { onClick: () => void, onRemove?: () => void }) {
  const [cover, setCover] = useState<string | null>(null);
  const [isGeneratedCover, setIsGeneratedCover] = useState(false);

  // Clean up the title by removing file extension and path
  const cleanTitle = useMemo(() => {
    // Remove file extension
    const withoutExtension = title.replace(/\.[^/.]+$/, '');
    // Remove path if exists
    const withoutPath = withoutExtension.split('/').pop() || withoutExtension;
    // Clean up any remaining dots or underscores
    return withoutPath.replace(/[._]/g, ' ').trim();
  }, [title]);

  // Get clean file type
  const cleanFileType = useMemo(() => {
    return type.split('/').pop()?.toUpperCase() || 'UNKNOWN';
  }, [type]);

  useEffect(() => {
    async function loadCover() {
      if (coverUrl) {
        setCover(coverUrl);
        setIsGeneratedCover(false);
      } else {
        try {
          const generatedCover = await coverService.getBookCover(
            id.toString(),
            cleanTitle,
            cleanFileType
          );
          setCover(generatedCover);
          setIsGeneratedCover(true);
        } catch (error) {
          console.error('Error generating cover:', error);
          // Fallback to placeholder
          setCover('/placeholder.svg');
          setIsGeneratedCover(false);
        }
      }
    }
    loadCover();
  }, [id, cleanTitle, cleanFileType, coverUrl]);

  return (
    <div 
      className="relative aspect-[3/4] overflow-hidden rounded-t-lg shadow-lg cursor-pointer group" 
      onClick={onClick}
    >
      {is_manual && onRemove && (
        <div 
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()} // Prevent triggering book open
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full text-black/50 hover:text-black/70 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={onRemove}
              >
                Remove Book
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="relative w-full h-full">
        <Image
          src={cover || '/placeholder.svg'}
          alt={cleanTitle}
          fill
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
        {/* Title Overlay - Only for non-generated covers (Supabase books) */}
        {!isGeneratedCover && (
          <div className="absolute top-0 left-0 right-0 p-4 text-center">
            <h3 className="text-white text-sm font-bold line-clamp-2">{cleanTitle}</h3>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-1">
        <Progress value={progress} className="h-1" />
      </div>
    </div>
  );
}

function BookshelfRow({ books, onBookClick, onRemoveBook }: BookshelfRowProps & { onRemoveBook?: (book: Book) => void }) {
  return (
    <div className="h-[200px] relative w-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/bookshelf-background.webp"
          alt="Bookshelf background"
          className="w-full h-[200px] object-fill"
          onError={(e) => {
            console.error('Error loading bookshelf background:', e);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
      <div className="absolute inset-0">
        <div className="flex items-end h-full px-4 pb-[10px] gap-4">
          {books.map((book) => (
            <div key={book.id} className="w-[120px] flex-none">
              <BookCard 
                {...book} 
                onClick={() => onBookClick(book)}
                onRemove={book.is_manual ? () => onRemoveBook?.(book) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface BookshelfContentProps {
  books: Book[];
  addBook: (file: File) => void;
  openBook: (book: Book) => void;
  onBooksChange: (newBooks: Book[]) => void;
}

function BookshelfContent({ books, addBook, openBook, onBooksChange }: BookshelfContentProps) {
  const [booksPerShelf, setBooksPerShelf] = useState(0);
  const [numShelves, setNumShelves] = useState(3); // Start with 3 shelves
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function calculateBooksPerShelf() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const bookWidth = 120; // book width
        const gap = 16; // gap between books
        const padding = 32; // padding on both sides
        const availableWidth = containerWidth - padding;
        const booksPerRow = Math.floor((availableWidth + gap) / (bookWidth + gap));
        setBooksPerShelf(Math.max(1, booksPerRow));
      }
    }

    calculateBooksPerShelf();
    window.addEventListener('resize', calculateBooksPerShelf);
    return () => window.removeEventListener('resize', calculateBooksPerShelf);
  }, []);

  // Calculate required number of shelves based on total books
  useEffect(() => {
    if (booksPerShelf > 0) {
      const requiredShelves = Math.max(3, Math.ceil(books.length / booksPerShelf));
      setNumShelves(requiredShelves);
    }
  }, [books.length, booksPerShelf]);

  const shelves = useMemo(() => {
    if (!booksPerShelf) return Array(numShelves).fill([]);
    
    return Array.from({ length: numShelves }, (_, shelfIndex) => {
      const startIndex = shelfIndex * booksPerShelf;
      return books.slice(startIndex, startIndex + booksPerShelf);
    });
  }, [books, booksPerShelf, numShelves]);

  const handleRemoveBook = async (book: Book) => {
    try {
      // Remove from local storage and cache
      await bookService.removeBook(book.id);
      
      // Update UI state by notifying parent component
      if (onBooksChange) {
        onBooksChange(books.filter(b => b.id !== book.id));
      }
    } catch (error) {
      console.error('Error removing book:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full" ref={containerRef}>
      {/* Scrollable book content with proper padding */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col pt-4">
          {shelves.map((shelfBooks, index) => (
            <BookshelfRow 
              key={index}
              books={shelfBooks}
              onBookClick={openBook}
              onRemoveBook={handleRemoveBook}
            />
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 right-0 p-4">
        <div className="w-full flex-1 md:w-auto md:flex-none">
          <button
            onClick={async () => {
              console.log('Checking storage status...');
              await localStorageService.listCachedFiles();
            }}
            className="inline-flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 mr-2"
          >
            Check Storage
          </button>
          <FileUpload onFileSelect={addBook} />
        </div>
      </div>
    </div>
  );
}

function DiscoveryContent() {
  return (
    <div className="flex-1 p-4">
      <h2 className="text-2xl font-bold mb-4">Discover</h2>
      <p>Discovery content coming soon...</p>
    </div>
  );
}

function NoteContent() {
  return (
    <div className="flex-1 p-4">
      <h2 className="text-2xl font-bold mb-4">Note</h2>
      <p>Note content coming soon...</p>
    </div>
  );
}

function FlashcardsContent() {
  return (
    <div className="flex-1 p-4">
      <h2 className="text-2xl font-bold mb-4">Flashcards</h2>
      <p>Flashcards content coming soon...</p>
    </div>
  );
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeNav, setActiveNav] = useState("Bookshelf");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth()
  const router = useRouter()

  // Load books when user logs in
  useEffect(() => {
    async function loadBooks() {
      if (!user) return;

      try {
        console.log('Starting to load books...');
        setIsLoading(true);
        const localBooks = await bookService.fetchBooks();
        console.log('Fetched books from service:', localBooks.length);
        
        // Convert LocalBook format to our Book format
        const convertedBooks = await Promise.all(localBooks.map(async (localBook) => {
          let file: File | null = null;

          // Try to get the file from local cache first
          if (localBook.local_content_path) {
            try {
              console.log(`Loading cached file for book ${localBook.id}`);
              const blob = await localStorageService.readCachedFile(localBook.local_content_path);
              
              // Ensure proper MIME type for EPUB files
              const mimeType = 'application/epub+zip';
              file = new File([blob], `${localBook.title}.epub`, { type: mimeType });
              
              console.log(`Successfully loaded cached file for book ${localBook.id}`);
            } catch (error) {
              console.error(`Error loading cached file for ${localBook.id}:`, error);
              // If local cache fails, we'll try fetching from URL below
            }
          }

          // If local cache fails or doesn't exist, try fetching from URL
          if (!file && localBook.content_url) {
            try {
              console.log(`Fetching file from URL for book ${localBook.id}`);
              file = await bookService.fetchBookFile(localBook.content_url);
              console.log(`Successfully fetched file from URL for book ${localBook.id}`);
            } catch (error) {
              console.error(`Error fetching file from URL for ${localBook.id}:`, error);
            }
          }

          if (!file) {
            console.error(`Could not load file for book ${localBook.id}`);
            return null;
          }

          return {
            id: localBook.id,
            title: localBook.title,
            type: file.type,
            progress: localBook.read_progress || 0,
            file,
            shelf: 1,
            coverUrl: localBook.cover_image,
            supabaseId: localBook.synced_with_supabase ? localBook.id : undefined,
            is_manual: localBook.is_manual,
            local_content_path: localBook.local_content_path
          } as Book;
        }));

        const validBooks = convertedBooks.filter((book): book is Book => book !== null);
        console.log('Setting books in state:', validBooks.length);
        setBooks(validBooks);
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!loading && user) {
      console.log('User logged in, loading books...');
      loadBooks();
    } else if (!loading && !user) {
      console.log('No user, redirecting to auth...');
      router.push('/auth');
    }
  }, [loading, user, router]);

  const addBook = async (file: File) => {
    try {
      let coverUrl: string | undefined = undefined;

      // Try to extract cover if it's an EPUB or PDF
      if (file.type === 'application/epub+zip') {
        const extractedCover = await extractEpubCover(file);
        if (extractedCover) {
          coverUrl = extractedCover;
        }
      } else if (file.type === 'application/pdf') {
        const extractedCover = await extractPdfCover(file);
        if (extractedCover) {
          coverUrl = extractedCover;
        }
      }

      // Add the book using BookService
      const localBook = await bookService.addManualBook(file, file.name, coverUrl);

      // Convert to our Book format and add to state
      const newBook: Book = {
        id: localBook.id,
        title: localBook.title,
        type: file.type,
        progress: 0,
        file: file,
        shelf: 1,
        coverUrl: localBook.cover_image,
        is_manual: true,
        local_content_path: localBook.local_content_path
      };

      setBooks(prevBooks => [...prevBooks, newBook]);
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const openBook = (book: Book) => {
    setSelectedBook(book);
  };

  const closeBook = async () => {
    if (selectedBook?.supabaseId && selectedBook.progress > 0) {
      // Update progress in Supabase if it's a Supabase book
      await bookService.updateBookProgress(selectedBook.supabaseId, selectedBook.progress);
    }
    setSelectedBook(null);
  };

  const handleBooksChange = (newBooks: Book[]) => {
    setBooks(newBooks);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading your books...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0F1C] text-white p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsProfileMenuOpen(true)}
            className="flex items-center focus:outline-none relative group"
          >
            <div className="absolute inset-0 bg-white/10 rounded-full blur-sm transition-opacity opacity-0 group-hover:opacity-100" />
            <Avatar className="h-10 w-10 border-2 border-transparent transition-colors bg-white group-hover:border-white/20">
              <AvatarImage 
                src={user?.user_metadata?.avatar_url || "/placeholder-avatar.png"} 
                alt="User profile"
                className="object-cover opacity-90"
              />
              <AvatarFallback className="bg-white flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-7 h-7"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </AvatarFallback>
            </Avatar>
          </button>
          <h1 className="text-2xl font-bold flex-grow text-center">DassoShu</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Sun className="h-5 w-5" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      {/* Fixed Navigation with Filter */}
      <nav className="fixed top-[72px] left-0 right-0 z-40 bg-[#0A0F1C] text-white px-4 shadow-lg">
        {/* Navigation Icons */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <NavItem icon={Library} label="Bookshelf" active={activeNav === "Bookshelf"} onClick={() => setActiveNav("Bookshelf")} />
          <NavItem icon={Compass} label="Discover" active={activeNav === "Discover"} onClick={() => setActiveNav("Discover")} />
          <NavItem icon={FileText} label="Note" active={activeNav === "Note"} onClick={() => setActiveNav("Note")} />
          <NavItem icon={FileText} label="Flashcards" active={activeNav === "Flashcards"} onClick={() => setActiveNav("Flashcards")} />
        </div>
        
        {/* Filter Bar - Only show when Bookshelf is active */}
        {activeNav === "Bookshelf" && (
          <div className="flex items-center justify-between py-2 border-t border-gray-200/20">
            <Button 
              variant="ghost" 
              className="text-lg font-semibold text-gray-200 hover:bg-gray-200/10"
            >
              Filter
            </Button>
            <Select>
              <SelectTrigger 
                className="w-[180px] bg-gray-200/10 border-gray-200/20 text-gray-200 
                           hover:bg-gray-200/15 focus:ring-gray-200/20"
              >
                <SelectValue placeholder="All Books" />
              </SelectTrigger>
              <SelectContent 
                className="bg-gray-100 border-gray-200/20 shadow-lg"
              >
                <SelectItem 
                  value="all" 
                  className="text-gray-800 hover:bg-gray-200 focus:bg-gray-200 focus:text-gray-900"
                >
                  All Books
                </SelectItem>
                <SelectItem 
                  value="reading" 
                  className="text-gray-800 hover:bg-gray-200 focus:bg-gray-200 focus:text-gray-900"
                >
                  Currently Reading
                </SelectItem>
                <SelectItem 
                  value="completed" 
                  className="text-gray-800 hover:bg-gray-200 focus:bg-gray-200 focus:text-gray-900"
                >
                  Completed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </nav>

      {/* Main Content Area with safe area padding */}
      <div className="flex-1 pt-[172px]">
        <div className="h-full overflow-hidden">
          {activeNav === "Bookshelf" && (
            <BookshelfContent 
              books={books} 
              addBook={addBook} 
              openBook={openBook}
              onBooksChange={handleBooksChange}
            />
          )}
          {activeNav === "Discover" && <DiscoveryContent />}
          {activeNav === "Note" && <NoteContent />}
          {activeNav === "Flashcards" && <FlashcardsContent />}
        </div>
      </div>

      {isProfileMenuOpen && (
        <ProfileMenu onClose={() => setIsProfileMenuOpen(false)} />
      )}

      {selectedBook && (
        <Reader file={selectedBook.file} onClose={closeBook} />
      )}
    </div>
  )
}

function NavItem({ 
  icon: Icon, 
  label, 
  active,
  onClick 
}: { 
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2" onClick={onClick}>
      <Icon className={cn("h-7 w-7", active ? "text-white" : "text-gray-400")} />
      <span className={cn("text-xs", active ? "text-white" : "text-gray-400")}>{label}</span>
    </div>
  )
}
