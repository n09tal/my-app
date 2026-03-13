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
import { ExpandMore, AccountBalanceWallet } from "@mui/icons-material";
import { FundingSourceTypes } from "@/constants/fundingSourceTypes";
import { colors } from "@/styles/theme";

interface SourcesProps {
  selectedSources: string[];
  onToggleSource: (sourceValue: string) => void;
}

export function FundingSources({
  selectedSources,
  onToggleSource,
}: SourcesProps) {
  const [sourceMenuAnchor, setSourceMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600, color: colors.text }}
      >
        Funding Sources
      </Typography>
      <Button
        variant="outlined"
        fullWidth
        onClick={(e) => setSourceMenuAnchor(e.currentTarget)}
        sx={{
          justifyContent: "space-between",
          textTransform: "none",
          color: selectedSources.length > 0 ? colors.text : colors.textMuted,
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
        startIcon={<AccountBalanceWallet sx={{ color: colors.primary }} />}
        endIcon={<ExpandMore />}
      >
        <span style={{ flex: 1, textAlign: "left" }}>
          {selectedSources.length > 0
            ? `${selectedSources.length} source${selectedSources.length > 1 ? "s" : ""} selected`
            : "Select sources"}
        </span>
      </Button>
      <Menu
        anchorEl={sourceMenuAnchor}
        open={Boolean(sourceMenuAnchor)}
        onClose={() => setSourceMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 300,
            width: sourceMenuAnchor?.offsetWidth || 200,
            borderRadius: "12px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          },
        }}
      >
        {FundingSourceTypes.map((source) => (
          <MenuItem
            key={source.name}
            onClick={() => onToggleSource(source.name)}
            sx={{
              py: 1.5,
              "&:hover": { bgcolor: "rgba(135, 198, 200, 0.1)" },
            }}
          >
            <Checkbox
              checked={selectedSources.includes(source.name)}
              sx={{
                mr: 1,
                p: 0,
                color: colors.border,
                "&.Mui-checked": { color: colors.primaryDark },
              }}
            />
            <ListItemText
              primary={source.name}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
