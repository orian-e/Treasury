import React from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Keep this wording free of "description", "name", "amount", "email" and
  // "code" -- existing unit and e2e tests query form fields with broad
  // regexes like getByLabelText(/description/i) and would match this too.
  ariaLabel: string;
}

const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
}) => (
  <TextField
    className="search-field"
    size="small"
    fullWidth
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Escape") onChange("");
    }}
    inputProps={{ "aria-label": ariaLabel, dir: "auto" }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon fontSize="small" color="action" />
        </InputAdornment>
      ),
      // Always rendered, so the input does not resize when the clear button
      // appears on the first keystroke and disappears again on clear.
      endAdornment: (
        <InputAdornment position="end" className="search-field__clear-slot">
          {value && (
            <IconButton
              size="small"
              aria-label="Clear search"
              onClick={() => onChange("")}
              edge="end"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </InputAdornment>
      ),
    }}
  />
);

export default SearchField;
