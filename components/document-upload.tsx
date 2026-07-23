"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, FileText, File } from "lucide-react";

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
}

export function DocumentUpload({ onFilesSelected }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Filtra arquivos permitidos verificando também a extensão
      const validFiles = newFiles.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return (
          file.type === "application/pdf" || 
          file.type === "application/msword" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          ext === "pdf" || ext === "doc" || ext === "docx"
        );
      });
      
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input 
          type="file" 
          multiple 
          accept=".pdf,.doc,.docx" 
          onChange={handleFileChange} 
          className="cursor-pointer"
        />
      </div>
      
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border text-sm">
              <div className="flex items-center gap-2">
                {file.type === "application/pdf" ? <FileText className="h-4 w-4 text-red-500" /> : <File className="h-4 w-4 text-brand" />}
                <span className="truncate max-w-[250px]">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}