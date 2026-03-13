"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Star,
  LocationOn,
  Favorite,
  FavoriteBorder,
  Handshake,
} from "@mui/icons-material";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useToggleFavoriteMutation } from "@/features/favorites";
import type { Vendor } from "@/features/vendors";
import { colors } from "@/styles/theme";
import { getMonogram, isValidImageUrl } from "@/utils/providerUtils";

interface AgencyCardProps {
  agency: Vendor;
  isFavorite?: boolean;
}

export function AgencyCard({ agency, isFavorite = false }: AgencyCardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { toggleFavorite, isLoading } = useToggleFavoriteMutation();
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);
  const isPendingRef = useRef(false);
  const [imageError, setImageError] = useState(false); 
  const [isHovered, setIsHovered] = useState(false);    

  useEffect(() => {
    if (!isPendingRef.current) {
      setOptimisticFavorite(isFavorite);
    }
  }, [isFavorite]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || isLoading) return;

    const previousValue = optimisticFavorite;
    isPendingRef.current = true;
    setOptimisticFavorite(!optimisticFavorite);

    toggleFavorite(
      { vendorId: agency.id, isFavorite: previousValue },
      {
        onSuccess: () => {
          isPendingRef.current = false;
        },
        onError: () => {
          isPendingRef.current = false;
          setOptimisticFavorite(previousValue);
        },
      },
    );
  };

  const businessName = agency.display_name || agency.legal_name;
  const monogram = getMonogram(businessName);
  const hasValidImage = isValidImageUrl(agency.image) && !imageError;

  return (
    <Link href={`/agencies/${agency.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          borderRadius: "16px",
          bgcolor: colors.surface,
          border: `2px solid ${isHovered ? colors.primary : colors.border}`,
          boxShadow: isHovered ? "0 12px 32px rgba(64, 108, 122, 0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
          transition: "all 0.25s ease",
          transform: isHovered ? "translateY(-4px)" : "none",
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {/* Header with gradient */}
        <Box
          sx={{
            height: 100,
            background: colors.gradient,
            position: "relative",
          }}
        >
          {/* Avatar */}
          <Box
            sx={{
              position: "absolute",
              bottom: -32,
              left: 20,
              width: 64,
              height: 64,
              borderRadius: "14px",
              bgcolor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "3px solid white",
              overflow: "hidden",
            }}
          >
            {hasValidImage ? (
              <Box
                component="img"
                src={agency.image}
                alt={businessName}
                onError={() => setImageError(true)}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Typography sx={{ color: colors.primaryDark, fontWeight: 700, fontSize: "1.25rem" }}>
                {monogram}
              </Typography>
            )}
          </Box>

          {/* Partner Badge */}
          {agency.verified && (
            <Box
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "rgba(255,255,255,0.95)",
                px: 1.25,
                py: 0.5,
                borderRadius: "8px",
              }}
            >
              <Handshake sx={{ fontSize: 14, color: colors.primaryDark }} />
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: colors.primaryDark }}>
                Duett Partner
              </Typography>
            </Box>
          )}

          {/* Favorite */}
          {isAuthenticated && (
            <IconButton
              onClick={handleFavoriteClick}
              disabled={isLoading}
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                bgcolor: "rgba(255,255,255,0.9)",
                width: 32,
                height: 32,
                "&:hover": { bgcolor: "white" },
              }}
            >
              {optimisticFavorite ? (
                <Favorite sx={{ color: "#ef4444", fontSize: 16 }} />
              ) : (
                <FavoriteBorder sx={{ color: colors.textMuted, fontSize: 16 }} />
              )}
            </IconButton>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ pt: 5, pb: 2.5, px: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: colors.text, mb: 0.5 }}>
            {businessName}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <LocationOn sx={{ fontSize: 14, color: colors.primary }} />
            <Typography sx={{ color: colors.textMuted, fontSize: "0.85rem" }}>
              {agency.primary_county}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Star sx={{ fontSize: 16, color: "#f59e0b" }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: colors.text }}>
              {agency.rating ?? 0}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: colors.textMuted }}>
              ({agency.review_count ?? 0} reviews)
            </Typography>
          </Box>
        </Box>
      </Box>
    </Link>
  );
}