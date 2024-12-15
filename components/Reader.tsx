import React, { useState, useEffect, useRef, TouchEvent, MouseEvent, useMemo } from 'react';
import { ReactReader } from 'react-reader';
import { ChevronLeft, ChevronRight, X, Battery, Clock, Sun, Moon, Type, Palette, Volume2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer, Node as XMLNode } from '@xmldom/xmldom';
import Epub from 'epubjs';
import { FontSettings } from '@/components/FontSettings';
import { BackgroundSettings } from '@/components/BackgroundSettings';
import { AudioSettings } from '@/components/AudioSettings';
import { MicSettings } from '@/components/MicSettings';
import { FONT_OPTIONS } from './FontSettings';

// Dynamic import for PDF.js to avoid SSR issues
const pdfjsLib = typeof window !== 'undefined' ? require('pdfjs-dist') : null;
if (typeof window !== 'undefined' && pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.min.js');
}

interface ReaderProps {
  file: File;
  onClose: () => void;
}

interface PaginationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  currentPage: number;
  totalPages: number;
}

interface PageContent {
  text: string;
  pageNumber: number;
  title?: string;
}

// Constants for unified page layout across all file types
const READER_LAYOUT = {
  CONTENT: {
    WIDTH: {
      MOBILE: {
        PORTRAIT: '100vw',
        LANDSCAPE: '90vw'
      },
      TABLET: {
        PORTRAIT: '85vw',
        LANDSCAPE: '80vw'
      },
      DESKTOP: '38rem',
      MIN: '280px'
    },
    MARGIN: {
      MOBILE: {
        PORTRAIT: '0.375rem',  // 6px - minimal for portrait
        LANDSCAPE: '0.75rem'   // 12px - comfortable for landscape
      },
      TABLET: {
        PORTRAIT: '0.5rem',    // 8px
        LANDSCAPE: '1rem'      // 16px
      },
      DESKTOP: '1rem'         // 16px
    }
  },
  SPACING: {
    HEADER: {
      MOBILE: '2.5rem',      // 40px - reduced for more content
      TABLET: '2.75rem',     // 44px
      DESKTOP: '3rem',       // 48px
      COMPACT: '2.25rem'     // 36px - even more compact for landscape
    },
    FOOTER: {
      MOBILE: '2.5rem',
      TABLET: '2.75rem',
      DESKTOP: '3rem',
      COMPACT: '2.25rem'
    },
    PAGE: {
      MOBILE: {
        PORTRAIT: '0.375rem',  // 6px
        LANDSCAPE: '0.75rem'   // 12px
      },
      TABLET: {
        PORTRAIT: '0.5rem',    // 8px
        LANDSCAPE: '1rem'      // 16px
      },
      DESKTOP: '1rem'         // 16px
    }
  },
  TYPOGRAPHY: {
    SIZE: {
      BASE: {
        MOBILE: {
          PORTRAIT: '15px',    // Smaller for portrait
          LANDSCAPE: '16px'    // Slightly larger for landscape
        },
        TABLET: '16px',
        DESKTOP: '17px',
        MIN: '14px',
        MAX: '20px'           // Reduced max size
      },
      SCALE: {
        H1: 1.4,              // Reduced heading scales
        H2: 1.25,
        H3: 1.15,
        SMALL: 0.875
      }
    },
    LINE_HEIGHT: {
      // More precise line heights based on font size
      MOBILE: {
        PORTRAIT: 1.45,       // Tighter for portrait
        LANDSCAPE: 1.5        // Slightly looser for landscape
      },
      TABLET: 1.55,
      DESKTOP: 1.6,
      COMPACT: 1.4
    },
    SPACING: {
      PARAGRAPH: {
        MOBILE: '0.35em',     // Very compact like Huawei
        TABLET: '0.5em',
        DESKTOP: '0.75em'
      }
    },
    // Chinese text specific settings
    CJK: {
      LETTER_SPACING: '-0.02em',
      WORD_SPACING: '0.05em'
    }
  }
};

const PaginationControls = ({ onPrevious, onNext, currentPage, totalPages }: PaginationControlsProps) => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-lg">
    <button
      onClick={onPrevious}
      className="p-2 rounded-full hover:bg-accent"
      aria-label="Previous page"
      disabled={currentPage <= 1}
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
    <span className="text-sm font-medium">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={onNext}
      className="p-2 rounded-full hover:bg-accent"
      aria-label="Next page"
      disabled={currentPage >= totalPages}
    >
      <ChevronRight className="w-6 h-6" />
    </button>
  </div>
);

