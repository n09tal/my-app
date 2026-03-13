"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useSessionStore } from "@/features/session/store/sessionStore";
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
  Fade,
  Zoom,
  Rating,
  Collapse,
} from "@mui/material";
import {
  LocationOn,
  Phone,
  Email,
  ChevronLeft,
  FormatQuote,
  Favorite,
  Star,
  HourglassEmpty,
  CheckCircle,
  FavoriteBorder,
  Public,
  ArrowOutward,
  Schedule,
  Translate,
  LocalHospital,
  AccountBalanceWallet,
  Handshake,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { useState, use, useEffect, useRef } from "react";
import { ClaimProfileModal } from "@/components/claimProfileModal";
import { PaginationNav } from "@/components/PaginationNav";
import { ReviewCard } from "@/components/reviewCard";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useToggleFavoriteMutation, useFavorites } from "@/features/favorites";
import { useReviews } from "@/features/reviews/hooks/useReviews";
import { useVendor, useClaimStatus } from "@/features/vendors";
import { colors } from "@/styles/theme";
import {
  getMonogram,
  isValidImageUrl,
  parseAvailability,
} from "@/utils/providerUtils";


const pageColors = {
  ...colors,
  secondaryLight: "#f4a574",
  accentSoft: colors.primarySoft,
  accentMuted: colors.primaryMuted,
};


const availabilityColors = [
  { bg: colors.primaryDark, text: "#ffffff" },  
  { bg: colors.coral, text: "#ffffff" },         
  { bg: colors.yellow, text: "#1f2937" },        
];


