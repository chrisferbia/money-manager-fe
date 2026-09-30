import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AuthGate } from "./components/AuthGate.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./api/queries";

const queryClient = createQueryClient();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthGate queryClient={queryClient} />
		</QueryClientProvider>
	</StrictMode>,
);
