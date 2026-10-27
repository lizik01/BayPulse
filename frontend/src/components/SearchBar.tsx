import { useEffect, useState, type FormEvent } from "react";

interface Props {
  value: string;
  onSearch: (keyword: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onSearch, placeholder = "Search events, artists, teams…" }: Props) {
  const [text, setText] = useState(value);

  // Keep in sync when the URL changes (back/forward navigation).
  useEffect(() => setText(value), [value]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <input
        type="search"
        className="input search-bar__input"
        placeholder={placeholder}
        aria-label="Search keyword"
        value={text}
        maxLength={100}
        onChange={(e) => {
          setText(e.target.value);
          // Clearing the box (e.g. the native ✕) resets the search immediately.
          if (e.target.value === "" && value !== "") onSearch("");
        }}
      />
      <button type="submit" className="btn btn--primary">
        Search
      </button>
    </form>
  );
}
