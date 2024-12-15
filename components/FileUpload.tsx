import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (["epub", "pdf", "txt"].includes(fileType || "")) {
        onFileSelect(file);
        event.target.value = '';
      } else {
        alert("Unsupported file type. Please upload EPUB, PDF, or TXT files.");
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".epub,.pdf,.txt"
        style={{ display: "none" }}
      />
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        size="icon"
        aria-label="Add new book"
        onClick={triggerFileSelect}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}
