import * as React from "react"
import { Sun } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

interface BackgroundSettingsProps {
  backgroundSettingsVisible: boolean;
  setBackgroundSettingsVisible: (visible: boolean) => void;
  brightness: number;
  setBrightness: (brightness: number) => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  isDarkMode: boolean;
  theme: 'light' | 'dark';
}

export function BackgroundSettings({
  backgroundSettingsVisible,
  setBackgroundSettingsVisible,
  brightness,
  setBrightness,
  colorTheme,
  setColorTheme,
  isDarkMode,
  theme
}: BackgroundSettingsProps) {
  const handleBrightnessChange = (value: string) => {
    if (value) setBrightness(parseInt(value));
  };

  const handleColorThemeChange = (value: string) => {
    if (value) setColorTheme(value);
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
    <div className="h-full flex flex-col">
      <div className="space-y-6 sm:space-y-4">
        {/* Brightness Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground/80">Brightness</span>
            <span className="text-sm font-medium text-foreground/80">
              {brightness === 100 ? "System" : `${brightness}%`}
            </span>
          </div>
          <ToggleGroup 
            type="single" 
            value={brightness.toString()} 
            onValueChange={handleBrightnessChange}
            className="inline-flex items-center justify-between border rounded-lg p-1 w-full bg-background/50"
          >
            <ToggleGroupItem 
              value="20" 
              aria-label="20% brightness" 
              className={cn("flex-1 p-1.5 sm:p-1", getHoverClass())}
            >
              <Sun className="h-3 w-3 sm:h-4 sm:w-4 opacity-30 mx-auto" />
            </ToggleGroupItem>
            {[40, 60, 80, 100].map((value) => (
              <ToggleGroupItem 
                key={value} 
                value={value.toString()} 
                aria-label={`${value}% brightness`} 
                className={cn("flex-1 p-1.5 sm:p-1 rounded-full", getHoverClass())}
              >
                <div className="w-1 h-1 bg-current rounded-full mx-auto" />
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem 
              value="120" 
              aria-label="120% brightness" 
              className={cn("flex-1 p-1.5 sm:p-1", getHoverClass())}
            >
              <Sun className="h-4 w-4 sm:h-4 sm:w-4 mx-auto" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Color Theme Selection - Disabled in dark mode */}
        <div className={isDarkMode ? "opacity-50 pointer-events-none" : ""}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground/80">Theme</span>
            {isDarkMode && (
              <span className="text-xs text-muted-foreground">
                Disabled in dark mode
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3 px-1">
            <button
              onClick={() => handleColorThemeChange("default")}
              className={cn(
                "w-full aspect-[4/3] rounded-full bg-white border-2 transition-colors",
                colorTheme === "default" ? "border-primary ring-2 ring-primary/20" : "border-transparent",
                theme === 'dark' ? "hover:bg-gray-800" : "hover:bg-gray-100"
              )}
              aria-label="Default theme"
              disabled={isDarkMode}
            />
            <button
              onClick={() => handleColorThemeChange("sepia")}
              className={cn(
                "w-full aspect-[4/3] rounded-full bg-[#F4ECD8] border-2 transition-colors hover:bg-[#E9DCC0]",
                colorTheme === "sepia" ? "border-primary ring-2 ring-primary/20" : "border-transparent"
              )}
              aria-label="Sepia theme"
              disabled={isDarkMode}
            />
            <button
              onClick={() => handleColorThemeChange("pink")}
              className={cn(
                "w-full aspect-[4/3] rounded-full bg-pink-100 border-2 transition-colors hover:bg-pink-200",
                colorTheme === "pink" ? "border-primary ring-2 ring-primary/20" : "border-transparent"
              )}
              aria-label="Pink theme"
              disabled={isDarkMode}
            />
            <button
              onClick={() => handleColorThemeChange("mint")}
              className={cn(
                "w-full aspect-[4/3] rounded-full bg-green-100 border-2 transition-colors hover:bg-green-200",
                colorTheme === "mint" ? "border-primary ring-2 ring-primary/20" : "border-transparent"
              )}
              aria-label="Mint theme"
              disabled={isDarkMode}
            />
            <button
              onClick={() => handleColorThemeChange("dark")}
              className={cn(
                "w-full aspect-[4/3] rounded-full bg-gray-900 border-2 transition-colors hover:bg-gray-800",
                colorTheme === "dark" ? "border-primary ring-2 ring-primary/20" : "border-transparent"
              )}
              aria-label="Dark theme"
              disabled={isDarkMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 