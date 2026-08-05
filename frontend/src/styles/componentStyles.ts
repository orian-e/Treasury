import { SxProps, Theme } from '@mui/material';

export const cardContainerStyles: SxProps<Theme> = {
  width: '100%',
  maxWidth: 800,
  margin: { xs: '10px auto', sm: '20px auto' },
  padding: { xs: 2, sm: 3 },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 2,
  boxSizing: 'border-box',
  bgcolor: 'background.paper',
  '&:hover': {
    boxShadow: 4,
  },
};

export const formContainerStyles: SxProps<Theme> = {
  ...cardContainerStyles,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  overflow: 'hidden',
};

export const listContainerStyles: SxProps<Theme> = {
  ...cardContainerStyles,
  '& .MuiList-root': {
    padding: 0,
  },
};
