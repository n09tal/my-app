"use client";
import { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import AppShell from "@/components/AppShell";
import { colors } from "@/styles/theme";

interface AccountLayoutProps {
  children: ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <AppShell>
      <Box sx={{ minHeight: "calc(100vh - 64px)", background: colors.pageGradient }}>
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
