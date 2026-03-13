"use client";

import * as React from "react";
import Link from "next/link";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useLogin } from "../hooks/useLogin";
import { validateRedirect } from "@/utils/redirectValidation";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const { login, isLoading, error } = useLogin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRedirect = validateRedirect(redirectTo);
    login({ email, password, redirectTo: validRedirect });
  };

  return (
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
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to your Duett account
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
              <Link
                href="/forgot-password"
                style={{
                  fontSize: "0.9rem",
                  color: "#1976d2",
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </Box>
            <TextField
              type="password"
              placeholder="••••••••"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Box>

          {error && (
            <Typography
              variant="caption"
              color="error"
              sx={{ textAlign: "left", mt: 0.5 }}
              aria-live="polite"
            >
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isLoading}
            sx={{ mt: 1, textTransform: "none" }}
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Don&lsquo;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "#1976d2",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign up{" "}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
