"use client";

import { LocationOn } from "@mui/icons-material";
import { InputAdornment, TextField, Typography, Box } from "@mui/material";
import { colors } from "@/styles/theme";

interface ZipCodeInput {
  zipCode: string;
  onChange: (value: string) => void;
  maxLength: number;
}

export function ZipCode({ zipCode, onChange, maxLength = 5 }: ZipCodeInput) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, "").slice(0, maxLength);
    onChange(numericValue);
  };

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600, color: colors.text }}
      >
        ZIP Code
      </Typography>
      <TextField
        placeholder="Enter ZIP"
        value={zipCode}
        onChange={handleChange}
        variant="outlined"
        size="small"
        fullWidth
        type="tel"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
            bgcolor: "white",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.primary,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.primaryDark,
              borderWidth: 2,
            },
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.border,
            borderWidth: 1.5,
          },
        }}
        slotProps={{
          htmlInput: {
            maxLength: 5,
            inputMode: "numeric",
            pattern: "[0-9]{5}",
          },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <LocationOn sx={{ fontSize: 20, color: colors.primary }} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
