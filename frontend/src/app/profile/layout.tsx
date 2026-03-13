"use client";
import { ReactNode } from "react";
import { Box, Container, Paper } from "@mui/material";

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(180deg, #87c6c8 0%, #f5f7fa 35%, #f5f7fa 100%)" }}>
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: "100%",
            textAlign: "center",
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
