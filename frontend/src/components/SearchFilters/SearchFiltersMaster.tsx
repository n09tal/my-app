"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import { ExpandMore, Tune, Search } from "@mui/icons-material";
import { SearchFiltersType } from "@/types/search";
import { AgencyName } from "@/components/SearchFilters/AgencyName";
import { ZipCode } from "@/components/SearchFilters/ZipCode";
import { ServicesNeeded } from "@/components/SearchFilters/ServicesNeeded";
import { MinimumRating } from "./MinimumRating";
import { Languages } from "./Languages";
import { FundingSources } from "./FundingSources";
import { ActiveFiltersDisplay } from "./FiltersDisplay";
import { colors } from "@/styles/theme";

export function SearchFilters({
  onSearch,
}: {
  onSearch?: (filters: SearchFiltersType) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [agencyName, setAgencyName] = useState(
    searchParams.get("agencyName") || "",
  );
  const [zipCode, setZipCode] = useState(searchParams.get("zipCode") || "");
  const [selectedServices, setSelectedServices] = useState<string[]>(
    searchParams.get("services")?.split(",").filter(Boolean) || [],
  );
  const [minRating, setMinRating] = useState<string>(
    searchParams.get("minRating") || "",
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    searchParams.get("languages")?.split(",").filter(Boolean) || [],
  );
  const [selectedFundingSources, setSelectedFundingSources] = useState<
    string[]
  >(searchParams.get("fundingSources")?.split(",").filter(Boolean) || []);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((serv) => serv !== service)
        : [...prev, service],
    );
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((lang) => lang !== language)
        : [...prev, language],
    );
  };

  const toggleFundingSource = (source: string) => {
    setSelectedFundingSources((prev) =>
      prev.includes(source)
        ? prev.filter((src) => src !== source)
        : [...prev, source],
    );
  };

  const clearAllFilters = () => {
    setSelectedServices([]);
    setAgencyName("");
    setZipCode("");
    setMinRating("");
    setSelectedLanguages([]);
    setSelectedFundingSources([]);
  };

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hasAdvancedFilters =
    selectedServices.length > 0 || selectedFundingSources.length > 0;

  const handleSearchWithName = useCallback(
    (searchAgencyName: string) => {
      const sanitizedAgencyName = searchAgencyName.trim().slice(0, 128);

      let sanitizedZipCode = zipCode.replace(/\D/g, "");
      if (sanitizedZipCode.length !== 5) {
        sanitizedZipCode = "";
      }

      const filters = {
        agencyName: sanitizedAgencyName,
        zipCode: sanitizedZipCode,
        services: selectedServices,
        minRating: minRating,
        languages: selectedLanguages,
        fundingSources: selectedFundingSources,
      };

      onSearch?.(filters);

      const params = new URLSearchParams();
      if (sanitizedAgencyName) params.set("agencyName", sanitizedAgencyName);
      if (sanitizedZipCode) params.set("zipCode", sanitizedZipCode);
      if (selectedServices.length > 0) {
        params.set("services", selectedServices.join(","));
      }
      if (minRating) params.set("minRating", minRating);
      if (selectedLanguages.length > 0) {
        params.set("languages", selectedLanguages.join(","));
      }
      if (selectedFundingSources.length > 0) {
        params.set("fundingSources", selectedFundingSources.join(","));
      }

      router.push(`/agencies?${params.toString()}`, { scroll: false });
    },
    [
      zipCode,
      selectedServices,
      minRating,
      selectedLanguages,
      selectedFundingSources,
      onSearch,
      router,
    ],
  );

  useEffect(() => {
    const urlAgencyName = searchParams.get("agencyName") || "";
    
    if (agencyName === urlAgencyName) return;

    const timeoutId = setTimeout(() => {
      if (agencyName.length >= 2 || (urlAgencyName && agencyName === "")) {
        handleSearchWithName(agencyName);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [agencyName, searchParams, handleSearchWithName]);

  const handleSearch = () => {
    handleSearchWithName(agencyName);
  };

  return (
    <Box sx={{ maxWidth: "100%" }}>
      {/* Main search inputs */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            md: "2fr 1fr",
          },
          mb: 2,
        }}
      >
        <AgencyName
          agencyName={agencyName}
          onChange={setAgencyName}
          maxLength={128}
        />
        <ZipCode zipCode={zipCode} onChange={setZipCode} maxLength={5} />
      </Box>

      {/* Secondary filters */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            md: "1fr 1fr",
          },
          mb: 2,
        }}
      >
        <MinimumRating value={minRating} onChange={setMinRating} />
        <Languages
          selectedLanguages={selectedLanguages}
          onToggleLanguage={toggleLanguage}
        />
      </Box>

      {/* Advanced Filters Accordion */}
      <Accordion
        expanded={advancedOpen}
        onChange={(_, expanded) => setAdvancedOpen(expanded)}
        elevation={0}
        sx={{
          border: `2px solid ${colors.border}`,
          borderRadius: "12px !important",
          mb: 3,
          bgcolor: colors.surface,
          "&:before": { display: "none" },
          overflow: "hidden",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore sx={{ color: colors.primaryDark }} />}
          sx={{
            bgcolor: "#f9fafb",
            "& .MuiAccordionSummary-content": {
              alignItems: "center",
              gap: 1.5,
            },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              bgcolor: "rgba(135, 198, 200, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Tune sx={{ fontSize: 18, color: colors.primaryDark }} />
          </Box>
          <Typography sx={{ fontWeight: 600, color: colors.text }}>
            Advanced Filters
          </Typography>
          {hasAdvancedFilters && (
            <Box
              sx={{
                ml: 1,
                px: 1.5,
                py: 0.25,
                bgcolor: colors.primary,
                color: "white",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {selectedServices.length + selectedFundingSources.length}
            </Box>
          )}
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 2 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                md: "1fr 1fr",
              },
            }}
          >
            <ServicesNeeded
              selectedServices={selectedServices}
              onToggleService={toggleService}
              onClearAll={() => setSelectedServices([])}
            />
            <FundingSources
              selectedSources={selectedFundingSources}
              onToggleSource={toggleFundingSource}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Active filters display */}
      <ActiveFiltersDisplay
        minRating={minRating}
        selectedServices={selectedServices}
        selectedLanguages={selectedLanguages}
        selectedFundingSources={selectedFundingSources}
        onClearRating={() => setMinRating("")}
        onRemoveService={toggleService}
        onRemoveLanguage={toggleLanguage}
        onRemoveFundingSource={toggleFundingSource}
      />

      {/* Action buttons */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pt: 3,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Button
          variant="text"
          size="small"
          onClick={clearAllFilters}
          sx={{
            textTransform: "none",
            color: colors.textMuted,
            fontWeight: 500,
            "&:hover": { color: colors.text, bgcolor: "transparent" },
          }}
        >
          Clear All Filters
        </Button>
        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<Search />}
          sx={{
            textTransform: "none",
            bgcolor: colors.coral,
            color: "white",
            px: 3,
            py: 1,
            borderRadius: "10px",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(232, 122, 66, 0.3)",
            "&:hover": {
              bgcolor: "#d66a35",
              boxShadow: "0 4px 12px rgba(232, 122, 66, 0.4)",
            },
          }}
        >
          Search Providers
        </Button>
      </Box>
    </Box>
  );
}
