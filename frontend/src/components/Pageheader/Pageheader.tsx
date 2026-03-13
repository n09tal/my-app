"use client";

import { AppBar, Toolbar, Typography, useTheme } from "@mui/material";

const Pageheader: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      }}
    >
      <Toolbar>
        <Typography variant="h6" component="h1">
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Pageheader;