function WeeklyAvailability({ availability }: { availability: string }) {
  const { schedule, timeSlots } = parseAvailability(availability);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        {schedule.map((day) => {
          const colorSet = day.active 
            ? availabilityColors[day.colorIndex] 
            : { bg: colors.closed, text: colors.textMuted };
          return (
            <Tooltip
              key={day.short}
              title={day.active ? `${day.full}: ${day.hours || "Available"}` : `${day.full}: Closed`}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <Box
                  sx={{
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: colorSet.bg,
                    color: colorSet.text,
                    fontWeight: 700,
                    fontSize: { xs: "0.7rem", sm: "0.8rem" },
                    boxShadow: day.active
                      ? `0 4px 14px rgba(0,0,0,0.15)`
                      : "none",
                  }}
                >
                  {day.short}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Time Slots Legend */}
      {timeSlots.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
          {timeSlots.map((slot, idx) => {
            const colorIndex = Math.min(idx, 2);
            const colorSet = availabilityColors[colorIndex];
            return (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: `${colorSet.bg}15`,
                  borderRadius: "10px",
                  border: `2px solid ${colorSet.bg}`,
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "4px",
                    bgcolor: colorSet.bg,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontWeight: 600, color: colors.text, fontSize: "0.9rem" }}>
                  {slot}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function BentoCard({
  children,
  span = 1,
  highlight = false,
  sx = {},
}: {
  children: React.ReactNode;
  span?: 1 | 2;
  highlight?: boolean;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        gridColumn: { xs: "span 1", md: `span ${span}` },
        background: highlight ? colors.background : colors.surface,
        borderRadius: "20px",
        p: 3,
        border: highlight ? "none" : `2px solid ${colors.border}`,
        boxShadow: highlight 
          ? "0 8px 32px rgba(64, 108, 122, 0.25)"
          : "0 4px 16px rgba(0,0,0,0.06)",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function RatingStars({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          sx={{
            fontSize: 20,
            color: star <= rating ? "#fbbf24" : colors.border,
            transition: "all 0.2s ease",
          }}
        />
      ))}
      <Typography
        variant="body2"
        sx={{ color: colors.text, ml: 1, fontWeight: 500 }}
      >
        {rating?.toFixed(1) || "0.0"} ({reviews || 0})
      </Typography>
    </Box>
  );
}

function ContactButton({
  icon,
  label,
  href,
  primary = false,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  primary?: boolean;
  external?: boolean;
}) {
  const buttonProps = external && href ? {
    component: "a" as const,
    href,
    target: "_blank",
    rel: "noopener noreferrer",
  } : {
    href,
  };

  return (
    <Button
      {...buttonProps}
      disabled={!href}
      sx={{
        flex: 1,
        py: 2,
        px: 3,
        borderRadius: "14px",
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.95rem",
        bgcolor: primary ? colors.coral : colors.surface,
        color: primary ? "#ffffff" : colors.text,
        border: primary ? "none" : `2px solid ${colors.border}`,
        boxShadow: primary 
          ? "0 4px 14px rgba(232, 122, 66, 0.35)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.3s ease",
        "&:hover": {
          bgcolor: primary ? pageColors.secondaryLight : colors.surfaceHover,
          transform: "translateY(-2px)",
          boxShadow: primary 
            ? "0 8px 24px rgba(232, 122, 66, 0.45)"
            : "0 6px 16px rgba(0,0,0,0.1)",
          borderColor: primary ? "transparent" : colors.primary,
        },
        "&:disabled": {
          opacity: 0.5,
        },
      }}
      startIcon={icon}
    >
      {label}
    </Button>
  );
}

function ServiceTag({ name, index }: { name: string; index: number }) {
  return (
    <Fade in timeout={200 + index * 50}>
      <Chip
        label={name}
        size="small"
        sx={{
          bgcolor: colors.primarySoft,
          color: colors.primaryDark,
          fontWeight: 600,
          borderRadius: "8px",
          px: 0.5,
          py: 1.5,
          fontSize: "0.75rem",
          border: `1px solid ${colors.primary}`,
        }}
      />
    </Fade>
  );
}

function DuettPartnerBadge() {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "rgba(255,255,255,0.95)",
        px: 2,
        py: 0.75,
        borderRadius: "20px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <Handshake sx={{ fontSize: 20, color: colors.primaryDark }} />
      <Typography sx={{ fontWeight: 700, color: colors.primaryDark, fontSize: "0.85rem" }}>
        Duett Partner
      </Typography>
    </Box>
  );
}

export default function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { vendor, isLoading, isError, refetch } = useVendor(parseInt(id));
  const router = useRouter();

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const vendorId = parseInt(id);
  const { hasPendingClaim } = useClaimStatus(vendorId, isAuthenticated);
  const { isFavorite } = useFavorites();
  const { toggleFavorite, isLoading: isFavoriteLoading } =
    useToggleFavoriteMutation();
  const [optimisticFavorite, setOptimisticFavorite] = useState(false);
  const isPendingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const reviewsLimit = 5;
  const reviewsOffset = (reviewsPage - 1) * reviewsLimit;

  const {
    reviews,
    count: reviewsCount,
    isLoading: reviewsLoading,
    isError: reviewsError,
  } = useReviews(parseInt(id), { limit: reviewsLimit, offset: reviewsOffset });

  const totalReviewPages = Math.ceil(reviewsCount / reviewsLimit);

  useEffect(() => {
    if (vendor) {
      setOptimisticFavorite(vendor.is_favorite ?? false);
    } else if (!isPendingRef.current) {
      setOptimisticFavorite(isFavorite(vendorId));
    }
  }, [isFavorite, vendorId, vendor]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [vendorId]);

  const handleClaimClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?from=/agencies/${id}`);
      return;
    }
    setClaimModalOpen(true);
  };

  const handleBackToProviders = () => {
    const getLastSearchFilters = useSessionStore.getState().getLastSearchFilters;
    const lastFilters = getLastSearchFilters();
    
    if (lastFilters) {
      // Restore filters
      const params = new URLSearchParams();
      params.set("offset", "0");
      params.set("limit", "12");
      
      if (lastFilters.agencyName) params.set("agencyName", lastFilters.agencyName);
      if (lastFilters.zipCode) params.set("zipCode", lastFilters.zipCode);
      if (lastFilters.services.length > 0) {
        params.set("services", lastFilters.services.join(","));
      }
      if (lastFilters.minRating) params.set("minRating", lastFilters.minRating);
      if (lastFilters.languages.length > 0) {
        params.set("languages", lastFilters.languages.join(","));
      }
      if (lastFilters.fundingSources.length > 0) {
        params.set("fundingSources", lastFilters.fundingSources.join(","));
      }
      
      router.push(`/agencies?${params.toString()}`);
    } else {
      // No saved filters, just go to agencies
      router.push("/agencies");
    }
  };

  const getClaimButtonContent = () => {
    if (!vendor) return null;

    if (vendor.claim_status === "claimed") {
      return (
        <Chip
          icon={<CheckCircle sx={{ fontSize: 16 }} />}
          label="Claimed"
          color="success"
          size="small"
          variant="outlined"
        />
      );
    }

    if (hasPendingClaim) {
      return (
        <Chip
          icon={<HourglassEmpty sx={{ fontSize: 16 }} />}
          label="Claim Pending"
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    }

    return (
      <Button
        variant="outlined"
        size="small"
        sx={{ textTransform: "none" }}
        onClick={handleClaimClick}
      >
        Claim this Profile
      </Button>
    );
  };

  const handleFavoriteClick = () => {
    if (!isAuthenticated || isFavoriteLoading) return;

    const previousValue = optimisticFavorite;
    isPendingRef.current = true;
    setOptimisticFavorite(!optimisticFavorite);

    toggleFavorite(
      { vendorId, isFavorite: previousValue },
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

  const handleReviewsPageChange = (page: number) => {
    setReviewsPage(page);
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
        {/* Hero placeholder */}
        <Box
          sx={{
            pt: { xs: 3, md: 4 },
            pb: { xs: 12, md: 16 },
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 4,
              }}
            >
              <Button
                onClick={handleBackToProviders}
                startIcon={<ChevronLeft />}
                sx={{
                  color: colors.text,
                  textTransform: "none",
                  fontWeight: 500,
                  "&:hover": {
                    bgcolor: colors.primarySoft,
                  },
                }}
              >
                Back to Providers
              </Button>
            </Box>
  
            {/* Loading skeleton */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "center", md: "flex-start" },
                gap: 4,
              }}
            >
              {/* Avatar skeleton */}
              <Box
                sx={{
                  width: { xs: 120, md: 140 },
                  height: { xs: 120, md: 140 },
                  borderRadius: "24px",
                  bgcolor: colors.surfaceHover,
                }}
              />
              {/* Text skeleton */}
              <Box sx={{ flex: 1, width: "100%" }}>
                <Box sx={{ height: 24, width: 100, bgcolor: colors.surfaceHover, borderRadius: 1, mb: 2 }} />
                <Box sx={{ height: 40, width: "60%", bgcolor: colors.surfaceHover, borderRadius: 1, mb: 2 }} />
                <Box sx={{ height: 20, width: "40%", bgcolor: colors.surfaceHover, borderRadius: 1 }} />
              </Box>
            </Box>
          </Container>
        </Box>
  
        {/* Loading spinner */}
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 2,
            }}
          >
            <CircularProgress sx={{ color: colors.primary }} />
            <Typography sx={{ color: colors.textMuted }}>
              Loading provider details...
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  if (isError || !vendor) {
    notFound();
  }

  const businessName = vendor.display_name || vendor.legal_name;
  const monogram = getMonogram(businessName);
  const hasValidImage = isValidImageUrl(vendor.image) && !imageError;

  return (
    <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
      <ClaimProfileModal
        open={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        agencyName={businessName}
        agencyId={vendor.id}
        onSuccess={() => refetch()}
      />

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 3, md: 4 },
          pb: { xs: 12, md: 16 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          {/* Navigation */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Button
              onClick={handleBackToProviders}
              startIcon={<ChevronLeft />}
              sx={{
                color: colors.text,
                textTransform: "none",
                fontWeight: 500,
                "&:hover": {
                  bgcolor: colors.primarySoft,
                },
              }}
            >
              Back to Providers
            </Button>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {/* Duett Partner Badge for verified providers */}
              {vendor.verified && <DuettPartnerBadge />}
              {mounted && isAuthenticated && (
                <IconButton
                  onClick={handleFavoriteClick}
                  disabled={isFavoriteLoading}
                  sx={{
                    bgcolor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    "&:hover": { bgcolor: colors.surfaceHover },
                  }}
                >
                  {optimisticFavorite ? (
                    <Favorite sx={{ color: "#ef4444" }} />
                  ) : (
                    <FavoriteBorder sx={{ color: colors.textMuted }} />
                  )}
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Provider Identity */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "center", md: "flex-start" },
              gap: 4,
              textAlign: { xs: "center", md: "left" },
            }}
          >
            {/* Avatar */}
            <Zoom in timeout={500}>
              <Box
                sx={{
                  width: { xs: 120, md: 140 },
                  height: { xs: 120, md: 140 },
                  borderRadius: "24px",
                  overflow: "hidden",
                  bgcolor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 20px 60px rgba(0,0,0,0.25)`,
                  border: `4px solid rgba(255,255,255,0.9)`,
                  flexShrink: 0,
                }}
              >
                {hasValidImage ? (
                  <Box
                    component="img"
                    src={vendor.image}
                    alt={businessName}
                    onError={() => setImageError(true)}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Typography
                    sx={{
                      color: colors.primaryDark,
                      fontWeight: 700,
                      fontSize: { xs: "2.5rem", md: "3rem" },
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {monogram}
                  </Typography>
                )}
              </Box>
            </Zoom>

            {/* Info */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap", justifyContent: { xs: "center", md: "flex-start" } }}>
                <Chip
                  label={vendor.vendor_type || "Provider"}
                  sx={{
                    bgcolor: colors.primarySoft,
                    color: colors.primaryDark,
                    fontWeight: 600,
                    border: `1px solid ${colors.primary}`,
                  }}
                />
              </Box>

              <Typography
                variant="h3"
                sx={{
                  color: colors.text,
                  fontWeight: 800,
                  mb: 1,
                  fontSize: { xs: "1.8rem", md: "2.5rem" },
                  letterSpacing: "-0.02em",
                }}
              >
                {businessName}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  color: colors.text,
                  flexWrap: "wrap",
                  justifyContent: { xs: "center", md: "flex-start" },
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <LocationOn sx={{ fontSize: 18, color: colors.primaryDark }} />
                  <Typography variant="body2">{vendor.primary_county}</Typography>
                </Box>
                <RatingStars rating={vendor.rating ?? 0} reviews={vendor.review_count ?? 0} />
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: { xs: "center", md: "flex-start" } }}>
                {getClaimButtonContent()}
                <Link href={`/review/${vendor.id}`} style={{ textDecoration: "none" }}>
                  <Button
                    sx={{
                      color: colors.text,
                      textTransform: "none",
                      fontWeight: 600,
                      "&:hover": { bgcolor: colors.primarySoft },
                    }}
                  >
                    Write a Review
                  </Button>
                </Link>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content - Bento Grid */}
      <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -10 }, pb: 6, position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {/* About Card */}
          <BentoCard>
            <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>
              About
            </Typography>
            <Typography
              sx={{
                mt: 1,
                color: colors.text,
                fontSize: "0.95rem",
                lineHeight: 1.7,
              }}
            >
              {vendor.description || "This provider hasn't added a description yet. Contact them directly to learn more about their services."}
            </Typography>
          </BentoCard>

          {/* Quick Contact Card */}
          <BentoCard>
            <Typography
              variant="overline"
              sx={{ color: colors.primaryDark, fontWeight: 600, letterSpacing: 1 }}
            >
              Get in Touch
            </Typography>
            <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {vendor.contact_phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: colors.surface,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <Phone sx={{ color: colors.primaryDark, fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: colors.textMuted, fontSize: "0.7rem" }}>
                      Phone
                    </Typography>
                    <Typography
                      component="a"
                      href={`tel:${vendor.contact_phone}`}
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {vendor.contact_phone}
                    </Typography>
                  </Box>
                </Box>
              )}
              {vendor.contact_email && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: colors.surface,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <Email sx={{ color: colors.primaryDark, fontSize: 18 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: colors.textMuted, fontSize: "0.7rem" }}>
                      Email
                    </Typography>
                    <Typography
                      component="a"
                      href={`mailto:${vendor.contact_email}`}
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        textDecoration: "none",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {vendor.contact_email}
                    </Typography>
                  </Box>
                </Box>
              )}
              {vendor.website && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: colors.surface,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <Public sx={{ color: colors.primaryDark, fontSize: 18 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: colors.textMuted, fontSize: "0.7rem" }}>
                      Website
                    </Typography>
                    <Typography
                      component="a"
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      Visit Site <ArrowOutward sx={{ fontSize: 12 }} />
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </BentoCard>

          {/* Availability Card */}
          <BentoCard>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Schedule sx={{ color: colors.primaryDark }} />
              <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>
                Availability
              </Typography>
            </Box>
            <WeeklyAvailability availability={vendor.availability} />
          </BentoCard>

          {/* Service Area Card - Spans 2 columns */}
          <BentoCard span={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <LocationOn sx={{ color: colors.primaryDark }} />
              <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>
                Service Area
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {vendor.primary_county && (
                <Chip
                  label={vendor.primary_county}
                  sx={{
                    bgcolor: colors.primarySoft,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    borderRadius: "10px",
                    border: `1.5px solid ${colors.primary}`,
                  }}
                />
              )}
              {vendor.counties && vendor.counties.length > 0 && (
                vendor.counties
                  .filter((c) => c.name !== vendor.primary_county)
                  .map((county) => (
                    <Chip
                      key={county.id}
                      label={county.name}
                      sx={{
                        bgcolor: colors.surfaceHover,
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        borderRadius: "10px",
                        border: `1px solid ${colors.border}`,
                      }}
                    />
                  ))
              )}
            </Box>
          </BentoCard>

          {/* Languages Card - Compact */}
          <BentoCard>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Translate sx={{ color: colors.primaryDark, fontSize: 20 }} />
              <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1, fontSize: "0.65rem" }}>
                Languages
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {vendor.languages && vendor.languages.length > 0 ? (
                vendor.languages.map((lang) => (
                  <Chip
                    key={lang}
                    label={lang.charAt(0).toUpperCase() + lang.slice(1)}
                    size="small"
                    sx={{
                      bgcolor: colors.surfaceHover,
                      fontWeight: 500,
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      border: `1px solid ${colors.border}`,
                    }}
                  />
                ))
              ) : (
                <Chip
                  label="English"
                  size="small"
                  sx={{
                    bgcolor: colors.surfaceHover,
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.border}`,
                  }}
                />
              )}
            </Box>
          </BentoCard>

          {/* Funding Sources Card */}
          <BentoCard>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <AccountBalanceWallet sx={{ color: colors.primaryDark }} />
              <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>
                Funding Accepted
              </Typography>
            </Box>
            {vendor.funding_sources && vendor.funding_sources.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {vendor.funding_sources.map((source) => (
                  <Box
                    key={source.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      bgcolor: colors.primarySoft,
                      borderRadius: "8px",
                      border: `1px solid ${colors.primary}`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: colors.primaryDark,
                      }}
                    />
                    <Typography sx={{ fontWeight: 500, color: colors.text, fontSize: "0.85rem" }}>
                      {source.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: colors.textMuted, fontStyle: "italic", fontSize: "0.85rem" }}>
                Contact for funding options.
              </Typography>
            )}
          </BentoCard>

          {/* Services Card - Spans 2 columns */}
          <BentoCard span={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <LocalHospital sx={{ color: colors.primaryDark }} />
              <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>
                Services Offered
              </Typography>
            </Box>
            {vendor.services && vendor.services.length > 0 ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {vendor.services.map((service, idx) => (
                  <ServiceTag key={service.id} name={service.name} index={idx} />
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: colors.textMuted, fontStyle: "italic", fontSize: "0.85rem" }}>
                No services listed yet.
              </Typography>
            )}
          </BentoCard>

          {/* Client Reviews Card - Full Width, Collapsible */}
          <BentoCard span={2} sx={{ gridColumn: { xs: "span 1", md: "span 3" } }}>
            {/* Header - Always visible, clickable */}
            <Box 
              onClick={() => setReviewsExpanded(!reviewsExpanded)}
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                cursor: "pointer",
                mb: reviewsExpanded ? 2 : 0,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <FormatQuote sx={{ color: colors.primaryDark }} />
                <Typography variant="overline" sx={{ color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>
                  Client Testimonials
                </Typography>
                
                {/* Quick Stats - Always visible */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
                  <Rating
                    value={vendor.rating ?? 0}
                    precision={0.5}
                    readOnly
                    size="small"
                    sx={{ 
                      "& .MuiRating-iconFilled": { color: "#fbbf24" },
                    }}
                  />
                  <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: colors.text }}>
                    {(vendor.rating ?? 0).toFixed(1)}
                  </Typography>
                  <Typography sx={{ color: colors.textMuted, fontSize: "0.8rem" }}>
                    ({vendor.review_count ?? 0})
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Link
                  href={`/review/${vendor.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ textDecoration: "none" }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      bgcolor: colors.coralSoft,
                      color: colors.coral,
                      borderRadius: "8px",
                      px: 1.5,
                      boxShadow: "none",
                      "&:hover": {
                        bgcolor: colors.coralLight,
                        color: "#ffffff",
                        boxShadow: "none",
                      },
                    }}
                  >
                    Leave a Review
                  </Button>
                </Link>
                <IconButton size="small">
                  {reviewsExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
            </Box>

            {/* Collapsible Content */}
            <Collapse in={reviewsExpanded}>

              {/* Reviews List */}
              {reviewsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress sx={{ color: colors.primary }} />
                </Box>
              ) : reviewsError ? (
                <Typography sx={{ color: "error.main", textAlign: "center", py: 4 }}>
                  Unable to load reviews. Please try again later.
                </Typography>
              ) : reviews && reviews.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {reviews.map((review, index) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      vendorId={parseInt(id)}
                      isAuthenticated={mounted && isAuthenticated}
                      showDivider={index < reviews.length - 1}
                    />
                  ))}

                  {totalReviewPages > 1 && (
                    <Box sx={{ mt: 2 }}>
                      <PaginationNav
                        currentPage={reviewsPage}
                        totalPages={totalReviewPages}
                        onPageChange={handleReviewsPageChange}
                        pagesPerSet={5}
                      />
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <FormatQuote sx={{ fontSize: 48, color: colors.border, mb: 1 }} />
                  <Typography sx={{ color: colors.textMuted }}>
                    No reviews yet. Be the first to share your experience!
                  </Typography>
                </Box>
              )}
            </Collapse>
          </BentoCard>

          {/* Contact Actions - Full Width */}
          <Box
            sx={{
              gridColumn: { xs: "span 1", md: "span 3" },
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <ContactButton
              icon={<Phone />}
              label="Call Now"
              href={vendor.contact_phone ? `tel:${vendor.contact_phone}` : undefined}
            />
            <ContactButton
              icon={<Email />}
              label="Send Email"
              href={vendor.contact_email ? `mailto:${vendor.contact_email}` : undefined}
            />
            {vendor.website && (
              <ContactButton
                icon={<Public />}
                label="Visit Website"
                href={vendor.website}
                primary
                external
              />
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
