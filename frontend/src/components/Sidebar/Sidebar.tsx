"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Typography,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import LoginIcon from "@mui/icons-material/Login";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { useLogout } from "@/features/auth";

export type NavItem = { label: string; href: string; icon?: React.ReactNode };

export const drawerWidthOpen = 240;
export const drawerWidthClosed = 72;

const itemButtonSx = {
  px: 2,
  "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
};

export default function Sidebar({
  open,
  onToggle,
  items,
  titleOpen = "Care4Me",
  titleClosed = "C4M",
}: {
  open: boolean;
  onToggle: () => void;
  items?: NavItem[];
  titleOpen?: string;
  titleClosed?: string;
}) {
  const { logout } = useLogout();

  const menu: NavItem[] = items ?? [
    { label: "Home", href: "/", icon: <HomeIcon /> },
    { label: "Login", href: "/login", icon: <LoginIcon /> },
    { label: "Profile", href: "/profile", icon: <PersonIcon /> },
    { label: "Signup", href: "/signup", icon: <PersonAddIcon /> },
    { label: "Logout", href: "/logout", icon: <LogoutIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? drawerWidthOpen : drawerWidthClosed,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          position: "relative",
          overflowX: "hidden",
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          width: open ? drawerWidthOpen : drawerWidthClosed,
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          backgroundColor: "#0f3d2e",
          color: "#fff",
          borderRight: () => `1px solid rgba(255,255,255,0.15)`,
        },
        "& .MuiListItemIcon-root": { color: "inherit" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
          px: open ? 2 : 0,
          height: 64,
        }}
      >
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          {open ? titleOpen : titleClosed}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

      <List sx={{ pb: 0 }}>
        {menu.map((it) => {
          const isLogout = it.label === "Logout";

          return (
            <Tooltip
              key={it.href}
              title={it.label}
              placement="right"
              disableHoverListener={open}
            >
              <ListItemButton
                component={isLogout ? "button" : Link}
                href={isLogout ? undefined : it.href}
                onClick={isLogout ? () => logout() : undefined}
                sx={itemButtonSx}
              >
                {it.icon && (
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : "auto",
                      justifyContent: "center",
                    }}
                  >
                    {it.icon}
                  </ListItemIcon>
                )}
                {open && <ListItemText primary={it.label} />}
              </ListItemButton>
            </Tooltip>
          );
        })}

        <Tooltip
          title={open ? "Collapse" : "Expand"}
          placement="right"
          disableHoverListener={open}
        >
          <ListItemButton onClick={onToggle} sx={itemButtonSx}>
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : "auto",
                justifyContent: "center",
              }}
            >
              {open ? (
                <KeyboardDoubleArrowLeftIcon />
              ) : (
                <KeyboardDoubleArrowRightIcon />
              )}
            </ListItemIcon>
            {open && <ListItemText primary={open ? "Collapse" : "Expand"} />}
          </ListItemButton>
        </Tooltip>
      </List>

      <Divider sx={{ mt: "auto", borderColor: "rgba(255,255,255,0.2)" }} />
    </Drawer>
  );
}
