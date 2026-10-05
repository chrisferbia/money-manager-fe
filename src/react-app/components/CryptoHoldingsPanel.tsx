import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
import type { Account, CryptoCoin, CryptoHolding, CryptoPriceRefresh } from "../types";
import { errorMessage } from "../utils/errors";

const idr = new Intl.NumberFormat("id-ID", {
	style: "currency",
	currency: "IDR",
	maximumFractionDigits: 0,
});

function priceLabel(holding: CryptoHolding) {
	if (holding.price_idr === null) return "Price unavailable";
	return `Rp ${new Intl.NumberFormat("id-ID", {
		maximumFractionDigits: 8,
	}).format(Number(holding.price_idr))}`;
}

type Props = {
	readOnly?: boolean;
	account: Account;
	onHoldingsChange: () => Promise<void>;
};

export function CryptoHoldingsPanel({ account, onHoldingsChange, readOnly = false }: Props) {
	const client = useQueryClient();
	const [refreshingPrices, setRefreshingPrices] = useState(false);
	const refreshRunning = useRef(false);
	const holdings = useQuery({
		queryKey: ["crypto-holdings", account.id],
		queryFn: ({ signal }) =>
			request<CryptoHolding[]>(`/accounts/${account.id}/holdings`, { signal }),
		refetchInterval: refreshingPrices ? false : 60_000,
	});
	const [search, setSearch] = useState("");
	const [results, setResults] = useState<CryptoCoin[]>([]);
	const [selected, setSelected] = useState<CryptoCoin | null>(null);
	const [quantity, setQuantity] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editingQuantity, setEditingQuantity] = useState("");
	const [searching, setSearching] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const busy = saving || refreshingPrices;

	async function refreshMarketPrices() {
		if (readOnly || refreshRunning.current || saving || !holdings.data?.length) return;
		refreshRunning.current = true;
		setRefreshingPrices(true);
		setError("");
		setNotice("");
		try {
			const result = await request<CryptoPriceRefresh>(
				`/accounts/${account.id}/holdings/refresh-prices`,
				{ method: "POST" },
			);
			client.setQueryData(["crypto-holdings", account.id], result.holdings);
			await onHoldingsChange();
			if (result.failed_coin_ids.length) {
				const names = result.failed_coin_ids.map(
					(coinId) =>
						result.holdings.find((holding) => holding.coin_id === coinId)?.symbol ??
						coinId,
				);
				setError(
					`Refreshed ${result.refreshed_count} of ${result.requested_count} prices. Could not refresh ${names.join(", ")}; last known prices were kept.`,
				);
			} else {
				setNotice("Latest available prices fetched. Account value updated.");
			}
		} catch (reason) {
			setError(
				errorMessage(
					reason,
					"Could not refresh crypto prices. Last known prices were kept.",
				),
			);
		} finally {
			refreshRunning.current = false;
			setRefreshingPrices(false);
		}
	}

	async function refresh() {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["crypto-holdings", account.id] }),
			onHoldingsChange(),
		]);
	}

	async function runSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (search.trim().length < 2) return;
		setSearching(true);
		setError("");
		setSelected(null);
		setResults([]);
		try {
			const coins = await request<CryptoCoin[]>(
				`/crypto/search?q=${encodeURIComponent(search.trim())}`,
			);
			setResults(coins);
		} catch (reason) {
			setError(errorMessage(reason, "Could not search for coins."));
		} finally {
			setSearching(false);
		}
	}

	async function addHolding(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selected) return;
		setSaving(true);
		setError("");
		setNotice("");
		try {
			await request<CryptoHolding>(`/accounts/${account.id}/holdings`, {
				method: "POST",
				body: JSON.stringify({ ...selected, quantity }),
			});
			setSelected(null);
			setResults([]);
			setSearch("");
			setQuantity("");
			setNotice("Holding added.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not add holding."));
		} finally {
			setSaving(false);
		}
	}

	async function updateHolding(event: FormEvent<HTMLFormElement>, holding: CryptoHolding) {
		event.preventDefault();
		setSaving(true);
		setError("");
		try {
			await request<CryptoHolding>(`/accounts/${account.id}/holdings/${holding.id}`, {
				method: "PATCH",
				body: JSON.stringify({ quantity: editingQuantity }),
			});
			setEditingId(null);
			setNotice("Quantity updated.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not update holding."));
		} finally {
			setSaving(false);
		}
	}

	async function removeHolding(holding: CryptoHolding) {
		if (!window.confirm(`Remove ${holding.name} from ${account.name}?`)) return;
		setSaving(true);
		setError("");
		try {
			await request<void>(`/accounts/${account.id}/holdings/${holding.id}`, {
				method: "DELETE",
			});
			setNotice("Holding removed.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not remove holding."));
		} finally {
			setSaving(false);
		}
	}

	return (
		<section
			className="panel crypto-panel"
			id="crypto-holdings-panel"
			aria-label={`${account.name} crypto holdings`}
		>
			<div className="panel-heading">
				<div>
					<p className="eyebrow">CRYPTO HOLDINGS</p>
					<h3>{account.name}</h3>
					<p className="muted">Market value in IDR · no cash balance</p>
				</div>
				<div className="crypto-panel-summary">
					<strong className="crypto-panel-total">
						{account.balance === null
							? "Price unavailable"
							: idr.format(account.balance ?? 0)}
					</strong>
					{!readOnly && (
						<button
							type="button"
							className="cancel-button crypto-refresh-button"
							disabled={busy || holdings.isFetching || !holdings.data?.length}
							onClick={() => void refreshMarketPrices()}
						>
							{refreshingPrices ? "Refreshing prices…" : "Refresh prices"}
						</button>
					)}
				</div>
			</div>
			{error && (
				<p role="alert" className="api-error">
					{error}
				</p>
			)}
			{notice && (
				<p role="status" className="success-message">
					{notice}
				</p>
			)}
			{holdings.isLoading ? (
				<p className="muted">Loading holdings...</p>
			) : holdings.error ? (
				<p role="alert">{errorMessage(holdings.error, "Could not load holdings.")}</p>
			) : holdings.data?.length ? (
				<div className="crypto-holdings-grid">
					{holdings.data.map((holding) => (
						<article key={holding.id} className="crypto-holding-card">
							<div className="crypto-holding-heading">
								<div>
									<strong>{holding.name}</strong>
									<span>{holding.symbol}</span>
								</div>
								<strong>
									{holding.value_idr === null
										? "Unavailable"
										: idr.format(holding.value_idr)}
								</strong>
							</div>
							<p>
								{holding.quantity} {holding.symbol} · {priceLabel(holding)} per coin
							</p>
							<p className="muted">
								{holding.price_status === "unavailable"
									? "Market price unavailable"
									: `${holding.price_status === "stale" ? "Stale price, fetched" : "Price fetched"} ${holding.fetched_at ? new Date(holding.fetched_at).toLocaleString("id-ID") : ""}`}
							</p>
							{!readOnly && editingId === holding.id ? (
								<form
									className="crypto-inline-form"
									onSubmit={(event) => updateHolding(event, holding)}
								>
									<label>
										Quantity
										<input
											aria-label={`Quantity for ${holding.name}`}
											required
											inputMode="decimal"
											value={editingQuantity}
											onChange={(event) =>
												setEditingQuantity(event.target.value)
											}
										/>
									</label>
									<button type="submit" className="submit-button" disabled={busy}>
										Save quantity
									</button>
									<button
										type="button"
										className="cancel-button"
										onClick={() => setEditingId(null)}
									>
										Cancel
									</button>
								</form>
							) : !readOnly ? (
								<div className="crypto-holding-actions">
									<button
										type="button"
										className="crypto-edit-button"
										disabled={busy}
										onClick={() => {
											setEditingId(holding.id);
											setEditingQuantity(holding.quantity);
										}}
									>
										Edit quantity
									</button>
									<button
										type="button"
										className="crypto-remove-button"
										disabled={busy}
										onClick={() => void removeHolding(holding)}
									>
										Remove
									</button>
								</div>
							) : null}
						</article>
					))}
				</div>
			) : (
				<p className="empty-copy">
					{readOnly
						? "No crypto holdings in this demo account."
						: "No crypto added yet. Search for a coin below to start."}
				</p>
			)}
			{!readOnly && (
				<div className="crypto-add-area">
					<h4>Add a holding</h4>
					<form className="crypto-search-form" onSubmit={runSearch}>
						<label>
							Search cryptocurrency
							<input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setSelected(null);
									setResults([]);
								}}
								placeholder="Bitcoin or BTC"
								minLength={2}
								required
							/>
						</label>
						<button type="submit" className="cancel-button" disabled={searching}>
							{searching ? "Searching..." : "Search"}
						</button>
					</form>
					{results.length > 0 && (
						<div className="crypto-search-results" aria-label="Coin search results">
							{results.map((coin) => (
								<button
									key={coin.coin_id}
									type="button"
									aria-pressed={selected?.coin_id === coin.coin_id}
									onClick={() => setSelected(coin)}
								>
									{coin.name} <span>{coin.symbol}</span>
								</button>
							))}
						</div>
					)}
					{selected && (
						<form className="crypto-add-form" onSubmit={addHolding}>
							<p>
								Adding{" "}
								<strong>
									{selected.name} ({selected.symbol})
								</strong>
							</p>
							<label>
								Quantity owned
								<input
									value={quantity}
									onChange={(event) => setQuantity(event.target.value)}
									placeholder="0.025"
									inputMode="decimal"
									required
								/>
							</label>
							<button className="submit-button" type="submit" disabled={busy}>
								{saving ? "Adding..." : "Add holding"}
							</button>
						</form>
					)}
				</div>
			)}
			<p className="crypto-footnote">
				Adding holdings does not deduct money from another account. Keep those balances
				updated separately to avoid overstating your overall total.
			</p>
		</section>
	);
}
