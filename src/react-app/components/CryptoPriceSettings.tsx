import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
import type { CryptoPriceSettings as PriceSettings } from "../types";
import { errorMessage } from "../utils/errors";

const settingsKey = ["crypto-price-settings"];

export function CryptoPriceSettings() {
	const client = useQueryClient();
	const settings = useQuery({
		queryKey: settingsKey,
		queryFn: ({ signal }) => request<PriceSettings>("/settings/crypto-prices", { signal }),
	});
	const [draft, setDraft] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const running = useRef(false);
	const [notice, setNotice] = useState("");
	const [error, setError] = useState("");
	const value = draft ?? String(settings.data?.expiry_minutes ?? 10);
	const minutes = Number(value);
	const valid =
		value.trim() !== "" && Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!valid || running.current || settings.isLoading || settings.error) return;
		running.current = true;
		setSaving(true);
		setError("");
		setNotice("");
		try {
			const updated = await request<PriceSettings>("/settings/crypto-prices", {
				method: "PATCH",
				body: JSON.stringify({ expiry_minutes: minutes }),
			});
			client.setQueryData(settingsKey, updated);
			setDraft(null);
			setNotice(
				`Crypto price expiry saved: ${updated.expiry_minutes} minute${updated.expiry_minutes === 1 ? "" : "s"}.`,
			);
			await Promise.all([
				client.invalidateQueries({ queryKey: ["accounts"] }),
				client.invalidateQueries({ queryKey: ["crypto-holdings"] }),
			]);
		} catch (reason) {
			setError(errorMessage(reason, "Could not save crypto price expiry."));
		} finally {
			running.current = false;
			setSaving(false);
		}
	}

	return (
		<section
			className="panel crypto-price-settings"
			aria-labelledby="crypto-price-settings-title"
		>
			<p className="eyebrow">MARKET PRICES</p>
			<h3 id="crypto-price-settings-title">Crypto price expiry</h3>
			<p className="muted">
				Choose how long cached crypto prices remain fresh. This setting is saved for your
				account across devices.
			</p>
			{settings.isLoading ? (
				<p role="status">Loading price settings…</p>
			) : settings.error ? (
				<div role="alert">
					<p>{errorMessage(settings.error, "Could not load crypto price settings.")}</p>
					<button
						className="cancel-button"
						type="button"
						onClick={() => void settings.refetch()}
					>
						Try again
					</button>
				</div>
			) : (
				<form className="crypto-expiry-form" onSubmit={save}>
					<div className="crypto-expiry-controls">
						<label>
							Price expires after (minutes)
							<input
								type="number"
								min="1"
								max="1440"
								step="1"
								required
								value={value}
								disabled={saving}
								onChange={(event) => {
									setDraft(event.target.value);
									setNotice("");
									setError("");
								}}
							/>
						</label>
						<button
							className="submit-button"
							disabled={saving || !valid || minutes === settings.data?.expiry_minutes}
							type="submit"
						>
							{saving ? "Saving…" : "Save price expiry"}
						</button>
					</div>
					<p className="field-help">1–1440 minutes · Default: 10 minutes</p>
				</form>
			)}
			<p className="crypto-expiry-note">
				Expired prices refresh when crypto data is requested; this is not a background
				schedule. Use “Refresh prices” in a crypto account to fetch now, even before expiry.
			</p>
			{error && (
				<p role="alert" className="form-error">
					{error}
				</p>
			)}
			{notice && (
				<p role="status" className="success-message">
					{notice}
				</p>
			)}
		</section>
	);
}
