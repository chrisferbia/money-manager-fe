import type { ReactNode } from "react";
import type { View } from "../types";

const navigation: Array<{ id: View; label: string }> = [
	{ id: "dashboard", label: "Overview" },
	{ id: "transactions", label: "Transactions" },
	{ id: "accounts", label: "Accounts" },
	{ id: "reports", label: "Reports" },
	{ id: "settings", label: "Settings" },
];

type AppShellProps = {
	view: View;
	error: string;
	notice: string;
	loading: boolean;
	initialLoading: boolean;
	onViewChange: (view: View) => void;
	onDismissError: () => void;
	children: ReactNode;
};

export function AppShell({
	view,
	error,
	notice,
	loading,
	initialLoading,
	onViewChange,
	onDismissError,
	children,
}: AppShellProps) {
	return (
		<div className="app-shell">
			<header className="topbar">
				<div className="brand-mark">$</div>
				<div>
					<p className="eyebrow">PERSONAL FINANCE</p>
					<h1>Money manager</h1>
				</div>
				<span className="local-badge">Connected to API</span>
			</header>
			<nav className="main-nav" aria-label="Main navigation">
				{navigation.map((item) => (
					<button
						key={item.id}
						className={view === item.id ? "selected" : ""}
						onClick={() => onViewChange(item.id)}
					>
						{item.label}
					</button>
				))}
			</nav>
			<main aria-busy={loading}>
				{error && (
					<div className="api-error" role="alert">
						<strong>Action failed</strong>
						<span>{error}</span>
						<button onClick={onDismissError}>Dismiss</button>
					</div>
				)}
				{notice && (
					<div className="success-message" role="status">
						{notice}
					</div>
				)}
				{initialLoading ? (
					<div className="loading-state" role="status" aria-live="polite">
						<span className="loading-spinner" aria-hidden="true" />
						<div>
							<strong>Loading your ledger</strong>
							<span>Fetching accounts, transactions, and reports...</span>
						</div>
					</div>
				) : (
					<>
						{loading && (
							<div className="loading-bar" role="status" aria-live="polite">
								<span className="loading-spinner" aria-hidden="true" />
								<span>Refreshing data...</span>
							</div>
						)}
						{children}
					</>
				)}
			</main>
			<footer>Data is managed by your Money Manager backend.</footer>
		</div>
	);
}
