"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { ExpandMore, Translate } from "@mui/icons-material";
import { LanguageOptions } from "@/constants/serviceTypes";
import { colors } from "@/styles/theme";

interface LanguagesProps {
  selectedLanguages: string[];
  onToggleLanguage: (languageValue: string) => void;
}

export function Languages({
  selectedLanguages,
  onToggleLanguage,
}: LanguagesProps) {
  const [languageMenuAnchor, setLanguageMenuAnchor] =
    useState<null | HTMLElement>(null);

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600, color: colors.text }}
      >
        Languages Spoken
      </Typography>
      <Button
        variant="outlined"
        fullWidth
        onClick={(e) => setLanguageMenuAnchor(e.currentTarget)}
        sx={{
          justifyContent: "space-between",
          textTransform: "none",
          color: selectedLanguages.length > 0 ? colors.text : colors.textMuted,
          borderColor: colors.border,
          borderWidth: 1.5,
          borderRadius: "10px",
          bgcolor: "white",
          py: 1,
          "&:hover": {
            borderColor: colors.primary,
            bgcolor: "white",
          },
        }}
        startIcon={<Translate sx={{ color: colors.primary }} />}
        endIcon={<ExpandMore />}
      >
        <span style={{ flex: 1, textAlign: "left" }}>
          {selectedLanguages.length > 0
            ? `${selectedLanguages.length} language${selectedLanguages.length > 1 ? "s" : ""} selected`
            : "Select languages"}
        </span>
      </Button>
      <Menu
        anchorEl={languageMenuAnchor}
        open={Boolean(languageMenuAnchor)}
        onClose={() => setLanguageMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 300,
            width: languageMenuAnchor?.offsetWidth || 200,
            borderRadius: "12px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          },
        }}
      >
        {LanguageOptions.map((language) => (
          <MenuItem
            key={language.value}
            onClick={() => onToggleLanguage(language.value)}
            sx={{
              py: 1.5,
              "&:hover": { bgcolor: "rgba(135, 198, 200, 0.1)" },
            }}
          >
            <Checkbox
              checked={selectedLanguages.includes(language.value)}
              sx={{
                mr: 1,
                p: 0,
                color: colors.border,
                "&.Mui-checked": { color: colors.primaryDark },
              }}
            />
            <ListItemText
              primary={language.label}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
