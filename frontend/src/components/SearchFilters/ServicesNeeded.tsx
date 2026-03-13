"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  IconButton,
} from "@mui/material";
import { ExpandMore, Close, LocalHospital } from "@mui/icons-material";
import { ServiceTypes } from "@/constants/serviceTypes";
import { colors } from "@/styles/theme";

interface ServicesNeededInput {
  selectedServices: string[];
  onToggleService: (serviceName: string) => void;
  onClearAll: () => void;
}

export function ServicesNeeded({
  selectedServices,
  onToggleService,
  onClearAll,
}: ServicesNeededInput) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600, color: colors.text }}
      >
        Services Needed
      </Typography>

      <Button
        variant="outlined"
        fullWidth
        onClick={() => setIsModalOpen(true)}
        sx={{
          justifyContent: "space-between",
          textTransform: "none",
          color: selectedServices.length > 0 ? colors.text : colors.textMuted,
          borderColor: colors.border,
          borderWidth: 1.5,
          borderRadius: "10px",
          bgcolor: "white",
          py: 1,
          "&:hover": {
            borderColor: colors.primary,
            bgcolor: "white",
          },
        }}
        startIcon={<LocalHospital sx={{ color: colors.primary }} />}
        endIcon={<ExpandMore />}
      >
        <span style={{ flex: 1, textAlign: "left" }}>
          {selectedServices.length > 0
            ? `${selectedServices.length} service${selectedServices.length > 1 ? "s" : ""} selected`
            : "Select services"}
        </span>
      </Button>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
        slotProps={{
          paper: {
            sx: {
              maxHeight: "80vh",
              borderRadius: "16px",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 3,
            pr: 6,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: colors.text }}>
            Select Services Needed
          </Typography>
          <Typography
            variant="body2"
            component="div"
            sx={{ mt: 0.5, color: colors.textMuted }}
          >
            Choose the types of care services you&apos;re looking for. Click on
            each service to learn more.
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setIsModalOpen(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: colors.textMuted,
              "&:hover": { color: colors.text },
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {ServiceTypes.map((service) => (
              <Accordion
                key={service.name}
                elevation={0}
                sx={{
                  border: `1.5px solid ${selectedServices.includes(service.name) ? colors.primary : colors.border}`,
                  borderRadius: "12px !important",
                  bgcolor: selectedServices.includes(service.name)
                    ? "rgba(135, 198, 200, 0.08)"
                    : "white",
                  "&:before": { display: "none" },
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: colors.primaryDark }} />}
                  sx={{
                    "& .MuiAccordionSummary-content": {
                      alignItems: "center",
                      gap: 1.5,
                      my: 1,
                    },
                  }}
                >
                  <Checkbox
                    checked={selectedServices.includes(service.name)}
                    onChange={() => onToggleService(service.name)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      p: 0,
                      color: colors.border,
                      "&.Mui-checked": { color: colors.primaryDark },
                    }}
                  />
                  <Typography sx={{ fontWeight: 600, flex: 1, color: colors.text }}>
                    {service.name}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails
                  sx={{ borderTop: `1px solid ${colors.border}`, pt: 2, bgcolor: "#f9fafb" }}
                >
                  <Typography variant="body2" sx={{ color: colors.textMuted, lineHeight: 1.6 }}>
                    {service.description}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, borderTop: `1px solid ${colors.border}` }}>
          <Button
            variant="outlined"
            onClick={() => {
              onClearAll();
            }}
            sx={{
              textTransform: "none",
              borderColor: colors.border,
              color: colors.textMuted,
              borderRadius: "10px",
              "&:hover": { borderColor: colors.primary, color: colors.text },
            }}
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            onClick={() => setIsModalOpen(false)}
            sx={{
              textTransform: "none",
              bgcolor: colors.coral,
              color: "white",
              borderRadius: "10px",
              px: 3,
              fontWeight: 600,
              "&:hover": { bgcolor: "#d66a35" },
            }}
          >
            Apply ({selectedServices.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
