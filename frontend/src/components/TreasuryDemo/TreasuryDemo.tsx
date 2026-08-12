import React, { useEffect, useMemo, useState } from "react";
import { Box, Fade, Typography, useMediaQuery } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  DemoStep,
  STEP_SEQUENCE,
  STEP_DURATIONS,
  ACTIVE_TAB_BY_STEP,
} from "./demoData";
import {
  GroupsScreen,
  ExpensesScreen,
  SettlementsScreen,
  TotalsScreen,
} from "./DemoScreens";

// Same nav order/icons as MainApp's real NAV_ITEMS. Expenses/Settlements
// require a selected group there too, which is mirrored below.
const TABS = [
  { label: "Groups", Icon: GroupsIcon, requiresGroup: false },
  { label: "Expenses", Icon: ReceiptLongIcon, requiresGroup: true },
  { label: "Settlements", Icon: SwapHorizIcon, requiresGroup: true },
  { label: "Totals", Icon: ShowChartIcon, requiresGroup: false },
] as const;

// A representative frame shown, static, to visitors who asked the OS for
// reduced motion — the full step-cycling animation is skipped for them.
const REDUCED_MOTION_STEP: DemoStep = "expenses";

// Measured against the tallest step's real settled (post-transition) content
// height — expenseForm at ~201px, now the tallest since its base-expense
// list is hidden while the form is open (see Revision 5 in
// HOMEPAGE_DEMO_PLAN.md). ~14px headroom over that measured figure; every
// other step is shorter and centers within the leftover space via
// justifyContent below.
const PREVIEW_HEIGHT = 215;

const renderScreen = (step: DemoStep) => {
  switch (step) {
    case "groups":
    case "groupSelected":
      return <GroupsScreen step={step} />;
    case "expenses":
    case "expenseForm":
    case "expenseSaved":
      return <ExpensesScreen step={step} />;
    case "settlements":
      return <SettlementsScreen />;
    case "totals":
      return <TotalsScreen />;
    default:
      return null;
  }
};

// Purely decorative, looping preview of the core Groups -> Expenses ->
// Settlements -> Totals flow. Hardcoded data, no timers touching real app
// state, no API calls. aria-hidden below keeps it out of the accessibility
// tree so it can never collide with e2e getByRole locators.
const TreasuryDemo: React.FC = () => {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [stepIndex, setStepIndex] = useState(0);
  const step = prefersReducedMotion
    ? REDUCED_MOTION_STEP
    : STEP_SEQUENCE[stepIndex];

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setStepIndex((current) => (current + 1) % STEP_SEQUENCE.length);
    }, STEP_DURATIONS[STEP_SEQUENCE[stepIndex]]);

    return () => clearTimeout(timer);
  }, [stepIndex, prefersReducedMotion]);

  const activeTab = useMemo(() => ACTIVE_TAB_BY_STEP[step], [step]);
  // Matches MainApp: Expenses/Settlements are locked until a group is
  // selected. "groups" (nothing selected yet) is the only step where that's
  // still true — every later step in the loop has "Roomies" selected.
  const hasGroupSelected = step !== "groups";

  return (
    <Box
      aria-hidden="true"
      sx={{
        width: "100%",
        maxWidth: 360,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        color: "text.primary",
        boxShadow: 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 0.75,
          bgcolor: "primary.main",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "common.white", fontWeight: 700, whiteSpace: "nowrap", mr: 0.5 }}
        >
          Treasury
        </Typography>
        <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}>
          {TABS.map(({ label, Icon, requiresGroup }, index) => {
            const locked = requiresGroup && !hasGroupSelected;
            const selected = index === activeTab;
            return (
              <Box
                key={label}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.35,
                  px: 0.6,
                  py: 0.3,
                  borderRadius: 2,
                  bgcolor: selected ? "rgba(255,255,255,0.18)" : "transparent",
                  color: locked
                    ? "rgba(255,255,255,0.4)"
                    : selected
                      ? "common.white"
                      : "rgba(255,255,255,0.8)",
                  fontWeight: selected ? 600 : 400,
                  transition: "color 0.3s ease, background-color 0.3s ease",
                }}
              >
                {/* Lock and section icon crossfade in place rather than
                    swapping instantly, so choosing a group visibly "unlocks"
                    Expenses/Settlements instead of just flipping state. */}
                <Box sx={{ position: "relative", width: 13, height: 13, flexShrink: 0 }}>
                  <LockOutlinedIcon
                    sx={{
                      position: "absolute",
                      inset: 0,
                      fontSize: 13,
                      opacity: locked ? 1 : 0,
                      transition: "opacity 0.5s ease",
                    }}
                  />
                  <Icon
                    sx={{
                      position: "absolute",
                      inset: 0,
                      fontSize: 13,
                      opacity: locked ? 0 : 1,
                      transition: "opacity 0.5s ease",
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ fontSize: "0.6rem", fontWeight: "inherit", lineHeight: 1 }}>
                  {label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.25,
          // Fixed, not min-height: a min-height still lets content grow past
          // it, reflowing the whole page height every loop and shifting/
          // flickering everything below it (including the login card) as the
          // browser's scrollbar appears and disappears. See HOMEPAGE_DEMO_PLAN.md
          // Revision 3/4/5 for how this number and the content that drives it
          // were tuned down together.
          height: PREVIEW_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Keyed by tab, not by every sub-step: this crossfades when the
            demo switches screens (Groups -> Expenses -> Settlements ->
            Totals) without remounting mid-screen, which would cut off the
            Collapse/Grow entrance animations for the add-expense form and
            the new-expense row inside ExpensesScreen. */}
        <Fade key={activeTab} in appear timeout={400}>
          <div>{renderScreen(step)}</div>
        </Fade>
      </Box>

    </Box>
  );
};

export default TreasuryDemo;
