"use client";

import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Typography
        variant="h1"
        component="h1"
        sx={{ fontWeight: "bold", fontSize: { xs: "4rem", md: "6rem" } }}
      >
        404
      </Typography>
      <Typography variant="h5" component="h2" sx={{ mt: 2, mb: 4 }}>
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </Typography>
      <Button component={Link} href="/" variant="contained" color="primary">
        Go Back to Home
      </Button>
    </Box>
  );
}
