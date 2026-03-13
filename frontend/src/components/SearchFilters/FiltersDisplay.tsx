"use client";

import { Box, Chip } from "@mui/material";
import { LanguageOptions } from "@/constants/serviceTypes";
import { colors } from "@/styles/theme";

interface ActiveFiltersDisplayProps {
  minRating: string;
  selectedServices: string[];
  selectedLanguages: string[];
  selectedFundingSources: string[];
  onClearRating: () => void;
  onRemoveService: (service: string) => void;
  onRemoveLanguage: (language: string) => void;
  onRemoveFundingSource: (source: string) => void; 
}

export function ActiveFiltersDisplay({
  minRating,
  selectedServices,
  selectedLanguages,
  selectedFundingSources,
  onClearRating,
  onRemoveService,
  onRemoveLanguage,
  onRemoveFundingSource,
}: ActiveFiltersDisplayProps) {
  const hasActiveFilters =
    selectedServices.length > 0 ||
    (minRating && minRating !== "any") ||
    selectedLanguages.length > 0 ||
    selectedFundingSources.length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
      {minRating && minRating !== "any" && (
        <Chip
          label={`${minRating}+ stars`}
          onDelete={onClearRating}
          sx={{
            bgcolor: "rgba(135, 198, 200, 0.2)",
            color: colors.primaryDark,
            fontWeight: 600,
            borderRadius: "8px",
            border: `1px solid ${colors.primary}`,
            "& .MuiChip-deleteIcon": {
              color: colors.primaryDark,
              "&:hover": { color: colors.text },
            },
          }}
        />
      )}

      {selectedServices.map((service) => (
        <Chip
          key={service}
          label={service}
          onDelete={() => onRemoveService(service)}
          sx={{
            bgcolor: "rgba(135, 198, 200, 0.2)",
            color: colors.primaryDark,
            fontWeight: 600,
            borderRadius: "8px",
            border: `1px solid ${colors.primary}`,
            "& .MuiChip-deleteIcon": {
              color: colors.primaryDark,
              "&:hover": { color: colors.text },
            },
          }}
        />
      ))}

      {selectedLanguages.map((language) => (
        <Chip
          key={language}
          label={LanguageOptions.find((l) => l.value === language)?.label}
          onDelete={() => onRemoveLanguage(language)}
          sx={{
            bgcolor: "rgba(135, 198, 200, 0.2)",
            color: colors.primaryDark,
            fontWeight: 600,
            borderRadius: "8px",
            border: `1px solid ${colors.primary}`,
            "& .MuiChip-deleteIcon": {
              color: colors.primaryDark,
              "&:hover": { color: colors.text },
            },
          }}
        />
      ))}
      {selectedFundingSources.map((source) => (
        <Chip
          key={source}
          label={source}
          onDelete={() => onRemoveFundingSource(source)}
          sx={{
            bgcolor: "rgba(135, 198, 200, 0.2)",
            color: colors.primaryDark,
            fontWeight: 600,
            borderRadius: "8px",
            border: `1px solid ${colors.primary}`,
            "& .MuiChip-deleteIcon": {
              color: colors.primaryDark,
              "&:hover": { color: colors.text },
            },
          }}
        />
      ))}
    </Box>
  );
}
