// Isolated preview: fictional responses only, no server or database calls.
import { createRoot } from "react-dom/client";
import { ReceivablesReport } from "../../src/react-app/components/ReceivablesReport";
import { setDemoMode } from "../../src/react-app/api/client";
import "../../src/react-app/index.css";
import "../../src/react-app/App.css";
setDemoMode(true);
window.fetch = async (input) => {
	const url = String(input);
	if (url === "/runtime-config.json")
		return Response.json({ apiBaseUrl: "https://fictional.example" });
	if (url === "https://fictional.example/demo/reports/receivables?account_id=1")
		return Response.json({
			account_id: 1,
			items: [
				{
					description: "Andi",
					lent: 1000000,
					repaid: 400000,
					outstanding: 600000,
					transaction_count: 2,
				},
				{
					description: "Budi",
					lent: 500000,
					repaid: 500000,
					outstanding: 0,
					transaction_count: 2,
				},
				{
					description: null,
					lent: 200000,
					repaid: 0,
					outstanding: 200000,
					transaction_count: 1,
				},
				{
					description: "Credit",
					lent: 100000,
					repaid: 150000,
					outstanding: -50000,
					transaction_count: 2,
				},
			],
		});
	if (url === "https://fictional.example/demo/reports/receivables?account_id=2")
		return Response.json({ account_id: 2, items: [] });
	throw new Error("No real network requests are allowed in this preview.");
};
createRoot(document.getElementById("root")!).render(
	<main className="app-shell">
		<h2>Reports</h2>
		<ReceivablesReport
			accounts={[
				{ id: 1, name: "Receivables", type: "cash", sequence: 1, created_at: "" },
				{ id: 2, name: "Empty account", type: "cash", sequence: 2, created_at: "" },
			]}
			money={(amount) => `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`}
		/>
	</main>,
);
