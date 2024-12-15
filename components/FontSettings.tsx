"use client"

import * as React from "react"
import { ChevronDown, AlignLeft, AlignCenter, AlignRight, Type, AlignVerticalSpaceBetween, AlignVerticalSpaceAround, AlignVerticalJustifyCenter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export interface FontOption {
  name: string;
  family: string;
  className: string;
}

// Define font options with their display names
export const FONT_OPTIONS: FontOption[] = [
  { 
    name: 'System Standard Mode', 
    family: `
      system-ui,
      -apple-system,
      'PingFang SC',
      'Microsoft YaHei',
      'Noto Sans SC',
      sans-serif
    `.replace(/\s+/g, ' ').trim(),
    className: ''
  },
  { 
    name: 'System Learning Mode', 
    family: `
      'Source Han Sans SC',
      'Noto Sans SC',
      'Microsoft YaHei',
      'PingFang SC',
      sans-serif
    `.replace(/\s+/g, ' ').trim(),
    className: ''
  },
  { 
    name: 'System Classical Mode', 
    family: `
      'Songti SC',
      'SimSun',
      'STSong',
      'Source Han Serif SC',
      serif
    `.replace(/\s+/g, ' ').trim(),
    className: ''
  }
];

interface FontSettingsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  alignment: string;
  setAlignment: (alignment: string) => void;
  lineSpacing: number;
  setLineSpacing: (spacing: number) => void;
  fontStyle: string;
  setFontStyle: (font: string) => void;
  theme: 'light' | 'dark';
  colorTheme: string;
}

export function FontSettings({
  fontSize,
  setFontSize,
  alignment,
  setAlignment,
  lineSpacing,
  setLineSpacing,
  fontStyle,
  setFontStyle,
  theme,
  colorTheme
}: FontSettingsProps) {

  // Handle value changes with proper types
  const handleFontSizeChange = (value: string) => {
    if (value) setFontSize(parseInt(value));
  };

  const handleAlignmentChange = (value: string) => {
    if (value) setAlignment(value);
  };

  const handleLineSpacingChange = (value: string) => {
    if (value) setLineSpacing(parseFloat(value));
  };

  const getHoverClass = () => {
    switch (colorTheme) {
      case "sepia":
        return "hover:bg-[#E9DCC0] data-[state=on]:bg-[#E9DCC0]";
      case "pink":
        return "hover:bg-pink-200 data-[state=on]:bg-pink-200";
      case "mint":
        return "hover:bg-green-200 data-[state=on]:bg-green-200";
      case "dark":
        return "hover:bg-gray-800 data-[state=on]:bg-gray-800";
      default:
        return theme === 'dark' 
          ? "hover:bg-gray-800 data-[state=on]:bg-gray-800" 
          : "hover:bg-gray-100 data-[state=on]:bg-gray-100";
    }
  };

  return (
    <div className="space-y-4">
      {/* Font Size */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground/80">Font Size</span>
          <span className="text-sm font-medium text-foreground/80">{fontSize}px</span>
        </div>
        <ToggleGroup 
          type="single" 
          value={fontSize.toString()} 
          onValueChange={handleFontSizeChange}
          className="inline-flex items-center justify-between border rounded-lg p-1 w-full bg-background/50"
        >
          <ToggleGroupItem 
            value="12" 
            aria-label="Decrease font size" 
            className={cn("p-1 sm:p-2", getHoverClass())}
          >
            <Type className="h-3 w-3 sm:h-4 sm:w-4" />
          </ToggleGroupItem>
          {[14, 16, 18, 20, 22, 24, 26, 28].map((size) => (
            <ToggleGroupItem 
              key={size} 
              value={size.toString()} 
              aria-label={`${size}px font size`} 
              className={cn("p-1 sm:p-2 rounded-full", getHoverClass())}
            >
              <div className="w-1 h-1 bg-current rounded-full" />
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem 
            value="32" 
            aria-label="Increase font size" 
            className={cn("p-1 sm:p-2", getHoverClass())}
          >
            <Type className="h-4 w-4 sm:h-5 sm:w-5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Alignment and Line Spacing in Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Alignment */}
        <div>
          <span className="block text-sm font-medium text-foreground/80 mb-2">Alignment</span>
          <ToggleGroup 
            type="single" 
            value={alignment} 
            onValueChange={handleAlignmentChange}
            className="inline-flex justify-between border rounded-lg p-1 w-full bg-background/50"
          >
            <ToggleGroupItem 
              value="left" 
              aria-label="Left align" 
              className={cn("flex-1 p-1.5 sm:p-2", getHoverClass())}
            >
              <AlignLeft className="h-3 w-3 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="center" 
              aria-label="Center align" 
              className={cn("flex-1 p-1.5 sm:p-2", getHoverClass())}
            >
              <AlignCenter className="h-3 w-3 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="right" 
              aria-label="Right align" 
              className={cn("flex-1 p-1.5 sm:p-2", getHoverClass())}
            >
              <AlignRight className="h-3 w-3 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Line Spacing */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground/80">Line Spacing</span>
            <span className="text-sm font-medium text-foreground/80">{lineSpacing.toFixed(1)}x</span>
          </div>
          <ToggleGroup 
            type="single" 
            value={lineSpacing.toString()} 
            onValueChange={handleLineSpacingChange}
            className="inline-flex justify-between border rounded-lg p-1 w-full bg-background/50"
          >
            <ToggleGroupItem 
              value="1" 
              aria-label="Single line spacing" 
              className={cn("flex-1 p-1.5 sm:p-2", getHoverClass())}
            >
              <AlignVerticalSpaceBetween className="h-3 w-3 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="1.5" 
              aria-label="One and a half line spacing" 
              className={cn("flex-1 p-1.5 sm:p-2", getHoverClass())}
            >
              <AlignVerticalSpaceAround className="h-3 w-3 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="2" 
              aria-label="Double line spacing" 
              className={cn("flex-1 p-1.5 sm:p-2", getHoverClass())}
            >
              <AlignVerticalJustifyCenter className="h-3 w-3 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Font Style - Inline Layout */}
      <div className="mt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">Font Style</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "flex-1 h-9 px-3 justify-between bg-background/50 text-sm",
                  getHoverClass()
                )}
                style={{ fontFamily: fontStyle }}
              >
                {FONT_OPTIONS.find(font => font.family === fontStyle)?.name || 'Select Font'}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-[calc(100vw-2rem)] mx-4 max-h-[120px] overflow-y-auto"
              align="center"
              side="top"
            >
              {FONT_OPTIONS.map((font) => (
                <DropdownMenuItem 
                  key={font.name} 
                  onSelect={() => {
                    setFontStyle(font.family);
                    document.body.style.fontFamily = font.family;
                    setTimeout(() => {
                      document.body.style.fontFamily = '';
                    }, 50);
                  }}
                  className={cn("w-full", getHoverClass())}
                  style={{ fontFamily: font.family }}
                >
                  {font.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 