"use client";

import { Button } from "@mui/material";
import { useLogout } from "../hooks/useLogout";

interface LogoutButtonProps {
  variant?: "text" | "outlined" | "contained";
  color?: "inherit" | "primary" | "secondary" | "error";
  fullWidth?: boolean;
  onClick?: () => void;
}

export function LogoutButton({
  variant = "text",
  color = "inherit",
  fullWidth = false,
  onClick,
}: LogoutButtonProps) {
  const { logout, isLoading } = useLogout();

  const handleLogout = () => {
    if (onClick) onClick();
    logout();
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      color={color}
      fullWidth={fullWidth}
      disabled={isLoading}
      sx={{ textTransform: "none" }}
    >
      {isLoading ? "Logging out..." : "Logout"}
    </Button>
  );
}
