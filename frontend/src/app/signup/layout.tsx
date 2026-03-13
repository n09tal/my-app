"use client";
import { ReactNode } from "react";
import { Box } from "@mui/material";
import NavBar from "@/components/Navbar";

interface LoginLayoutProps {
  children: ReactNode;
}

export default function SignupLayout({ children }: LoginLayoutProps) {
  return (
    <Box sx={{ width: "100%" }}>
      <NavBar />
      <Box sx={{ pt: "64px" }}>{children}</Box>
    </Box>
  );
}
