import * as React from "react"

interface MicSettingsProps {
  micSettingsVisible: boolean;
  setMicSettingsVisible: (visible: boolean) => void;
}

export function MicSettings({
  micSettingsVisible,
  setMicSettingsVisible
}: MicSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-foreground/80 mb-2">Mic Settings</span>
        <div className="p-4 border rounded-lg bg-background/50">
          {/* Add your mic settings controls here */}
          <p className="text-muted-foreground">Mic settings panel content will go here</p>
        </div>
      </div>
    </div>
  );
} 