// Shared design tokens so every screen uses the same colours and spacing.
export const colors = {
  primary: "#164E43",
  secondary: "#26715F",
  teal: "#4C9681",
  amber: "#F2B84B",
  coral: "#F18462",
  background: "#F7F8F4",
  mint: "#EDFDF3",
  white: "#FFFFFF",
  textPrimary: "#1F2D28",
  textSecondary: "#5A6B64",
  textMuted: "#8A968F",
  border: "#E4E9E1",
  divider: "#EFF2ED",
  success: "#26715F",
  successSoft: "#EDFDF3",
  error: "#B14B2F",
  errorSoft: "#FDEEE9",
  info: "#235C8A",
  infoSoft: "#EAF3FB",
  warning: "#8A5B00",
  warningSoft: "#FDF3DD",
  disabled: "#9BB5AC"
};

// 8-point spacing system.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999
};

export const shadows = {
  card: {
    shadowColor: "#102A22",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2
  },
  floating: {
    shadowColor: "#102A22",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6
  }
};