interface PagedContentProps {
  content: string;
  className?: string;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  currentPage: number;
  totalPages: number;
  fileName: string;
  chapterName?: string;
  onContentTap: () => void;
  style?: React.CSSProperties & { className?: string };
  fontSize: number;
  fontStyle: string;
  alignment: string;
  lineSpacing: number;
  theme: 'light' | 'dark';
  colorTheme: string;
  getBackgroundStyle: (isBar: boolean) => React.CSSProperties;
}

const PagedContent = ({
  content,
  className,
  onNextPage,
  onPrevPage,
  currentPage,
  totalPages,
  fileName,
  chapterName,
  onContentTap,
  style,
  fontSize,
  fontStyle,
  alignment,
  lineSpacing,
  theme,
  colorTheme,
  getBackgroundStyle
}: PagedContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isPortrait, setIsPortrait] = useState(true);
  
  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get battery status if available
  useEffect(() => {
    const getBatteryStatus = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        } catch (error) {
          console.warn('Battery status not available:', error);
        }
      }
    };
    
    getBatteryStatus();
  }, []);

  // Orientation detection
  useEffect(() => {
    const checkOrientation = () => {
      setTimeout(() => {
        const isPortraitMode = window.innerHeight > window.innerWidth;
        setIsPortrait(isPortraitMode);
      }, 100);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Calculate current layout values based on orientation
  const currentLayout = useMemo(() => ({
    fontSize: isPortrait 
      ? READER_LAYOUT.TYPOGRAPHY.SIZE.BASE.MOBILE.PORTRAIT
      : READER_LAYOUT.TYPOGRAPHY.SIZE.BASE.MOBILE.LANDSCAPE,
    margins: isPortrait
      ? READER_LAYOUT.CONTENT.MARGIN.MOBILE.PORTRAIT
      : READER_LAYOUT.CONTENT.MARGIN.MOBILE.LANDSCAPE,
    padding: isPortrait
      ? READER_LAYOUT.SPACING.PAGE.MOBILE.PORTRAIT
      : READER_LAYOUT.SPACING.PAGE.MOBILE.LANDSCAPE,
    // Keep line height more stable to prevent jarring changes
    lineHeight: READER_LAYOUT.TYPOGRAPHY.LINE_HEIGHT.MOBILE.PORTRAIT // Consistent line height
  }), [isPortrait]);

  // Preserve existing touch handling
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const swipeThreshold = 50;
    const swipeDistance = touchEndX.current - touchStartX.current;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0 && onPrevPage) {
        onPrevPage();
      } else if (swipeDistance < 0 && onNextPage) {
        onNextPage();
      }
    } else {
      // Handle tap - preserve existing logic
      if (!containerRef.current) return;
      
      const { left, width } = containerRef.current.getBoundingClientRect();
      const tapX = touchEndX.current - left;
      const tapZoneWidth = width * 0.2;
      
      if (tapX < tapZoneWidth && onPrevPage) {
        onPrevPage();
      } else if (tapX > width - tapZoneWidth && onNextPage) {
        onNextPage();
      } else {
        onContentTap();
      }
    }
  };

  // Preserve existing click handling for desktop
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    if (!containerRef.current) return;
    
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - left;
    const clickZoneWidth = width * 0.2;
    
    if (clickX < clickZoneWidth && onPrevPage) {
      onPrevPage();
    } else if (clickX > width - clickZoneWidth && onNextPage) {
      onNextPage();
    } else {
      onContentTap();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "max-w-4xl mx-auto h-full overflow-hidden relative select-none flex flex-col",
        "touch-pan-y overscroll-none", // Enable smooth vertical panning
        "will-change-transform transform-gpu", // Optimize for animations
        "backface-visibility-hidden", // Prevent flickering
        className
      )}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      {/* Navigation Indicators - Optimized for touch */}
      <div 
        className={cn(
          "absolute inset-y-0 left-0 w-1/5 cursor-pointer",
          "touch-none select-none",
          "active:bg-gray-200/20", // Visual feedback on touch
          "transition-colors duration-75" // Quick transition for feedback
        )} 
      />
      <div 
        className={cn(
          "absolute inset-y-0 right-0 w-1/5 cursor-pointer",
          "touch-none select-none",
          "active:bg-gray-200/20", // Visual feedback on touch
          "transition-colors duration-75" // Quick transition for feedback
        )} 
      />
      
      {/* Content with proper padding and font settings */}
      <div className="h-full flex flex-col px-4 md:px-8">
        {/* Header space - Dynamic based on screen size */}
        <div 
          className="flex-shrink-0" 
          style={{
            height: `clamp(${READER_LAYOUT.SPACING.HEADER.COMPACT}, 
              ${READER_LAYOUT.SPACING.HEADER.MOBILE}, 
              ${READER_LAYOUT.SPACING.HEADER.DESKTOP})`,
            willChange: 'height', // Optimize height animations
          }}
        />

        {/* Main content container - Calculate exact height */}
        <div 
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            "transform-gpu will-change-transform", // Optimize animations
            "backface-visibility-hidden" // Prevent flickering
          )}
        >
          {/* Content wrapper with fixed dimensions */}
          <div 
            className="flex-1 flex flex-col"
            style={{
              height: '100%',
              minHeight: '0',
              margin: '0 auto',
              width: '100%',
              maxWidth: isPortrait 
                ? READER_LAYOUT.CONTENT.WIDTH.MOBILE.PORTRAIT
                : READER_LAYOUT.CONTENT.WIDTH.MOBILE.LANDSCAPE,
              position: 'relative',
              willChange: 'transform', // Optimize transforms
              transform: 'translateZ(0)', // Force GPU acceleration
            }}
          >
            {/* Content area with orientation-aware styling */}
            <div 
              className={cn(
                "prose prose-lg",
                "prose-p:my-2",
                "prose-headings:my-3",
                "w-full flex-1",
                "transform-gpu", // Force GPU acceleration
                "backface-visibility-hidden", // Prevent flickering
                (style as any)?.className || ''
              )}
              style={{
                margin: '0 auto',
                padding: `${currentLayout.padding} ${currentLayout.margins}`,
                width: '100%',
                maxWidth: isPortrait 
                  ? READER_LAYOUT.CONTENT.WIDTH.MOBILE.PORTRAIT
                  : READER_LAYOUT.CONTENT.WIDTH.MOBILE.LANDSCAPE,
                fontSize: `${fontSize}px`,
                lineHeight: lineSpacing,
                fontFamily: fontStyle,
                textAlign: alignment as any || 'justify',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                letterSpacing: READER_LAYOUT.TYPOGRAPHY.CJK.LETTER_SPACING,
                wordSpacing: READER_LAYOUT.TYPOGRAPHY.CJK.WORD_SPACING,
                willChange: 'transform', // Optimize transforms
                transform: 'translateZ(0)', // Force GPU acceleration
              } as React.CSSProperties}
            >
              {content}
            </div>
          </div>
        </div>

        {/* Footer - Dynamic based on screen size */}
        <div 
          className={cn(
            "flex-shrink-0 border-t flex justify-between items-center text-sm px-4",
            "backdrop-blur-sm",
            "transform-gpu will-change-transform" // Optimize animations
          )}
          style={{
            ...getBackgroundStyle(true),
            height: `clamp(${READER_LAYOUT.SPACING.FOOTER.COMPACT}, 
              ${READER_LAYOUT.SPACING.FOOTER.MOBILE}, 
              ${READER_LAYOUT.SPACING.FOOTER.DESKTOP})`,
            willChange: 'height', // Optimize height animations
          }}
        >
          <div className={cn(
            "flex items-center space-x-4",
            theme === 'dark' || colorTheme === "dark" ? "text-white" : "text-black/80"
          )}>
            <span>{currentTime}</span>
            {batteryLevel !== null && (
              <div className="flex items-center">
                <Battery className="w-4 h-4 mr-1" />
                <span>{batteryLevel}%</span>
              </div>
            )}
          </div>
          <div className={
            theme === 'dark' || colorTheme === "dark" ? "text-white" : "text-black/80"
          }>
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to extract text content from XML nodes
function extractTextContent(node: XMLNode): string {
  let text = '';
  
  if (node.nodeType === 3) { // Text node
    text = node.nodeValue || '';
  } else if (node.nodeType === 1) { // Element node
    // Safe type assertion since we've checked nodeType === 1 (Element)
    const element = node as unknown as Element & XMLNode;
    const tagName = element.tagName.toLowerCase();
    
    // Add appropriate spacing around block elements
    const isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
    if (isBlock) text += '\n';
    
    // Recursively process child nodes
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      text += extractTextContent(childNodes[i]);
    }
    
    if (isBlock) text += '\n';
  }
  
  return text;
}

