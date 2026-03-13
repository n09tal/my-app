"use client";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import api from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await api.post("/api/directory/users/register/", {
        email: email.trim(),
        password,
      });
      setSuccess("Account created successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (err: unknown) {
      setError("Unable to create account. Please check your email and try again.");
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
        <Paper
          elevation={3}
          sx={{ width: "100%", maxWidth: 420, p: 4, borderRadius: 2 }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="h5" fontWeight="600" gutterBottom>
              Welcome
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your new Duett account
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

            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle2">Password</Typography>
              </Box>
              <TextField
                type="password"
                placeholder="••••••••"
                fullWidth
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1, textTransform: "none" }}
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Typography
        variant="caption"
        align="center"
        color="text.secondary"
        sx={{ pb: 4, px: 2 }}
      >
        By creating an account, you agree to our{" "}
        <Link
          href="#"
          style={{ textDecoration: "underline", color: "inherit" }}
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="#"
          style={{ textDecoration: "underline", color: "inherit" }}
        >
          Privacy Policy
        </Link>
      </Typography>
    </Box>
  );
}
