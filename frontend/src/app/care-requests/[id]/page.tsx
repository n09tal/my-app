"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  Snackbar,
  Alert,
  Avatar,
} from "@mui/material";
import {
  ArrowBack,
  Star,
  LocationOn,
  CheckCircle,
  Person,
  CalendarToday,
  MedicalServices,
  Notes,
} from "@mui/icons-material";
import { colors } from "@/styles/theme";
import { useCareRequest } from "@/features/careRequests";
import type { CareRequestStatus, NotifiedVendor } from "@/features/careRequests";

const statusConfig: Record<CareRequestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: colors.textMuted, bg: "#f3f4f6" },
  open: { label: "Open", color: colors.primaryDark, bg: colors.primarySoft },
  closed: { label: "Closed", color: "#6b7280", bg: colors.closed },
  urgent: { label: "Urgent", color: "#ffffff", bg: colors.coral },
  needs_assistance: { label: "Needs Assistance", color: "#854d0e", bg: "#fef9c3" },
};

function VendorCard({
  vendor,
  isSelected,
  onSelect,
}: {
  vendor: NotifiedVendor;
  isSelected: boolean;
  onSelect: (vendorId: number) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        border: `2px solid ${isSelected ? colors.primary : colors.borderLight}`,
        borderRadius: "12px",
        bgcolor: isSelected ? colors.primarySoft : colors.surface,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: colors.primary,
          bgcolor: colors.surfaceHover,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: colors.primaryDark,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          {vendor.vendor_name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: colors.text }}>
            {vendor.vendor_name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocationOn sx={{ fontSize: 14, color: colors.primary }} />
            <Typography sx={{ fontSize: "0.8rem", color: colors.textMuted }}>
              {vendor.vendor_county} County
            </Typography>
            <Star sx={{ fontSize: 14, color: "#f59e0b", ml: 0.5 }} />
            <Typography sx={{ fontSize: "0.8rem", color: colors.textMuted }}>
              {vendor.vendor_rating}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
            Notified {new Date(vendor.notified_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
      {isSelected ? (
        <Chip
          icon={<CheckCircle sx={{ fontSize: 16 }} />}
          label="Selected"
          size="small"
          sx={{
            bgcolor: colors.primaryDark,
            color: "#ffffff",
            fontWeight: 600,
            "& .MuiChip-icon": { color: "#ffffff" },
          }}
        />
      ) : (
        <Button
          size="small"
          onClick={() => onSelect(vendor.vendor_id)}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            color: colors.primaryDark,
            bgcolor: colors.primarySoft,
            borderRadius: "8px",
            "&:hover": { bgcolor: colors.primaryMuted },
          }}
        >
          Select Vendor
        </Button>
      )}
    </Box>
  );
}

