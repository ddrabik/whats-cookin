import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

interface UploadResponse {
  success: boolean;
  uploadId: string;
  storageId: string;
  storageUrl: string;
  filename: string;
  size: number;
  contentType: string;
  error?: string;
  code?: string;
}

function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Query to list recent uploads
  const { data: uploads } = useSuspenseQuery(
    convexQuery(api.uploads.queries.listUploads, { limit: 10 }),
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
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
      // HTTP actions use .convex.site, not .convex.cloud (which is for WebSocket)
      const convexUrl = (import.meta as any).env.VITE_CONVEX_URL as string;
      const siteUrl = convexUrl.replace('.convex.cloud', '.convex.site');
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

      setSuccess(`File "${result.filename}" uploaded successfully!`);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById("file-input");
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="p-8 flex flex-col gap-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold">Recipe Upload</h1>

      {/* Upload Section */}
      <div className="flex flex-col gap-4 p-6 border-2 border-gray-300 rounded-lg">
        <h2 className="text-xl font-semibold">Upload Recipe Photo</h2>

        <div className="flex flex-col gap-2">
          <input
            id="file-input"
            type="file"
            accept=".jpg,.jpeg,.png,.heic,.webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />

          {selectedFile && (
            <div className="text-sm text-gray-600">
              Selected: {selectedFile.name} (
              {(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Accepted formats: JPG, PNG, HEIC, WebP (max 10MB)
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Recent Uploads</h2>

        {uploads.length === 0 ? (
          <p className="text-gray-500">No uploads yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {uploads.map((upload) => (
              <div
                key={upload._id}
                className="p-3 border border-gray-200 rounded-lg flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{upload.filename}</div>
                  <div className="text-sm text-gray-500">
                    {upload.contentType} • {(upload.size / 1024).toFixed(2)} KB
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(upload.uploadDate).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
