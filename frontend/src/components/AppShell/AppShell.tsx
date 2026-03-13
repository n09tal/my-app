"use client";

import * as React from "react";
import { Box } from "@mui/material";
import NavBar from "@/components/Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <Box
        component="section"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          pt: "64px",
        }}
      >
        <Box component="main" sx={{ flex: 1, minHeight: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
