import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";

const KCList = ({ documentId, authToken }) => {
  const [kcs, setKcs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

  const fetchKCs = async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${backendUrl}/knowledge/documents/${documentId}/kcs`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Uncomment if you have a JWT token to send:
          // Authorization: `Bearer ${authToken}`,
        },
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail ?? "Failed to fetch KCs");
      }
      const data = await resp.json();
      setKcs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKCs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (!documentId) return null;

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        📚 Knowledge Components
      </Typography>
      {loading && (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={24} />
          <Typography>Loading KCs…</Typography>
        </Box>
      )}
      {error && <Typography color="error">❌ {error}</Typography>}
      {!loading && kcs.length === 0 && (
        <Typography>No Knowledge Components generated yet.</Typography>
      )}
      {kcs.map((kc) => (
        <Card
          key={kc.id}
          sx={{
            mb: 2,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            transition: "transform 0.2s",
            ":hover": { transform: "scale(1.02)" },
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {kc.topic}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {kc.content}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default KCList;
