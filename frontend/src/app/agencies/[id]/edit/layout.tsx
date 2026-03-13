"use client";
import { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import AppShell from "@/components/AppShell";

interface EditAgencyLayoutProps {
  children: ReactNode;
}

export default function EditAgencyLayout({ children }: EditAgencyLayoutProps) {
  return (
    <AppShell>
      <Box sx={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(180deg, #87c6c8 0%, #f5f7fa 35%, #f5f7fa 100%)" }}>
        <Container
          maxWidth="md"
          sx={{
            py: 4,
          }}
        >
          {children}
        </Container>
      </Box>
    </AppShell>
  );
}
