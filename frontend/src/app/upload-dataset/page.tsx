"use client";
import React, { useEffect } from "react";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

interface FileInfo {
  file: File;
  valid: boolean;
  error?: string;
}

const EXPECTED_SCHEMAS: Record<string, string[]> = {
  orders: ["order_id", "user_id", "order_date", "Total cost"],
  order_products: ["order_id", "product_id"],
  products: ["product_id", "product_name"],
};

export default function UploadDataset() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [complete, setComplete] = useState(false);

  // Track uploaded files and their validation state
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, FileInfo | null>
  >(() => {
    const init: Record<string, FileInfo | null> = {};
    Object.keys(EXPECTED_SCHEMAS).forEach((k) => (init[k] = null));
    return init;
  });

  // Restore upload state from localStorage on mount
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    getUser();
    // Restore upload state
    const saved = localStorage.getItem("uploadState");
    if (saved) {
      const { fileName, progress, status, uploadComplete } = JSON.parse(saved);
      setFileName(fileName);
      setProgress(progress);
      setStatus(status);
      setUploadComplete(uploadComplete);
    }
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStatus("Uploading...");
    setProgress(0);
    // Save state to localStorage
    localStorage.setItem(
      "uploadState",
      JSON.stringify({
        fileName: file.name,
        progress: 0,
        status: "Uploading...",
        uploadComplete: false,
      })
    );
    if (!userId) {
      setStatus("User not authenticated. Please log in.");
      setProgress(0);
      localStorage.removeItem("uploadState");
      console.log("DEBUG: userId is not set");
      return;
    }
    console.log("DEBUG: userId before upload", userId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);
    // Log FormData keys for debugging
    for (let pair of formData.entries()) {
      console.log(`FormData field: ${pair[0]} = ${pair[1]}`);
    }
    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(`Upload complete! `);
        setProgress(100);
        setUploadComplete(true);
        localStorage.setItem(
          "uploadState",
          JSON.stringify({
            fileName: file.name,
            progress: 100,
            status: `Upload complete! Rows: ${data.rows}, Columns: ${data.columns}`,
            uploadComplete: true,
          })
        );
      } else {
        setStatus("Upload failed.");
        setProgress(0);
        localStorage.removeItem("uploadState");
      }
    } catch (err) {
      setStatus("Upload failed.");
      setProgress(0);
      localStorage.removeItem("uploadState");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Handler for file input change / drop
  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement> | File
  ) => {
    let file: File | null = null;
    if ((e as any).target) {
      const ev = e as React.ChangeEvent<HTMLInputElement>;
      if (!ev.target.files || !ev.target.files[0]) return;
      file = ev.target.files[0];
    } else {
      file = e as File;
    }

    if (!file) return;

    // decide which expected file this is: prefer filename match, otherwise first missing
    const name = file.name.toLowerCase();
    const matchedType = Object.keys(EXPECTED_SCHEMAS).find((t) =>
      name.includes(t)
    );
    const fallback =
      Object.keys(EXPECTED_SCHEMAS).find((t) => !uploadedFiles[t]?.valid) ||
      Object.keys(EXPECTED_SCHEMAS)[0];
    const type = matchedType || fallback;

    // Try to validate CSV header quickly (only CSV supported here for validation)
    let valid = true;
    let error: string | undefined;
    try {
      const text = await file.text();
      const headerLine = text.split(/\r?\n/)[0] || "";
      const cols = headerLine.split(",").map((c) => c.trim());
      const expected = EXPECTED_SCHEMAS[type] || [];
      const missing = expected.filter((c) => !cols.includes(c));
      if (missing.length > 0) {
        valid = false;
        error = `Missing columns: ${missing.join(", ")}`;
      }
    } catch (err) {
      valid = false;
      error = "Unable to read file for validation";
    }

    setUploadedFiles((prev) => ({ ...prev, [type]: { file, valid, error } }));
  };

  // Upload all validated files by reusing handleFile for each
  const handleUpload = async () => {
    setUploading(true);
    const types = Object.keys(EXPECTED_SCHEMAS);
    for (const t of types) {
      const info = uploadedFiles[t];
      if (info && info.file && info.valid) {
        // await single file upload
        // eslint-disable-next-line no-await-in-loop
        await handleFile(info.file);
      }
    }
    setUploading(false);
    setComplete(true);
  };

  // Determine next file user should upload
  const nextFileType = Object.keys(EXPECTED_SCHEMAS).find(
    (key) => !uploadedFiles[key]?.valid
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c]">
      <div className="rounded-2xl shadow-lg backdrop-blur-md bg-gradient-to-br from-[#3c1a5b]/80 to-[#2d0b3a]/80 border border-[#a259e6]/40 p-10 w-full max-w-2xl relative mt-10">
        <h2 className="text-2xl font-bold mb-6 text-[#00e6e6] text-center">
          Upload Dataset (Step by Step)
        </h2>

        <div
          className="border-2 border-dashed border-[#a259e6] rounded-xl flex flex-col items-center justify-center p-8 mb-6 cursor-pointer hover:bg-[#3c1a5b]/40 transition backdrop-blur-md bg-[#23283a]/60"
          style={{
            boxShadow: "0 4px 16px 0 rgba(162, 89, 230, 0.10)",
            border: "2px dashed #a259e6",
            ...(uploadComplete ? { opacity: 0.5, pointerEvents: "none" } : {}),
          }}
          onDrop={uploadComplete ? undefined : handleDrop}
          onDragOver={uploadComplete ? undefined : (e) => e.preventDefault()}
          onClick={
            uploadComplete ? undefined : () => fileInput.current?.click()
          }
        >
          <input
            type="file"
            ref={fileInput}
            className="hidden"
            onChange={handleChange}
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            disabled={uploadComplete}
          />
          <Image src="/cloud.png" alt="Upload" width={48} height={48} />
          <p className="text-[#00e6e6] font-medium mt-2">
            {nextFileType
              ? `Upload your ${nextFileType}.csv file`
              : "All files uploaded!"}
          </p>
          <p className="text-xs text-[#b0b3b8]">
            Expected columns are auto-checked for correctness.
          </p>
        </div>

        {/* List of required files */}
        <div className="space-y-3">
          {Object.entries(EXPECTED_SCHEMAS).map(([type, cols]) => (
            <div
              key={type}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                uploadedFiles[type]?.valid
                  ? "border-green-500 bg-green-900/20"
                  : "border-[#a259e6]/40 bg-[#3c1a5b]/10"
              }`}
            >
              <span className="text-[#b0b3b8] font-medium">
                {type}.csv
                <span className="text-xs text-[#777] block">
                  Columns: {cols.join(", ")}
                </span>
              </span>
              <span>
                {uploadedFiles[type]?.valid ? " Validated" : "Pending"}
              </span>
            </div>
          ))}
        </div>

        {/* Upload button */}
        <div className="mt-6">
          <button
            className="w-full py-2 rounded-lg bg-[#a259e6] text-white font-semibold hover:bg-[#7c3aed] transition disabled:opacity-50"
            onClick={handleUpload}
            disabled={
              uploading ||
              complete ||
              !Object.keys(EXPECTED_SCHEMAS).every(
                (type) => uploadedFiles[type]?.valid
              )
            }
          >
            {uploading ? "Uploading..." : complete ? "Done " : "Upload All"}
          </button>

          <div className="w-full h-2 bg-[#3c1a5b] rounded-full mt-3">
            <div
              className="h-full bg-gradient-to-r from-[#00e6e6] to-[#a259e6] transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="text-sm text-[#a259e6] mt-3 whitespace-pre-wrap">
            {status}
          </div>
        </div>
        {uploadComplete && (
          <button
            className="mt-6 w-full py-2 rounded-lg bg-[#a259e6] text-white font-semibold hover:bg-[#7c3aed] transition"
            onClick={() => {
              setFileName(null);
              setProgress(0);
              setStatus("");
              setUploadComplete(false);
              localStorage.removeItem("uploadState");
            }}
          >
            Upload a New Dataset
          </button>
        )}
      </div>
    </div>
  );
}
