"use client";

import React, { useState, useCallback, useRef } from "react";
import { DropZone } from "./DropZone";
import { UploadQueue } from "./UploadQueue";
import { UploadProgress } from "@/types";
import { generateFileName } from "@/lib/utils";

interface UploadManagerProps {
  onUploadComplete?: (documentIds: string[]) => void;
}

export function UploadManager({ onUploadComplete }: UploadManagerProps) {
  const [queue, setQueue] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllers = useRef<Record<string, AbortController>>({});

  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const newItems: UploadProgress[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        progress: 0,
        status: "pending" as const,
      }));

      setQueue((prev) => [...prev, ...newItems]);

      // Start uploading
      processQueue([...queue, ...newItems], files);
    },
    [queue],
  );

  const processQueue = async (items: UploadProgress[], files: File[]) => {
    if (isUploading) return;
    setIsUploading(true);

    const pendingItems = items.filter((i) => i.status === "pending");
    const completedIds: string[] = [];

    for (const item of pendingItems) {
      const file = files.find((f) => f.name === item.fileName);
      if (!file) continue;

      // Create abort controller for cancellation
      const controller = new AbortController();
      abortControllers.current[item.id] = controller;

      // Update to uploading
      setQueue((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "uploading" as const, progress: 10 }
            : i,
        ),
      );

      try {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);

        // Upload with progress simulation
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: 50 } : i)),
        );

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const result = await response.json();

        if (result.success) {
          const newDocs = result.documents as {
            id: string;
            fileName: string;
            originalName: string;
          }[];

          // Replace parent item with child items in state
          setQueue((prev) => {
            const idx = prev.findIndex((i) => i.id === item.id);
            if (idx === -1) return prev;

            const newQueueItems: UploadProgress[] = newDocs.map((doc) => ({
              id: doc.id,
              fileName: doc.fileName,
              progress: 0,
              status: "processing", // Files are uploaded, now extracting
            }));

            const newQ = [...prev];
            newQ.splice(idx, 1, ...newQueueItems);
            return newQ;
          });

          // Trigger extraction for all resulting documents
          const idsToProcess = newDocs.map((d) => d.id);

          // Process in parallel batches of 5
          const BATCH_SIZE = 5;
          for (let i = 0; i < idsToProcess.length; i += BATCH_SIZE) {
            if (controller.signal.aborted) throw new Error("Aborted");

            const batch = idsToProcess.slice(i, i + BATCH_SIZE);

            // Set initial state for this batch
            setQueue((prev) =>
              prev.map((q) =>
                batch.includes(q.id)
                  ? { ...q, status: "processing", progress: 5 }
                  : q,
              ),
            );

            await Promise.all(
              batch.map(async (id: string) => {
                // SImulate progress
                const progressInterval = setInterval(() => {
                  setQueue((prev) =>
                    prev.map((q) => {
                      if (
                        q.id === id &&
                        q.status === "processing" &&
                        q.progress < 90
                      ) {
                        return {
                          ...q,
                          progress: q.progress + Math.random() * 10,
                        };
                      }
                      return q;
                    }),
                  );
                }, 800);

                try {
                  const extractRes = await fetch("/api/extract", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentId: id }),
                    signal: controller.signal,
                  });

                  clearInterval(progressInterval);

                  if (!extractRes.ok) throw new Error("Extraction failed");

                  completedIds.push(id);
                  setQueue((prev) =>
                    prev.map((q) =>
                      q.id === id
                        ? { ...q, status: "complete", progress: 100 }
                        : q,
                    ),
                  );
                } catch (e) {
                  clearInterval(progressInterval);
                  if (controller.signal.aborted) return; // Ignore if aborted
                  setQueue((prev) =>
                    prev.map((q) =>
                      q.id === id
                        ? {
                            ...q,
                            status: "error",
                            errorMessage: "Extraction Failure",
                          }
                        : q,
                    ),
                  );
                }
              }),
            );
          }
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error: any) {
        if (error.name === "AbortError" || error.message === "Aborted") {
          console.log("Upload cancelled");
          // No UI update needed as item is removed by handleRemove
        } else {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "error" as const,
                    errorMessage:
                      error instanceof Error ? error.message : "Unknown error",
                  }
                : i,
            ),
          );
        }
      } finally {
        delete abortControllers.current[item.id];
      }
    }

    setIsUploading(false);

    if (completedIds.length > 0 && onUploadComplete) {
      onUploadComplete(completedIds);
    }
  };

  const handleRetry = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "pending" as const,
              progress: 0,
              errorMessage: undefined,
            }
          : i,
      ),
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    // Cancel request if active
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }
    setQueue((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <div>
      <DropZone
        onFilesAccepted={handleFilesAccepted}
        disabled={isUploading}
        maxFiles={50}
        maxSizeMB={50}
      />

      <UploadQueue
        items={queue}
        onRetry={handleRetry}
        onRemove={handleRemove}
      />
    </div>
  );
}

export default UploadManager;
