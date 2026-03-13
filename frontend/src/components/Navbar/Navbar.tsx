"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@mui/material";
import {
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleOutlineIcon from "@mui/icons-material/AccountCircleOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SearchIcon from "@mui/icons-material/Search";
import DuettLogo from "@/assets/images/Duett_FullColor_Mailgun.png";
import DuettLogoBlack from "@/assets/images/Duett_OneColorBlack.png";
import { useAuthStore } from "@/features/auth/store/authStore";
import { colors } from "@/styles/theme";

const Navbar: React.FC = () => {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isLandingPage = pathname === "/";

  const handleMobileMenuOpen = (e: React.MouseEvent<HTMLElement>) =>
    setMobileMenuAnchor(e.currentTarget);
  const handleMobileMenuClose = () => setMobileMenuAnchor(null);

  const handleProfileMenuOpen = (e: React.MouseEvent<HTMLElement>) =>
    setProfileMenuAnchor(e.currentTarget);
  const handleProfileMenuClose = () => setProfileMenuAnchor(null);

  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.clearAuthenticated);

  const profile = useAuthStore((state) => state.user?.user_profile);

  const getInitials = () => {
    if (!profile) return "?";
    const first = profile.first_name?.charAt(0) || "";
    const last = profile.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const getAvatarColor = () => {
    const avatarColors = [colors.primaryDark];
    const firstName = profile?.first_name || "";
    const lastName = profile?.last_name || "";
    const nameHash = (firstName + lastName).length;
    return avatarColors[nameHash % avatarColors.length];
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
    router.push("/");
  };

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: isLandingPage ? colors.primary : colors.background,
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, md: 2 },
          marginBottom: "2rem",
        }}
      >
        {/* Left: Logo + Nav Links */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0, md: 1 },
          }}
        >
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                transition: "all 0.3s ease",
                padding: "8px",
                borderRadius: "8px",
                "&:hover": { backgroundColor: "primary.light" },
              }}
            >
              <Image
                src={isLandingPage ? DuettLogoBlack : DuettLogo}
                alt="Duett Logo"
                width={120}
                height={40}
                style={{ objectFit: "contain" }}
              />
            </Box>
          </Link>

          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 0.5,
              ml: 1,
            }}
          >
            <Button
              component={Link}
              href="/agencies"
              startIcon={<SearchIcon sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: isLandingPage ? colors.text : colors.primaryDark,
                bgcolor: pathname.startsWith("/agencies") ? colors.primarySoft : "transparent",
                borderRadius: "10px",
                px: 2,
                "&:hover": { bgcolor: colors.primarySoft },
              }}
            >
              Directory
            </Button>
            <Button
              component={Link}
              href="/care-requests"
              startIcon={<AssignmentIcon sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: isLandingPage ? colors.text : colors.primaryDark,
                bgcolor: pathname.startsWith("/care-requests") ? colors.primarySoft : "transparent",
                borderRadius: "10px",
                px: 2,
                "&:hover": { bgcolor: colors.primarySoft },
              }}
            >
              Care Requests
            </Button>
          </Box>
        </Box>

        {/* Right: Profile Icon (Desktop) */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
          }}
        >
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              color: colors.text,
              backgroundColor: "transparent",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: colors.primarySoft,
                transform: "scale(1.05)",
              },
            }}
          >
            {isLoggedIn ? (
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: getAvatarColor(),
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                {getInitials()}
              </Avatar>
            ) : (
              <AccountCircleOutlineIcon sx={{ fontSize: 36 }} />
            )}
          </IconButton>
        </Box>

        {/* Mobile: Hamburger Menu */}
        <Box sx={{ display: { xs: "flex", md: "none" } }}>
          <IconButton
            size="large"
            color="inherit"
            onClick={handleMobileMenuOpen}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Profile Dropdown Menu (Desktop) */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          },
        }}
      >
        {isLoggedIn ? (
          [
            <MenuItem
              key="account"
              component={Link}
              href="/account"
              onClick={handleProfileMenuClose}
            >
              <ListItemIcon>
                <PersonOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Account</ListItemText>
            </MenuItem>,
            <Divider key="divider" />,
            <MenuItem key="logout" onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign Out</ListItemText>
            </MenuItem>,
          ]
        ) : (
          <MenuItem
            key="login"
            component={Link}
            href="/login"
            onClick={handleProfileMenuClose}
          >
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign In</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          key="directory"
          component={Link}
          href="/agencies"
          onClick={handleMobileMenuClose}
        >
          <ListItemIcon>
            <SearchIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Directory</ListItemText>
        </MenuItem>
        <MenuItem
          key="care-requests"
          component={Link}
          href="/care-requests"
          onClick={handleMobileMenuClose}
        >
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Care Requests</ListItemText>
        </MenuItem>
        <Divider />
        {isLoggedIn ? (
          [
            <MenuItem
              key="account"
              component={Link}
              href="/account"
              onClick={handleMobileMenuClose}
            >
              <ListItemIcon>
                <PersonOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Account</ListItemText>
            </MenuItem>,
            <Divider key="divider" />,
            <MenuItem
              key="logout"
              onClick={() => {
                handleLogout();
                handleMobileMenuClose();
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign Out</ListItemText>
            </MenuItem>,
          ]
        ) : (
          <MenuItem
            key="login"
            component={Link}
            href="/login"
            onClick={handleMobileMenuClose}
          >
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign In</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default Navbar;