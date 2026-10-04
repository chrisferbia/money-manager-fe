import { useRef, useState, type FormEvent } from "react";
import { request } from "../api/client";
import type { EmailPreview } from "../types";
import { errorMessage } from "../utils/errors";

const MAX_EMAIL_BYTES = 1024 * 1024;
const idr = new Intl.NumberFormat("id-ID", {
	style: "currency",
	currency: "IDR",
	maximumFractionDigits: 0,
});

export function EmailFormatTester() {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<EmailPreview | null>(null);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const running = useRef(false);

	async function testEmail(body: BodyInit | (() => Promise<BodyInit>)) {
		if (running.current) return;
		running.current = true;
		setBusy(true);
		setError("");
		setPreview(null);
		try {
			setPreview(
				await request<EmailPreview>("/email-tools/bca/preview", {
					method: "POST",
					headers: { "Content-Type": "message/rfc822" },
					body: typeof body === "function" ? await body() : body,
				}),
			);
		} catch (reason) {
			setError(errorMessage(reason, "Could not test this BCA email."));
		} finally {
			running.current = false;
			setBusy(false);
		}
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!file) return;
		if (
			!file.size ||
			file.size > MAX_EMAIL_BYTES ||
			!file.name.toLowerCase().endsWith(".eml")
		) {
			setPreview(null);
			setError("Choose a non-empty .eml file of 1 MB or less.");
			return;
		}
		void testEmail(file);
	}

	function trySample() {
		void testEmail(async () => {
			const response = await fetch("/samples/bca-fictional.eml");
			if (!response.ok) throw new Error("Could not load the sample notification.");
			return response.arrayBuffer();
		});
	}

	const parsed = preview?.parsed;
	return (
		<section
			className="panel email-tester"
			aria-labelledby="email-tester-title"
			aria-busy={busy}
		>
			<div className="panel-heading">
				<div>
					<p className="eyebrow">TESTING TOOLS</p>
					<h3 id="email-tester-title">Email format tester</h3>
				</div>
				<span className="email-test-badge">Preview only</span>
			</div>
			<p className="muted">
				Test a BCA notification using the same parser as automatic email imports. Nothing is
				saved and your balances stay unchanged.
			</p>
			<form className="email-test-form" onSubmit={submit}>
				<label>
					BCA email file (.eml)
					<input
						type="file"
						accept=".eml,message/rfc822"
						disabled={busy}
						onChange={(event) => {
							setFile(event.target.files?.[0] ?? null);
							setPreview(null);
							setError("");
						}}
					/>
				</label>
				<button className="submit-button" type="submit" disabled={busy || !file}>
					{busy ? "Testing…" : "Test email format"}
				</button>
			</form>
			<div className="email-test-help">
				<p>In Gmail: More (⋮) → Download message. Choose the .eml file (up to 1 MB).</p>
				<button
					className="email-test-sample"
					type="button"
					disabled={busy}
					onClick={trySample}
				>
					Try a fictional sample
				</button>
			</div>
			<p className="email-test-note">
				The file is sent to the backend for parsing, but neither the email nor its results
				are stored. This tests the format, not email delivery, account setup, or
				authenticity. Automatic email imports continue separately.
			</p>
			{error && (
				<p role="alert" className="form-error">
					{error}
				</p>
			)}
			{preview && parsed && (
				<div className="email-test-result">
					<p role="status" className="success-message">
						Email parsed. Nothing was saved.
					</p>
					<h4>Parsed result</h4>
					<dl className="email-test-fields">
						{[
							["Format checks", preview.format_valid ? "Passed" : "Needs attention"],
							[
								"Amount (IDR)",
								parsed.amount === null ? "Not found" : idr.format(parsed.amount),
							],
							[
								"Transaction date (Asia/Jakarta)",
								parsed.occurred_at
									? new Date(parsed.occurred_at).toLocaleString("en-GB", {
											timeZone: "Asia/Jakarta",
										}) + " WIB"
									: "Not found",
							],
							[
								"Transaction type",
								parsed.direction === "expense"
									? "Expense"
									: parsed.direction === "income"
										? "Income"
										: "Not found",
							],
							["Transaction subtype", parsed.transaction_subtype],
							["Merchant / counterparty", parsed.counterparty],
							["Description", parsed.description],
							["Reference number", parsed.reference_number],
							["Status", parsed.status],
							["Default automatic category", preview.default_category],
							["Sender", parsed.sender],
							["Subject", parsed.subject],
							["Message-ID", parsed.message_id],
						].map(([label, value]) => (
							<div key={label}>
								<dt>{label}</dt>
								<dd>{value || "Not found"}</dd>
							</div>
						))}
					</dl>
					{preview.warnings.length > 0 && (
						<div className="email-test-warnings" role="alert">
							<h4>Warnings</h4>
							<ul>
								{preview.warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
