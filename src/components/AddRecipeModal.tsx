import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileImage, Link as LinkIcon, PenSquare, Upload, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface AddRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadResponse {
  success: boolean;
  uploadId: string;
  storageId: string;
  storageUrl: string;
  filename: string;
  size: number;
  contentType: string;
  analysisId?: string;
  error?: string;
  code?: string;
}

/**
 * File type validation constants
 * Matches OpenAI Vision API supported formats
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates file on the frontend before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum 10MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not supported. Use PNG, JPEG, WEBP, or GIF`,
    };
  }

  // Check file extension
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" is not supported. Use .jpg, .jpeg, .png, .webp, or .gif`,
    };
  }

  return { valid: true };
}

export function AddRecipeModal({ open, onOpenChange }: AddRecipeModalProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setError(null);
      setSuccess(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    handleFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    const file = files.length > 0 ? files[0] : null;
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get Convex site URL for HTTP actions
      const convexUrl = (import.meta as any).env.VITE_CONVEX_URL as string;
      const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
      const uploadUrl = `${siteUrl}/upload`;

      // Create FormData
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("filename", selectedFile.name);

      // Upload to Convex HTTP action
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Upload failed");
      }

      setSuccess(
        `Recipe image uploaded! Vision analysis is processing and will appear in your cookbook shortly.`
      );
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById("recipe-file-input");
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = "";
      }

      // Invalidate all queries to ensure cookbook refreshes with new recipe
      // Convex queries are reactive, but explicit invalidation ensures immediate update
      await queryClient.invalidateQueries();

      // Close modal after 2 seconds to show success message
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        setError(null);
      }, 2000);
    } catch (err) {
      console.error("Upload error:", err);

      // Provide user-friendly error messages
      if (err instanceof Error) {
        if (err.message.includes("fetch")) {
          setError("Network error: Unable to reach server. Please check your connection.");
        } else if (err.message.includes("INVALID_FILE")) {
          setError("Invalid file type. Please upload a PNG, JPEG, WEBP, or GIF image.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    const fileInput = document.getElementById("recipe-file-input");
    if (fileInput instanceof HTMLInputElement) {
      fileInput.value = "";
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      // Small delay to allow exit animation
      const timeout = setTimeout(() => {
        resetForm();
        setUploading(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Recipe</DialogTitle>
          <DialogDescription>
            Choose how you'd like to add a new recipe to your cookbook
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">
              <FileImage className="h-4 w-4 mr-2" />
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="link" disabled>
              <LinkIcon className="h-4 w-4 mr-2" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="manual" disabled>
              <PenSquare className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="file" className="space-y-4 mt-4" keepMounted>
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${selectedFile ? "bg-muted/50" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="recipe-file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  onChange={handleInputChange}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />

                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  {selectedFile ? (
                    <>
                      <FileImage className="h-12 w-12 text-primary" />
                      <div className="space-y-1">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetForm();
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="font-medium">
                          Drag & drop your recipe image here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* File Requirements */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Accepted formats:</p>
                <p>PNG, JPEG, WEBP, GIF (max 10MB)</p>
                <p className="text-xs italic mt-2">
                  Our AI will analyze the image and extract recipe details automatically
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Success Display */}
              {success && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm dark:bg-green-900/20 dark:border-green-900 dark:text-green-400">
                  {success}
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    Uploading & Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Analyze Recipe
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Website Link Tab (Placeholder) */}
          <TabsContent value="link" className="space-y-4 mt-4" keepMounted>
            <div className="text-center text-muted-foreground py-12">
              <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>URL import coming soon</p>
            </div>
          </TabsContent>

          {/* Manual Entry Tab (Placeholder) */}
          <TabsContent value="manual" className="space-y-4 mt-4" keepMounted>
            <div className="text-center text-muted-foreground py-12">
              <PenSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Manual entry coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
