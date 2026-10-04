// Local UI harness only; the production entrypoint still uses Clerk.
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "../../src/react-app/App";
import "../../src/react-app/index.css";
import { setAccessTokenProvider } from "../../src/react-app/api/client";
import { createQueryClient } from "../../src/react-app/api/queries";

setAccessTokenProvider(async () => "fictional-local-preview");
createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={createQueryClient()}>
		<App />
	</QueryClientProvider>,
);
