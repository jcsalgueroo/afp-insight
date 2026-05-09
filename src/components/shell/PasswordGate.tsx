import { useState, useEffect } from "react";

const PASSWORD = "BismarckInColombia!";
const STORAGE_KEY = "afp-unlocked";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true);
    } catch {
      // ignore
    }
  }, []);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-card border border-border rounded-md shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary" />
          <h1 className="text-sm font-semibold uppercase tracking-tight">
            AFP Portfolio Intelligence
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the access password to continue.
        </p>
        <div>
          <label htmlFor="pw" className="sr-only">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(false);
            }}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Password"
          />
          {error && (
            <p className="mt-2 text-xs text-negative">Incorrect password.</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}