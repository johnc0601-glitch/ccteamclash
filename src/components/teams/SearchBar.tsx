import styles from './TeamManagement.module.css';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChange,
  label = 'Search teams',
  placeholder = 'Search teams',
}: SearchBarProps) {
  return (
    <label className={styles.searchBar}>
      <span className={styles.srOnly}>{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
