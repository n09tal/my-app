"use client";

import {
  Avatar,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "@/features/auth";

export function ProfileCard() {
  const { authenticated } = useAuth();
  const { profile, isLoading, isError, error, refetch } = useProfile();

  if (!authenticated) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography>Please log in to view your profile</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ textAlign: "center", p: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading profile...</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ textAlign: "center", p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading profile: {error?.message || "Unknown error"}
        </Alert>
        <Button onClick={() => refetch()} variant="outlined">
          Retry
        </Button>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography>No profile data available</Typography>
      </Box>
    );
  }

  const fullName =
    `${profile.user_profile?.first_name || ""} ${profile.user_profile?.last_name || ""}`.trim() ||
    "User";
  const avatarSrc = "/TEMP_PROFILE.png";

  return (
    <Box sx={{ textAlign: "center", maxWidth: 400, mx: "auto" }}>
      <Avatar
        alt={fullName}
        src={avatarSrc}
        sx={{ width: 100, height: 100, mx: "auto", mb: 2 }}
      />

      <Typography variant="h5" fontWeight={600}>
        {fullName}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {profile.email}
      </Typography>

      {profile.user_profile?.phone && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {profile.user_profile.phone}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ textTransform: "none" }}
        >
          Edit Profile
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => refetch()}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Box>
    </Box>
  );
}
