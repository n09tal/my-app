"use client";

import { ReactNode } from "react";
import { Box } from "@mui/material";
import NavBar from "@/components/Navbar";

interface ForgotPasswordLayoutProps {
  children: ReactNode;
}

export default function ForgotPasswordLayout({ children }: ForgotPasswordLayoutProps) {
  return (
    <Box sx={{ width: "100%" }}>
      <NavBar />
      <Box sx={{ pt: "64px" }}>{children}</Box>
    </Box>
  );
}