const CHARS_PER_LINE = 50;
const DEFAULT_LINES_PER_PAGE = 30;

function formatTextIntoPages(text: string, linesPerPage: number = DEFAULT_LINES_PER_PAGE): PageContent[] {
  // Calculate available height based on font size and line height
  const calculateLinesPerPage = (fontSize: number, lineHeight: number, containerHeight: number) => {
    const lineHeightPx = fontSize * lineHeight;
    return Math.floor(containerHeight / lineHeightPx);
  };

  const words = text.split(/\s+/);
  const pages: PageContent[] = [];
  let currentPage = '';
  let currentLine = '';
  let lineCount = 0;
  
  // Add page break if we detect certain patterns
  const shouldBreakPage = (word: string) => {
    return /\f|\u2028|\u2029/.test(word) || // Form feed or line separator
           /^(?:[#\-=]{3,}|[*_]{3,})$/.test(word); // Common section breaks
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Force page break if we detect a break pattern
    if (shouldBreakPage(word)) {
      if (currentPage.trim()) {
        pages.push({
          text: currentPage.trim(),
          pageNumber: pages.length + 1
        });
      }
      currentPage = '';
      lineCount = 0;
      continue;
    }
    
    // Check if adding this word would exceed line length
    if ((currentLine + ' ' + word).length > CHARS_PER_LINE) {
      currentPage += currentLine + '\n';
      lineCount++;
      currentLine = word;
      
      // Check if we need to start a new page
      if (lineCount >= linesPerPage) {
        // Don't split in the middle of a paragraph if possible
        const nextFewWords = words.slice(i + 1, i + 5).join(' ');
        const isEndOfParagraph = /[.!?]$/.test(word) || nextFewWords.startsWith('\n');
        
        if (isEndOfParagraph || lineCount >= linesPerPage + 2) { // Allow 2 lines overflow for better paragraph breaks
          pages.push({
            text: currentPage.trim(),
            pageNumber: pages.length + 1
          });
          currentPage = '';
          lineCount = 0;
        }
      }
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  // Add the last line and page if they exist
  if (currentLine) {
    currentPage += currentLine;
    if (currentPage.trim()) {
      pages.push({
        text: currentPage.trim(),
        pageNumber: pages.length + 1
      });
    }
  }

  return pages;
}

async function parseEpub(file: File): Promise<PageContent[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const content = await zip.loadAsync(arrayBuffer);
    
    // Find container.xml
    const containerFile = content.file('META-INF/container.xml');
    if (!containerFile) {
      console.warn('No container.xml found, trying direct content extraction');
      const htmlFiles = Object.keys(content.files).filter(path => 
        path.endsWith('.html') || path.endsWith('.xhtml') || path.endsWith('.htm')
      );
      
      if (htmlFiles.length === 0) {
        throw new Error('No readable content found in EPUB');
      }
      
      let allText = '';
      for (const htmlPath of htmlFiles) {
        const htmlFile = content.file(htmlPath);
        if (htmlFile) {
          const htmlContent = await htmlFile.async('text');
          const doc = new DOMParser().parseFromString(htmlContent, 'text/html') as unknown as Document & { body: HTMLElement };
          if (doc.body) {
            const text = extractTextContent(doc.body as unknown as XMLNode);
            allText += text + '\n\n';
          }
        }
      }
      
      return formatTextIntoPages(allText);
    }
    
    // Normal EPUB processing
    const containerXml = await containerFile.async('text');
    const parser = new DOMParser();
    const container = parser.parseFromString(containerXml, 'text/xml');
    const opfPath = container.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
    
    if (!opfPath) {
      throw new Error('Invalid EPUB: Cannot find OPF file');
    }
    
    const opfFile = content.file(opfPath);
    if (!opfFile) {
      throw new Error('Invalid EPUB: Cannot read OPF file');
    }
    
    const opfContent = await opfFile.async('text');
    const opf = parser.parseFromString(opfContent, 'text/xml');
    
    // Get spine order
    const spine = Array.from(opf.getElementsByTagName('spine')[0].getElementsByTagName('itemref'))
      .map(item => item.getAttribute('idref'))
      .filter((id): id is string => id !== null);
    
    // Get manifest items
    const manifest = Array.from(opf.getElementsByTagName('manifest')[0].getElementsByTagName('item'))
      .reduce((acc, item) => {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        if (id && href) acc[id] = href;
        return acc;
      }, {} as { [key: string]: string });
    
    // Get the base directory of the OPF file
    const opfDir = opfPath.split('/').slice(0, -1).join('/');
    const addBaseDir = (path: string) => opfDir ? `${opfDir}/${path}` : path;
    
    // Extract and parse each chapter in spine order
    let allText = '';
    
    for (const itemRef of spine) {
      const href = manifest[itemRef];
      if (!href) continue;
      
      const chapterPath = addBaseDir(href);
      const chapterFile = content.file(chapterPath);
      if (!chapterFile) continue;
      
      const chapterContent = await chapterFile.async('text');
      const doc = parser.parseFromString(chapterContent, 'text/html');
      const titleElement = doc.getElementsByTagName('title')[0] || doc.getElementsByTagName('h1')[0];
      const title = titleElement?.textContent || '';
      const body = doc.getElementsByTagName('body')[0];
      
      if (body) {
        const text = extractTextContent(body as unknown as XMLNode);
        if (title) allText += `\n${title}\n\n`;
        allText += `${text}\n\n`;
      }
    }
    
    return formatTextIntoPages(allText);
  } catch (error) {
    console.error('Error parsing EPUB:', error);
    return [{
      text: `Error parsing EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      pageNumber: 1
    }];
  }
}

interface FontOption {
  name: string;
  family: string;
  className: string;
}

// Add this helper function for theme-specific hover colors
const getThemeColors = (theme: 'light' | 'dark', colorTheme: string) => {
  if (theme === 'dark') {
    return {
      hoverBg: "rgba(45, 45, 48, 0.95)",      // Slightly lighter than dark background
      activeBg: "rgba(55, 55, 58, 0.95)",      // Even lighter for active state
      borderColor: "rgba(70, 70, 73, 0.95)"    // Subtle border
    };
  }

  switch (colorTheme) {
    case "sepia":
      return {
        hoverBg: "rgba(233, 220, 190, 0.95)",  // Darker sepia
        activeBg: "rgba(225, 210, 175, 0.95)",  // Even darker for active
        borderColor: "rgba(210, 195, 160, 0.95)"
      };
    case "pink":
      return {
        hoverBg: "rgba(252, 205, 205, 0.95)",  // Darker pink
        activeBg: "rgba(249, 185, 185, 0.95)",  // Even darker for active
        borderColor: "rgba(244, 165, 165, 0.95)"
      };
    case "mint":
      return {
        hoverBg: "rgba(190, 242, 205, 0.95)",  // Darker mint
        activeBg: "rgba(170, 232, 185, 0.95)",  // Even darker for active
        borderColor: "rgba(150, 222, 165, 0.95)"
      };
    case "dark":
      return {
        hoverBg: "rgba(45, 45, 48, 0.95)",
        activeBg: "rgba(55, 55, 58, 0.95)",
        borderColor: "rgba(70, 70, 73, 0.95)"
      };
    default:
      return {
        hoverBg: "rgba(235, 235, 235, 0.95)",  // Light gray for default
        activeBg: "rgba(225, 225, 225, 0.95)",  // Slightly darker for active
        borderColor: "rgba(215, 215, 215, 0.95)"
      };
  }
};

export function Reader({ file, onClose }: ReaderProps) {
  const [fileUrl, setFileUrl] = useState<string | ArrayBuffer>('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<PageContent[]>([]);
  const [epubPages, setEpubPages] = useState<PageContent[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [barsVisible, setBarsVisible] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [linesPerPage, setLinesPerPage] = useState(DEFAULT_LINES_PER_PAGE);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activePanel, setActivePanel] = useState<'font' | 'background' | 'audio' | 'mic' | null>(null);
  const [fontSettingsVisible, setFontSettingsVisible] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontStyle, setFontStyle] = useState(FONT_OPTIONS[0].family);
  const [alignment, setAlignment] = useState('left');
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [backgroundSettingsVisible, setBackgroundSettingsVisible] = useState(false);
  const [audioSettingsVisible, setAudioSettingsVisible] = useState(false);
  const [micSettingsVisible, setMicSettingsVisible] = useState(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [colorTheme, setColorTheme] = useState<string>("default");

  // Apply background styles based on settings
  const getBackgroundStyle = (isBar: boolean = false) => {
    let style: React.CSSProperties = {
      filter: `brightness(${brightness}%)`,
    };

    // If dark mode is active, use dark theme colors
    if (theme === 'dark') {
      style.backgroundColor = "rgb(28, 28, 30)"; // Darker background for dark mode
      return style;
    }

    // No more transparency, using solid colors
    switch (colorTheme) {
      case "sepia":
        style.backgroundColor = "#F4ECD8";  // Solid sepia
        break;
      case "pink":
        style.backgroundColor = "rgb(254, 226, 226)";  // Solid pink
        break;
      case "mint":
        style.backgroundColor = "rgb(220, 252, 231)";  // Solid mint
        break;
      case "dark":
        style.backgroundColor = "rgb(28, 28, 30)";  // Solid dark
        break;
      default:
        style.backgroundColor = "rgb(250, 250, 250)";  // Slightly off-white for better contrast
    }

    return style;
  };

  // Set lines per page based on screen height
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLinesPerPage(window.innerHeight < 768 ? 20 : 30);
    }
  }, []);

  // Create content style object
  const contentStyle = useMemo(() => {
    const selectedFont = FONT_OPTIONS.find((font: FontOption) => font.family === fontStyle) || FONT_OPTIONS[0];
    return {
      fontFamily: selectedFont.family,
      fontSize: `${fontSize}px`,
      lineHeight: lineSpacing,
      textAlign: alignment as 'left' | 'center' | 'right',
      fontWeight: 'normal',
      fontFeatureSettings: '"tnum" on, "lnum" on',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      className: selectedFont.className
    };
  }, [fontSize, fontStyle, alignment, lineSpacing]);

  // Handle panel clicks
  const handlePanelClick = (panel: 'font' | 'background' | 'audio' | 'mic') => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      const url = URL.createObjectURL(file);
      setFileUrl(url);

      try {
        if (file.type === 'text/plain') {
          const text = await file.text();
          const pages = formatTextIntoPages(text);
          setTextContent(JSON.stringify(pages)); // Store formatted pages
          setTotalPages(pages.length);
        } 
        else if (file.type === 'application/pdf' && pdfjsLib) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setTotalPages(pdf.numPages);
          
          const pages: PageContent[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const rawText = textContent.items
              .map((item: TextItem | TextMarkedContent) => {
                if ('str' in item) {
                  return item.str;
                }
                return '';
              })
              .join(' ');

            // Format the extracted text
            const formattedPages = formatTextIntoPages(rawText);
            pages.push({
              text: formattedPages[0]?.text || '',
              pageNumber: i
            });
          }
          setPdfPages(pages);
        }
        else if (file.type === 'application/epub+zip') {
          const book = Epub(url);
          const pages = await parseEpub(file);
          setEpubPages(pages);
          setTotalPages(pages.length);
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      if (typeof fileUrl === 'string') {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [file]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setProgress((newPage - 1) / (totalPages - 1) * 100);
  };

  const getCurrentContent = () => {
    if (file.type === 'text/plain' && textContent) {
      const pages = JSON.parse(textContent) as PageContent[];
      const currentPageContent = pages.find(p => p.pageNumber === currentPage);
      return currentPageContent?.text || '';
    }
    if (file.type === 'application/pdf') {
      const page = pdfPages.find(p => p.pageNumber === currentPage);
      return page?.text || '';
    }
    if (file.type === 'application/epub+zip') {
      const page = epubPages.find(p => p.pageNumber === currentPage);
      return page?.text || '';
    }
    return '';
  };

  // Handle tap in content area - simple toggle
  const handleContentTap = () => {
    setBarsVisible(prev => !prev);
    if (barsVisible) {
      setFontSettingsVisible(false);
    }
  };

  const handleFontSettingsClick = () => {
    setFontSettingsVisible(prev => !prev);
    setBackgroundSettingsVisible(false);
    setAudioSettingsVisible(false);
    setMicSettingsVisible(false);
  };

  const handleBackgroundSettingsClick = () => {
    setBackgroundSettingsVisible(prev => !prev);
    setFontSettingsVisible(false);
    setAudioSettingsVisible(false);
    setMicSettingsVisible(false);
  };

  const handleAudioSettingsClick = () => {
    setAudioSettingsVisible(prev => !prev);
    setFontSettingsVisible(false);
    setBackgroundSettingsVisible(false);
    setMicSettingsVisible(false);
  };

  const handleMicSettingsClick = () => {
    setMicSettingsVisible(prev => !prev);
    setFontSettingsVisible(false);
    setBackgroundSettingsVisible(false);
    setAudioSettingsVisible(false);
  };

  const topBar = (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "backdrop-blur-sm border-b",
        "transition-transform duration-300 ease-in-out",
        "flex items-center justify-between px-4 py-2",
        barsVisible ? "translate-y-0" : "-translate-y-full"
      )}
      style={getBackgroundStyle(true)}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-accent"
          aria-label="Back to bookshelf"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-medium truncate">{file.name}</h2>
      </div>
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="p-2 rounded-full hover:bg-accent"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
      </button>
    </div>
  );

  const bottomBar = (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t",
        "transition-transform duration-150",
        barsVisible ? "translate-y-0" : "translate-y-full",
        (fontSettingsVisible || backgroundSettingsVisible || audioSettingsVisible || micSettingsVisible) 
          ? "h-[320px] sm:h-[300px]" 
          : "h-[64px]"
      )}
      style={getBackgroundStyle(true)}
    >
      {/* Bottom Bar Icons */}
      <div className="px-4 py-2 border-b border-border/40" style={getBackgroundStyle(true)}>
        <div className="flex justify-around items-center">
          <button 
            className={cn(
              "p-2 rounded-full transition-colors duration-150",
              "flex flex-col items-center gap-1",
              colorTheme === "sepia" && "hover:bg-[#E9DCC0]",
              colorTheme === "pink" && "hover:bg-pink-200",
              colorTheme === "mint" && "hover:bg-green-200",
              colorTheme === "dark" && "hover:bg-gray-800",
              colorTheme === "default" && (theme === 'dark' ? "hover:bg-gray-800" : "hover:bg-gray-100"),
              fontSettingsVisible && (
                colorTheme === "sepia" ? "bg-[#E9DCC0]" :
                colorTheme === "pink" ? "bg-pink-200" :
                colorTheme === "mint" ? "bg-green-200" :
                colorTheme === "dark" ? "bg-gray-800" :
                theme === 'dark' ? "bg-gray-800" : "bg-gray-100"
              )
            )}
            onClick={handleFontSettingsClick}
          >
            <Type className="h-6 h-6" />
            <span className="text-xs">Font</span>
          </button>
          <button 
            className={cn(
              "p-2 rounded-full transition-colors duration-150",
              "flex flex-col items-center gap-1",
              colorTheme === "sepia" && "hover:bg-[#E9DCC0]",
              colorTheme === "pink" && "hover:bg-pink-200",
              colorTheme === "mint" && "hover:bg-green-200",
              colorTheme === "dark" && "hover:bg-gray-800",
              colorTheme === "default" && (theme === 'dark' ? "hover:bg-gray-800" : "hover:bg-gray-100"),
              backgroundSettingsVisible && (
                colorTheme === "sepia" ? "bg-[#E9DCC0]" :
                colorTheme === "pink" ? "bg-pink-200" :
                colorTheme === "mint" ? "bg-green-200" :
                colorTheme === "dark" ? "bg-gray-800" :
                theme === 'dark' ? "bg-gray-800" : "bg-gray-100"
              )
            )}
            onClick={handleBackgroundSettingsClick}
          >
            <Palette className="h-6 h-6" />
            <span className="text-xs">Background</span>
          </button>
          <button 
            className={cn(
              "p-2 rounded-full transition-colors duration-150",
              "flex flex-col items-center gap-1",
              colorTheme === "sepia" && "hover:bg-[#E9DCC0]",
              colorTheme === "pink" && "hover:bg-pink-200",
              colorTheme === "mint" && "hover:bg-green-200",
              colorTheme === "dark" && "hover:bg-gray-800",
              colorTheme === "default" && (theme === 'dark' ? "hover:bg-gray-800" : "hover:bg-gray-100"),
              audioSettingsVisible && (
                colorTheme === "sepia" ? "bg-[#E9DCC0]" :
                colorTheme === "pink" ? "bg-pink-200" :
                colorTheme === "mint" ? "bg-green-200" :
                colorTheme === "dark" ? "bg-gray-800" :
                theme === 'dark' ? "bg-gray-800" : "bg-gray-100"
              )
            )}
            onClick={handleAudioSettingsClick}
          >
            <Volume2 className="h-6 h-6" />
            <span className="text-xs">Audio</span>
          </button>
          <button 
            className={cn(
              "p-2 rounded-full transition-colors duration-150",
              "flex flex-col items-center gap-1",
              colorTheme === "sepia" && "hover:bg-[#E9DCC0]",
              colorTheme === "pink" && "hover:bg-pink-200",
              colorTheme === "mint" && "hover:bg-green-200",
              colorTheme === "dark" && "hover:bg-gray-800",
              colorTheme === "default" && (theme === 'dark' ? "hover:bg-gray-800" : "hover:bg-gray-100"),
              micSettingsVisible && (
                colorTheme === "sepia" ? "bg-[#E9DCC0]" :
                colorTheme === "pink" ? "bg-pink-200" :
                colorTheme === "mint" ? "bg-green-200" :
                colorTheme === "dark" ? "bg-gray-800" :
                theme === 'dark' ? "bg-gray-800" : "bg-gray-100"
              )
            )}
            onClick={handleMicSettingsClick}
          >
            <Mic className="h-6 h-6" />
            <span className="text-xs">Mic</span>
          </button>
        </div>
      </div>

      {/* Settings Panels */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-150",
          (fontSettingsVisible || backgroundSettingsVisible || audioSettingsVisible || micSettingsVisible)
            ? "h-full opacity-100" 
            : "h-0 opacity-0"
        )}
        style={getBackgroundStyle(true)}
      >
        <div className="p-4 h-full overflow-y-auto">
          {fontSettingsVisible && (
            <FontSettings 
              fontSize={fontSize}
              setFontSize={setFontSize}
              alignment={alignment}
              setAlignment={setAlignment}
              lineSpacing={lineSpacing}
              setLineSpacing={setLineSpacing}
              fontStyle={fontStyle}
              setFontStyle={setFontStyle}
              theme={theme}
              colorTheme={colorTheme}
            />
          )}
          {backgroundSettingsVisible && (
            <BackgroundSettings 
              backgroundSettingsVisible={backgroundSettingsVisible}
              setBackgroundSettingsVisible={setBackgroundSettingsVisible}
              brightness={brightness}
              setBrightness={setBrightness}
              colorTheme={colorTheme}
              setColorTheme={setColorTheme}
              isDarkMode={theme === 'dark'}
              theme={theme}
            />
          )}
          {audioSettingsVisible && (
            <AudioSettings 
              audioSettingsVisible={audioSettingsVisible}
              setAudioSettingsVisible={setAudioSettingsVisible}
            />
          )}
          {micSettingsVisible && (
            <MicSettings 
              micSettingsVisible={micSettingsVisible}
              setMicSettingsVisible={setMicSettingsVisible}
            />
          )}
        </div>
      </div>
    </div>
  );

  const readerContainerClass = cn(
    "fixed inset-0 z-50 flex flex-col",
    "bg-background text-foreground",
    "overscroll-none touch-pan-y",
    "will-change-transform",
    theme === 'dark' ? 'dark' : ''
  );

  const readerContentClass = cn(
    "flex-1 relative overflow-hidden",
    "touch-none select-none",
    "transform-gpu",
    "backface-visibility-hidden",
    "transition-colors duration-200"
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Effect to close all settings panels when bars are hidden
  useEffect(() => {
    if (!barsVisible) {
      setFontSettingsVisible(false);
      setBackgroundSettingsVisible(false);
      setAudioSettingsVisible(false);
      setMicSettingsVisible(false);
    }
  }, [barsVisible]);

  if (isLoading) {
    return (
      <div className={readerContainerClass}>
        {topBar}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={readerContainerClass}
      style={getBackgroundStyle()}
    >
      {topBar}
      <div 
        className={readerContentClass}
      >
        <PagedContent 
          content={getCurrentContent()} 
          className={cn(
            "h-full w-full",
            "transform-gpu will-change-transform",
            theme === 'dark' || colorTheme === "dark" ? "text-white" : "text-black"
          )}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          currentPage={currentPage}
          totalPages={totalPages}
          fileName={file.name}
          onContentTap={handleContentTap}
          style={{
            ...contentStyle,
            color: theme === 'dark' || colorTheme === "dark" ? "white" : "black"
          }}
          fontSize={fontSize}
          fontStyle={fontStyle}
          alignment={alignment}
          lineSpacing={lineSpacing}
          theme={theme}
          colorTheme={colorTheme}
          getBackgroundStyle={getBackgroundStyle}
        />
      </div>
      {bottomBar}
    </div>
  );
}
