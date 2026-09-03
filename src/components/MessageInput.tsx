import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_FILES, MAX_FILE_SIZE } from "../core/dialogCore";
import ReplyBar from "./ReplyBar";
import type { ReplyTo } from "../types/message";

type MessageInputProps = {
  disabled?: boolean;
  onSend: (text: string, files?: File[], replyTo?: ReplyTo | null) => void;
  attachedFile?: File | null; // BUGFIX 1 & 3: external file from BottomActions
  onFileRemoved?: () => void;
  onImagePreview?: (src: string) => void; // BUGFIX 2: open full-size modal
  isUploading?: boolean;
  uploadProgress?: number;
  replyTo?: ReplyTo | null;
  onReplyCancel?: () => void;
  onReplyClick?: (messageId?: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string, type: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "📄";
  if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "📝";
  if (type.includes("zip") || name.endsWith(".zip")) return "📦";
  if (type.startsWith("text/") || name.endsWith(".txt")) return "📃";
  return "📎";
}

function AttachmentPreview({
  file,
  onRemove,
  onImagePreview,
}: {
  file: File;
  onRemove: () => void;
  onImagePreview?: (src: string) => void;
}) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="attached-file-preview">
      {isImage && previewUrl ? (
        <button
          type="button"
          className="attached-file-thumb-btn"
          onClick={() => onImagePreview?.(previewUrl)}
          aria-label="Открыть превью"
        >
          {/* BUGFIX 2: fixed 120×120 thumbnail, never full-size inline */}
          <img className="file-thumbnail" src={previewUrl} alt={file.name} />
        </button>
      ) : (
        <span className="attached-file-icon">{getFileIcon(file.name, file.type)}</span>
      )}
      <div className="attached-file-info">
        <span className="file-name">{file.name}</span>
        <span className="file-size">{formatFileSize(file.size)}</span>
      </div>
      <button
        type="button"
        className="remove-file"
        onClick={onRemove}
        aria-label="Удалить файл"
      >
        ✕
      </button>
    </div>
  );
}

export default function MessageInput({
  disabled,
  onSend,
  attachedFile,
  onFileRemoved,
  onImagePreview,
  isUploading = false,
  uploadProgress = 0,
  replyTo,
  onReplyCancel,
  onReplyClick,
  onFocus,
  onBlur,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // BUGFIX 1: sync external attachedFile from BottomActions
  useEffect(() => {
    if (attachedFile) {
      setFiles([attachedFile]);
    } else if (attachedFile === null) {
      setFiles([]);
    }
  }, [attachedFile]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text]);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    onFileRemoved?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = () => {
    const trimmed = text.trim();
    // BUGFIX 3: allow send when file attached without text
    if (!trimmed && files.length === 0) return;
    onSend(trimmed, files.length ? files : undefined, replyTo ?? null);
    setText("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).filter((file) => file.size <= MAX_FILE_SIZE);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    e.currentTarget.value = "";
  };

  const canSend = !disabled && !isUploading && (text.trim().length > 0 || files.length > 0);

  return (
    <div className="message-input-wrap">
      {files.length > 0 && (
        <div className="attached-files">
          {files.map((f, i) => (
            <AttachmentPreview
              key={`${f.name}-${i}`}
              file={f}
              onRemove={() => removeFile(i)}
              onImagePreview={onImagePreview}
            />
          ))}
        </div>
      )}

      {replyTo && onReplyCancel ? (
        <ReplyBar
          replyTo={replyTo}
          onCancel={onReplyCancel}
          onClick={() => onReplyClick?.(replyTo.messageId)}
        />
      ) : null}

      {isUploading && (
        <div className="upload-progress">
          <div className="upload-progress-track">
            <div
              className="upload-progress-bar"
              style={{ width: `${Math.min(100, uploadProgress)}%` }}
            />
          </div>
          <span className="upload-progress-text">Отправка файла…</span>
        </div>
      )}

      <div className="input-bar">
        <button
          type="button"
          className="btn-attach"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          aria-label="Прикрепить файл"
        >
          📎
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          accept=".txt,.pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,image/*,audio/webm"
          onChange={onFileChange}
        />

        <textarea
          ref={textareaRef}
          placeholder="Введите ваше сообщение..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          disabled={disabled || isUploading}
          rows={1}
        />

        <button
          type="button"
          className="btn-send"
          onClick={submit}
          disabled={!canSend}
          aria-label="Отправить"
        >
          ✈️
        </button>
      </div>
    </div>
  );
}
