"use client";

import { Box, Typography, FormControl, Select, MenuItem } from "@mui/material";
import { Star } from "@mui/icons-material";
import { colors } from "@/styles/theme";

interface MinimumRatingInput {
  value: string;
  onChange: (value: string) => void;
}

export function MinimumRating({ value, onChange }: MinimumRatingInput) {
  const renderStars = (count: number) => {
    const stars = [];
    for (let i = 0; i < Math.floor(count); i++) {
      stars.push(<Star key={i} sx={{ fontSize: 16, color: "#f59e0b" }} />);
    }
    return stars;
  };

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600, color: colors.text }}
      >
        Minimum Rating
      </Typography>
      <FormControl size="small" fullWidth>
        <Select
          variant="outlined"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          sx={{
            borderRadius: "10px",
            bgcolor: "white",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.border,
              borderWidth: 1.5,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.primary,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.primaryDark,
              borderWidth: 2,
            },
          }}
        >
          <MenuItem value="">Any rating</MenuItem>
          <MenuItem value="1">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex" }}>{renderStars(1)}</Box>
              <span>1+ stars</span>
            </Box>
          </MenuItem>
          <MenuItem value="2">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex" }}>{renderStars(2)}</Box>
              <span>2+ stars</span>
            </Box>
          </MenuItem>
          <MenuItem value="3">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex" }}>{renderStars(3)}</Box>
              <span>3+ stars</span>
            </Box>
          </MenuItem>
          <MenuItem value="4">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex" }}>{renderStars(4)}</Box>
              <span>4+ stars</span>
            </Box>
          </MenuItem>
          <MenuItem value="5">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex" }}>{renderStars(5)}</Box>
              <span>5 stars</span>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
