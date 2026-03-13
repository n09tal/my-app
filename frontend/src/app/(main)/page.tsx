"use client";

import { Box, Typography, Button, CircularProgress, Container } from "@mui/material";
import Link from "next/link";
import { SearchFilters } from "@/components/SearchFilters/SearchFiltersMaster";
import { SearchFiltersType } from "@/types/search";
import { Suspense, useState } from "react";
import { FilterList, ExpandMore, ExpandLess, Assignment, Search } from "@mui/icons-material";
import Collapse from "@mui/material/Collapse";
import { colors } from "@/styles/theme";

export default function Page() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearch = (filters: SearchFiltersType) => {
    console.log("Search clicked with filters:", filters);
  };

  return (
    <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 14 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "2.5rem", md: "4rem" },
                fontWeight: 800,
                color: colors.text,
                mb: 2,
                lineHeight: 1.1,
              }}
            >
              Find Trusted
              <br />
              Home Care Agencies
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: "1.1rem", md: "1.35rem" },
                color: colors.text,
                maxWidth: 550,
                mb: 4,
                lineHeight: 1.6,
              }}
            >
              Connect with compassionate, professional home care providers in your area.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
              <Button
                component={Link}
                href="/agencies"
                variant="contained"
                size="large"
                endIcon={<Search />}
                sx={{
                  bgcolor: colors.coral,
                  color: "white",
                  px: 4,
                  py: 1.5,
                  borderRadius: "14px",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "0 4px 14px rgba(232, 122, 66, 0.35)",
                  "&:hover": {
                    bgcolor: "#d66a35",
                    boxShadow: "0 6px 20px rgba(232, 122, 66, 0.45)",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Directory
              </Button>
              <Button
                component={Link}
                href="/care-requests"
                variant="contained"
                size="large"
                endIcon={<Assignment />}
                sx={{
                  bgcolor: colors.primaryDark,
                  color: "white",
                  px: 4,
                  py: 1.5,
                  borderRadius: "14px",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "0 4px 14px rgba(64, 108, 122, 0.35)",
                  "&:hover": {
                    bgcolor: "#345a66",
                    boxShadow: "0 6px 20px rgba(64, 108, 122, 0.45)",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Care Requests
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Search Section */}
      <Container maxWidth="lg" sx={{ mt: -6, pb: 8, position: "relative", zIndex: 2 }}>
        <Box
          sx={{
            bgcolor: colors.surface,
            borderRadius: "20px",
            border: `2px solid ${colors.borderLight}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Collapsible header */}
          <Button
            fullWidth
            onClick={() => setFiltersOpen(!filtersOpen)}
            sx={{
              py: 2.5,
              px: 3,
              justifyContent: "space-between",
              textTransform: "none",
              color: colors.text,
              bgcolor: colors.surface,
              borderBottom: filtersOpen ? `1px solid ${colors.borderLight}` : "none",
              "&:hover": { bgcolor: colors.surfaceHover },
            }}
            endIcon={filtersOpen ? <ExpandLess /> : <ExpandMore />}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: colors.primarySoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1.5px solid ${colors.primary}`,
                }}
              >
                <FilterList sx={{ color: colors.primaryDark }} />
              </Box>
              <Box sx={{ textAlign: "left" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
                  Search Providers
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: colors.textMuted }}>
                  Filter by name, location, services, and more
                </Typography>
              </Box>
            </Box>
          </Button>

          <Collapse in={filtersOpen}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Suspense
                fallback={
                  <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                }
              >
                <SearchFilters onSearch={handleSearch} />
              </Suspense>
            </Box>
          </Collapse>
        </Box>

        {/* Quick stats or features */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
            mt: 4,
          }}
        >
          {[
            { title: "Duett Partners", desc: "Certain providers are implemented in Duett's home care network" },
            { title: "Easy Search", desc: "Find care by location and services" },
            { title: "Reviews & Ratings", desc: "Real feedback from real families" },
          ].map((item, idx) => (
            <Box
              key={idx}
              sx={{
                p: 3,
                bgcolor: colors.surface,
                borderRadius: "16px",
                border: `2px solid ${colors.borderLight}`,
                textAlign: "center",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: colors.primary,
                  boxShadow: "0 4px 16px rgba(135, 198, 200, 0.2)",
                },
              }}
            >
              <Typography sx={{ fontWeight: 700, color: colors.text, mb: 0.5 }}>
                {item.title}
              </Typography>
              <Typography sx={{ fontSize: "0.9rem", color: colors.textMuted }}>
                {item.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
