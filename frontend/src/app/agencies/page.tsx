"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { Box, Typography, CircularProgress, Container, Collapse, Button } from "@mui/material";
import { SearchFilters } from "@/components/SearchFilters/SearchFiltersMaster";
import { AgencyCard } from "@/components/agencyCard";
import { PaginationNav } from "@/components/PaginationNav";
import { useVendors } from "@/features/vendors";
import { SearchOutlined, SentimentDissatisfied, FilterList, ExpandMore, ExpandLess } from "@mui/icons-material";
import { useFavorites } from "@/features/favorites";
import { useSessionStore } from "@/features/session/store/sessionStore";

import { useRouter, useSearchParams } from "next/navigation";

import { SearchFiltersType } from "@/types/search";
import { colors } from "@/styles/theme";

const PAGE_SIZE = 12;

function AgenciesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const saveSearchFilters = useSessionStore((state) => state.saveSearchFilters);
  const hasRestoredFiltersRef = useRef(false);

  const offset = Number(searchParams.get("offset")) || 0;
  const limit = Number(searchParams.get("limit")) || PAGE_SIZE;
  const agencyName = searchParams.get("agencyName") || "";
  const zipCode = searchParams.get("zipCode") || "";
  const services = searchParams.get("services")?.split(",").filter(Boolean) || [];
  const minRating = searchParams.get("minRating") || "";
  const languages = searchParams.get("languages")?.split(",").filter(Boolean) || [];
  const fundingSources = searchParams.get("fundingSources")?.split(",").filter(Boolean) || [];

  const { vendors, count, isLoading, isFetching, isError } = useVendors({ limit, offset, agencyName, zipCode, services, minRating, languages, fundingSources });
  const { isFavorite } = useFavorites();

  // Calculate current page (1-indexed for MUI Pagination)
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(count / limit);

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * limit;
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", String(newOffset));
    params.set("limit", String(limit));
    router.push(`/agencies?${params.toString()}`, { scroll: false });
  };

  const handleSearch = (newFilters: SearchFiltersType) => {
    const params = new URLSearchParams();
    params.set("offset", "0");
    params.set("limit", String(limit));
    if (newFilters.agencyName) params.set("agencyName", newFilters.agencyName);
    if (newFilters.zipCode) params.set("zipCode", newFilters.zipCode);
    if (newFilters.services.length > 0) {
      params.set("services", newFilters.services.join(","));
    }
    if (newFilters.minRating) params.set("minRating", newFilters.minRating);
    if (newFilters.languages && newFilters.languages.length > 0) {
      params.set("languages", newFilters.languages.join(","));
    }
    if (newFilters.fundingSources && newFilters.fundingSources.length > 0) {
      params.set("fundingSources", newFilters.fundingSources.join(","));
    }
    router.push(`/agencies?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters = 
    searchParams.get("agencyName") || 
    searchParams.get("zipCode") || 
    searchParams.get("services") || 
    searchParams.get("minRating") || 
    searchParams.get("languages") ||
    searchParams.get("fundingSources");

  // Save current filters to sessionStorage when they change
  useEffect(() => {
    const currentFilters: SearchFiltersType = {
      agencyName: searchParams.get("agencyName") || "",
      zipCode: searchParams.get("zipCode") || "",
      services: searchParams.get("services")?.split(",").filter(Boolean) || [],
      minRating: searchParams.get("minRating") || "",
      languages: searchParams.get("languages")?.split(",").filter(Boolean) || [],
      fundingSources: searchParams.get("fundingSources")?.split(",").filter(Boolean) || [],
    };

    // Only save if there are active filters
    const hasFilters = Object.values(currentFilters).some(
      (value) => 
        (Array.isArray(value) && value.length > 0) || 
        (typeof value === "string" && value.length > 0)
    );

    if (hasFilters) {
      saveSearchFilters(currentFilters);
    }
  }, [searchParams, saveSearchFilters]);

  // Restore filters when returning without query params (only once on mount)
  useEffect(() => {
    if (hasRestoredFiltersRef.current) return;
    
    const getLastSearchFilters = useSessionStore.getState().getLastSearchFilters;
    const lastFilters = getLastSearchFilters();
    
    // If no query params but we have saved filters, restore them
    if (!hasActiveFilters && lastFilters) {
      hasRestoredFiltersRef.current = true;
      const params = new URLSearchParams();
      params.set("offset", "0");
      params.set("limit", String(PAGE_SIZE));
      
      if (lastFilters.agencyName) params.set("agencyName", lastFilters.agencyName);
      if (lastFilters.zipCode) params.set("zipCode", lastFilters.zipCode);
      if (lastFilters.services.length > 0) {
        params.set("services", lastFilters.services.join(","));
      }
      if (lastFilters.minRating) params.set("minRating", lastFilters.minRating);
      if (lastFilters.languages.length > 0) {
        params.set("languages", lastFilters.languages.join(","));
      }
      if (lastFilters.fundingSources.length > 0) {
        params.set("fundingSources", lastFilters.fundingSources.join(","));
      }
      
      router.replace(`/agencies?${params.toString()}`, { scroll: false });
    }
  }, [hasActiveFilters, router]);

  return (
    <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
      {/* Hero Header */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 14 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
            <Typography
              variant="h2"
              sx={{
                color: colors.text,
                fontWeight: 800,
                fontSize: { xs: "2.5rem", md: "4rem" },
                mb: 2,
                lineHeight: 1.1,
              }}
            >
              Find Care Providers
            </Typography>
            <Typography
              sx={{
                color: colors.text,
                fontSize: { xs: "1.1rem", md: "1.35rem" },
                maxWidth: 550,
                mx: "auto",
                lineHeight: 1.6,
              }}
            >
              Browse trusted providers in your area
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: -6, pb: 6, position: "relative", zIndex: 1 }}>
        {/* Collapsible Filters */}
        <Box
          sx={{
            bgcolor: colors.surface,
            borderRadius: "20px",
            mb: 3,
            border: `2px solid ${colors.borderLight}`,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(64, 108, 122, 0.08)",
            overflow: "hidden",
          }}
        >
          <Button
            fullWidth
            onClick={() => setFiltersOpen(!filtersOpen)}
            sx={{
              py: 2.5,
              px: 3,
              justifyContent: "space-between",
              textTransform: "none",
              color: colors.text,
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
                  Search & Filters
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: colors.textMuted }}>
                  Filter by name, location, services, and more
                </Typography>
              </Box>
              {hasActiveFilters && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.25,
                    bgcolor: colors.primary,
                    color: "white",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Active
                </Box>
              )}
            </Box>
          </Button>
          
          <Collapse in={filtersOpen}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <SearchFilters onSearch={handleSearch} />
            </Box>
          </Collapse>
        </Box>

        {/* Results Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text }}>
            {isLoading ? "Searching..." : `${count} ${count === 1 ? "Provider" : "Providers"} found`}
          </Typography>
          {!isLoading && !isError && totalPages > 1 && (
            <Typography variant="body2" sx={{ color: colors.textMuted }}>
              Page {currentPage} of {totalPages}
            </Typography>
          )}
        </Box>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 12, gap: 2 }}>
            <CircularProgress sx={{ color: colors.primary }} size={48} />
            <Typography sx={{ color: colors.textMuted }}>Finding providers...</Typography>
          </Box>
        )}

        {/* Error */}
        {isError && (
          <Box
            sx={{
              textAlign: "center",
              py: 10,
              bgcolor: "#fef2f2",
              borderRadius: "16px",
              border: "2px solid #fecaca",
            }}
          >
            <SentimentDissatisfied sx={{ fontSize: 48, color: "#ef4444", mb: 2 }} />
            <Typography variant="h6" sx={{ color: "#991b1b", fontWeight: 600 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ color: "#b91c1c" }}>
              Please try again later.
            </Typography>
          </Box>
        )}

        {/* Results Grid */}
        {!isLoading && !isError && vendors.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
                xl: "repeat(4, 1fr)",
              },
              gap: 2.5,
              mb: 4,
              opacity: isFetching ? 0.7 : 1,
            transition: "opacity 0.2s",
          }}
          >
            {vendors.map((vendor) => (
              <AgencyCard
              key={vendor.id}
              agency={vendor}
              isFavorite={isFavorite(vendor.id)}
            />
            ))}
          </Box>
        )}

        {/* Empty */}
        {!isLoading && !isError && vendors.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 10,
              bgcolor: colors.surface,
              borderRadius: "16px",
              border: `2px solid ${colors.borderLight}`,
            }}
          >
            <SearchOutlined sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600 }}>
              No providers found
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textMuted }}>
              Try adjusting your filters.
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <PaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default function AgenciesPage() {
  return (
    <Suspense>
      <AgenciesContent />
    </Suspense>
  );
}
