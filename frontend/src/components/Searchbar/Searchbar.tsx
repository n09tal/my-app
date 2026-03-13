"use client";

import React from "react";
import Link from "next/link";
import {
  AppBar,
  Toolbar,
  Box,
  InputBase,
  ThemeProvider,
  useTheme,
  createTheme,
  Button,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";

const searchTheme = createTheme({
  palette: {
    primary: { main: "#ffffff" },
    secondary: { main: "#1976d2" },
    background: { default: "#bbbbbbff" },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          paddingLeft: "0px",
        },
      },
    },
  },
});

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: "none",
  backgroundColor: alpha(theme.palette.background.default, 0),
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.25),
  },
  marginLeft: theme.spacing(0),
  width: "auto",
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    width: "16ch",
  },
  backgroundColor: alpha("#6b6b6bff", 0.15),
}));

const Searchbar: React.FC = () => {
  const parentTheme = useTheme();

  return (
    <ThemeProvider theme={searchTheme}>
      <AppBar position="static" color="primary">
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "flex-center",
            justifyContent: "space-between",
          }}
        >
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ "aria-label": "search" }}
            />
          </Search>
          <ThemeProvider theme={parentTheme}>
            <Box
              sx={{ display: "flex", flexGrow: 1, justifyContent: "flex-end" }}
            >
              <Button component={Link} href="/" color="inherit">
                Filters
              </Button>
            </Box>
          </ThemeProvider>
        </Toolbar>
      </AppBar>
    </ThemeProvider>
  );
};

export default Searchbar;
