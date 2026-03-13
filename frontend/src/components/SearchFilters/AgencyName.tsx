"use client";

import { Search } from "@mui/icons-material";
import { InputAdornment, TextField, Typography, Box } from "@mui/material";
import { colors } from "@/styles/theme";

interface AgencyNameInput {
  agencyName: string;
  onChange: (value: string) => void;
  maxLength: number;
}

export function AgencyName({
  agencyName,
  onChange,
  maxLength = 128,
}: AgencyNameInput) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.slice(0, maxLength);
    onChange(newValue);
  };

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600, color: colors.text }}
      >
        Provider Name
      </Typography>
      <TextField
        placeholder="Search by provider name..."
        value={agencyName}
        onChange={handleChange}
        variant="outlined"
        size="small"
        fullWidth
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
            maxLength: 128,
          },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20, color: colors.primary }} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