export default function CareRequestDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { request, isLoading } = useCareRequest(id, !!id);

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(
    request?.selected_vendor?.vendor_id ?? null,
  );
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  useEffect(() => {
    setSelectedVendorId(request?.selected_vendor?.vendor_id ?? null);
  }, [request?.selected_vendor?.vendor_id]);

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
        <Container maxWidth="lg" sx={{ pt: 12, textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: colors.text }}>
            Loading care request...
          </Typography>
        </Container>
      </Box>
    );
  }

  if (!request) {
    return (
      <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
        <Container maxWidth="lg" sx={{ pt: 12, textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: colors.text }}>
            Care Request Not Found
          </Typography>
          <Button
            component={Link}
            href="/care-requests"
            startIcon={<ArrowBack />}
            sx={{ mt: 2, textTransform: "none" }}
          >
            Back to Dashboard
          </Button>
        </Container>
      </Box>
    );
  }

  const statusCfg = statusConfig[request.status];

  const handleSelectVendor = (vendorId: number) => {
    setSelectedVendorId(vendorId);
    const vendor = request.notified_vendors.find((v) => v.vendor_id === vendorId);
    setSnackbar({
      open: true,
      message: `Selected ${vendor?.vendor_name} for this care request (mock)`,
    });
  };

  return (
    <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
      <Box sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center" }}>
            <Chip
              label={statusCfg.label}
              sx={{
                bgcolor: statusCfg.bg,
                color: statusCfg.color,
                fontWeight: 700,
                fontSize: "0.85rem",
                mb: 2,
                px: 1,
              }}
            />
            <Typography
              variant="h2"
              sx={{
                color: colors.text,
                fontWeight: 800,
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 1,
                lineHeight: 1.1,
              }}
            >
              Care Request #{request.id}
            </Typography>
            <Typography
              sx={{
                color: colors.textMuted,
                fontSize: { xs: "1rem", md: "1.2rem" },
                maxWidth: 550,
                mx: "auto",
              }}
            >
              For {request.client_name}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: -6, pb: 6, position: "relative", zIndex: 1 }}>
        <Button
          component={Link}
          href="/care-requests"
          startIcon={<ArrowBack />}
          sx={{
            textTransform: "none",
            color: colors.textMuted,
            mb: 2,
            "&:hover": { bgcolor: colors.surfaceHover },
          }}
        >
          Back to Dashboard
        </Button>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Card
            sx={{
              borderRadius: "20px",
              border: `2px solid ${colors.borderLight}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Person sx={{ color: colors.primary }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: colors.text }}>
                    {request.client_name}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <MedicalServices sx={{ color: colors.primary, mt: 0.25 }} />
                <Box>
                  <Typography sx={{ fontWeight: 600, color: colors.text, mb: 0.75 }}>
                    Services Requested
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {request.services.map((service) => (
                      <Chip
                        key={service}
                        label={service}
                        size="small"
                        sx={{
                          bgcolor: colors.primarySoft,
                          color: colors.primaryDark,
                          fontWeight: 500,
                          fontSize: "0.8rem",
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <CalendarToday sx={{ color: colors.primary, mt: 0.25 }} />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1.5,
                    width: "100%",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>
                      Created
                    </Typography>
                    <Typography sx={{ fontSize: "0.9rem", color: colors.text }}>
                      {new Date(request.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>
                      Last Updated
                    </Typography>
                    <Typography sx={{ fontSize: "0.9rem", color: colors.text }}>
                      {new Date(request.updated_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {request.notes && (
                <>
                  <Divider />
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                    <Notes sx={{ color: colors.primary, mt: 0.25 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: colors.text, mb: 0.5 }}>
                        Notes
                      </Typography>
                      <Typography sx={{ fontSize: "0.9rem", color: colors.textMuted }}>
                        {request.notes}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}

              <Divider />

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {request.is_private_pay && (
                  <Chip
                    label="Private Pay"
                    variant="outlined"
                    size="small"
                    sx={{ borderColor: colors.coral, color: colors.coral, fontWeight: 600 }}
                  />
                )}
                {request.is_urgent && (
                  <Chip
                    label="Urgent"
                    size="small"
                    sx={{ bgcolor: colors.coral, color: "#ffffff", fontWeight: 600 }}
                  />
                )}
                {request.needs_assistance && (
                  <Chip
                    label="Needs Assistance"
                    size="small"
                    sx={{ bgcolor: "#fef9c3", color: "#854d0e", fontWeight: 600 }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: "20px",
              border: `2px solid ${colors.borderLight}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text, mb: 2 }}>
                Interested Vendors ({request.notified_vendors.length})
              </Typography>

              {request.notified_vendors.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 4,
                    bgcolor: colors.surfaceHover,
                    borderRadius: "12px",
                  }}
                >
                  <Typography sx={{ color: colors.textMuted, fontWeight: 500 }}>
                    No vendors have expressed interest yet
                  </Typography>
                  <Typography sx={{ fontSize: "0.85rem", color: colors.textMuted, mt: 0.5 }}>
                    Vendors will appear here once they notify on this request
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {request.notified_vendors.map((vendor) => (
                    <VendorCard
                      key={vendor.vendor_id}
                      vendor={vendor}
                      isSelected={selectedVendorId === vendor.vendor_id}
                      onSelect={handleSelectVendor}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success"
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
