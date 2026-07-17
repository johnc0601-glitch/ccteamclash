import styles from './TeamManagement.module.css';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({value, onChange}: SearchBarProps) {
  return (
    <label className={styles.searchBar}>
      <span className={styles.srOnly}>Search teams</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search teams"
      />
    </label>
  );
}
