import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LoginPage from "../components/LoginPage";
import TreasuryDemo from "../components/TreasuryDemo/TreasuryDemo";

const FEATURES = [
  {
    Icon: GroupsIcon,
    label: "Create groups for trips, households, or shared expenses",
  },
  {
    Icon: ReceiptLongIcon,
    label: "Add expenses and split them fairly",
  },
  {
    Icon: SwapHorizIcon,
    label: "See who owes whom and settle up",
  },
  {
    Icon: ShowChartIcon,
    label: "Track spending across all your groups",
  },
] as const;

interface HomePageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
}

const HomePage: React.FC<HomePageProps> = ({
  onLogin,
  onRegister,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: {
          xs: "column",
          md: "row",
        },
        minHeight: "100dvh",
      }}
    >
      {/* Treasury introduction */}
      <Box
        sx={{
          flex: {
            xs: "0 0 auto",
            md: "0 0 45%",
          },
          bgcolor: "primary.main",
          color: "common.white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: {
            xs: 3,
            sm: 5,
            md: 8,
          },
          py: {
            xs: 4,
            sm: 5,
            md: 8,
          },
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 600,
            fontSize: {
              xs: "2.25rem",
              md: "3rem",
            },
            mb: 1,
          }}
        >
          Treasury
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 400,
            opacity: 0.9,
            fontSize: {
              xs: "1rem",
              sm: "1.15rem",
            },
            mb: {
              xs: 0,
              sm: 4,
            },
          }}
        >
          Share expenses. Settle up. Stay even.
        </Typography>

        <Stack
          spacing={2.5}
          sx={{
            display: {
              xs: "none",
              sm: "flex",
            },
          }}
        >
          {FEATURES.map(({ Icon, label }) => (
            <Box
              key={label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Icon fontSize="small" />

              <Typography variant="body1">
                {label}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box
          sx={{
            display: "flex",
            justifyContent: { xs: "center", md: "flex-start" },
            mt: { xs: 3, sm: 4 },
          }}
        >
          <TreasuryDemo />
        </Box>
      </Box>

      {/* Sign in / registration */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: {
            xs: 2,
            sm: 4,
            md: 6,
          },
          py: {
            xs: 4,
            md: 6,
          },
        }}
      >
        <LoginPage
          onLogin={onLogin}
          onRegister={onRegister}
        />
      </Box>
    </Box>
  );
};

export default HomePage;