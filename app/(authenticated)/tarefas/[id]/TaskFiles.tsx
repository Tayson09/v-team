 "use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, FileText, Image as ImageIcon, X } from "lucide-react";

type TaskFile = {
  id: number;
  fileName: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type Props = {
  files: TaskFile[];
  isAdmin: boolean;
  isTaskDone: boolean;
  onDelete: (fileId: number) => Promise<void>;
};

export default function TaskFiles({
  files,
  isAdmin,
  isTaskDone,
  onDelete,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  if (!isAdmin) return null;

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gray-900/50 p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">
        Arquivos da tarefa
      </h2>

      {files.length === 0 && (
        <p className="text-sm text-purple-300/70">
          Nenhum arquivo enviado ainda.
        </p>
      )}

      <div className="space-y-3">
        {files.map((file) => {
          const isImage = file.mimeType.startsWith("image/");

          return (
            <div
              key={file.id}
              className="flex items-center justify-between bg-zinc-900/60 border border-purple-500/10 rounded-lg p-3 hover:border-purple-400/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  {isImage ? (
                    <ImageIcon className="w-5 h-5 text-purple-300" />
                  ) : (
                    <FileText className="w-5 h-5 text-purple-300" />
                  )}
                </div>

                <div>
                  <p className="text-sm text-white font-medium">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-purple-300/70">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isImage && (
                  <button
                    onClick={() => setPreview(file.path)}
                    className="text-xs px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Preview
                  </button>
                )}

                {!isTaskDone && (
                  <button
                    onClick={() => onDelete(file.id)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖼️ MODAL DE PREVIEW */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative max-w-3xl w-full p-4">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
            >
              <X className="text-white" />
            </button>

            <div className="bg-zinc-900 p-4 rounded-xl">
              <Image
                src={preview}
                alt="Preview"
                width={800}
                height={600}
                className="rounded-lg object-contain max-h-[70vh] w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   