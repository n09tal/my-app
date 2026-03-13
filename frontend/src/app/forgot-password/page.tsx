"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await api.post("/auth/password/reset/", { email: email.trim() });
      setSuccess("Reset email sent. Check backend console output in local mode.");
    } catch (_err: unknown) {
      setError("Unable to send reset email for this account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #87c6c8 0%, #f5f7fa 35%, #f5f7fa 100%)",
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 8,
          px: 2,
        }}
      >
        <Paper elevation={3} sx={{ width: "100%", maxWidth: 420, p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="h5" fontWeight="600" gutterBottom>
              Reset password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your email to receive reset instructions
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={onSubmit}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Email
              </Typography>
              <TextField
                type="email"
                placeholder="you@example.com"
                fullWidth
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Box>

            {error && (
              <Typography variant="caption" color="error" aria-live="polite">
                {error}
              </Typography>
            )}
            {success && (
              <Typography variant="caption" color="success.main" aria-live="polite">
                {success}
              </Typography>
            )}

            <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset email"}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Link href="/login" style={{ color: "#1976d2", textDecoration: "none" }}>
              Back to login
            </Link>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
