import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";

const UploadDocument: React.FC<{onUploadSuccess?: (docId: number) => void; authToken?: string}> = ({onUploadSuccess, authToken}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    document_id: number;
    kcs_generated: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const resp = await fetch(`${backendUrl}/upload/`, {
        method: "POST",
        // Add auth header if needed: headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail ?? "Upload failed");
      }

      const data = await resp.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 500, mx: "auto", mt: 4, p: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📂 Upload Educational Document
        </Typography>
        <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} disabled={loading} />
        <Box mt={2}>
          <Button variant="contained" color="primary" onClick={handleUpload} disabled={!file || loading}>
            Upload & Generate KCs
          </Button>
        </Box>
        {loading && (
          <Box mt={2} display="flex" alignItems="center" gap={1}>
            <CircularProgress size={24} />
            <Typography>Processing… (this may take a few seconds)</Typography>
          </Box>
        )}
        {error && (
          <Typography color="error" mt={2}>
            ❌ {error}
          </Typography>
        )}
        {result && (
          <Box mt={2}>
            <Typography>✅ <strong>{result.message}</strong></Typography>
            <Typography>Document ID: {result.document_id}</Typography>
            <Typography>KCs generated: {result.kcs_generated}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadDocument;
