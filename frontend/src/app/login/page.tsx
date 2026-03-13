"use client";
import { Box, Typography } from "@mui/material";
import Link from "next/link";
import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm, isAuthenticated } from "@/features/auth";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from");

  React.useEffect(() => {
    if (isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #87c6c8 0%, #f5f7fa 35%, #f5f7fa 100%)",
      }}
    >
      <LoginForm redirectTo={redirectTo || undefined} />

      <Typography
        variant="caption"
        align="center"
        color="text.secondary"
        sx={{ pb: 4, px: 2 }}
      >
        By signing in, you agree to our{" "}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
