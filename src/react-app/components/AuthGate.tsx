import { ClerkProvider, SignIn, UserButton, useAuth } from "@clerk/react";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import App from "../App";
import { request, setAccessTokenProvider } from "../api/client";

type RuntimeConfig = { clerkPublishableKey?: unknown; detail?: string };

function WorkspaceApp({ queryClient }: { queryClient: QueryClient }) {
	const { isLoaded, isSignedIn, userId, getToken } = useAuth();
	const [readyUser, setReadyUser] = useState<string | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		queryClient.clear();
		if (!isLoaded || !isSignedIn || !userId) {
			setAccessTokenProvider(null);
			return;
		}
		setAccessTokenProvider(() => getToken());
		request<{ workspace_id: number }>("/me/bootstrap", { method: "POST" })
			.then(() => {
				if (!cancelled) setReadyUser(userId);
			})
			.catch((cause: unknown) => {
				if (!cancelled)
					setError(
						cause instanceof Error ? cause.message : "Could not set up your workspace.",
					);
			});
		return () => {
			cancelled = true;
		};
	}, [getToken, isLoaded, isSignedIn, queryClient, userId]);

	if (!isLoaded) return <div className="auth-screen">Checking your session…</div>;
	if (!isSignedIn) {
		return (
			<div className="auth-screen">
				<div className="auth-intro">
					<p className="eyebrow">PERSONAL FINANCE</p>
					<h1>Money manager</h1>
					<p>Sign in to see your own accounts, transactions, and savings.</p>
				</div>
				<SignIn />
			</div>
		);
	}
	if (error) {
		return (
			<div className="auth-screen" role="alert">
				<p>{error}</p>
				<button type="button" onClick={() => window.location.reload()}>
					Try again
				</button>
			</div>
		);
	}
	if (readyUser !== userId) return <div className="auth-screen">Opening your workspace…</div>;
	return <App accountControl={<UserButton />} />;
}

function SignedInApp({ queryClient }: { queryClient: QueryClient }) {
	const { userId } = useAuth();
	return <WorkspaceApp key={userId ?? "signed-out"} queryClient={queryClient} />;
}

export function AuthGate({ queryClient }: { queryClient: QueryClient }) {
	const [publishableKey, setPublishableKey] = useState<string | null>(
		() => import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null,
	);
	const [error, setError] = useState("");

	useEffect(() => {
		if (publishableKey) return;
		fetch("/runtime-config.json", { cache: "no-store" })
			.then(async (response) => {
				const config = (await response.json()) as RuntimeConfig;
				if (!response.ok)
					throw new Error(config.detail || "Runtime configuration unavailable.");
				if (typeof config.clerkPublishableKey !== "string" || !config.clerkPublishableKey)
					throw new Error("Sign-in is not configured for this deployment.");
				setPublishableKey(config.clerkPublishableKey);
			})
			.catch((cause: unknown) =>
				setError(
					cause instanceof Error ? cause.message : "Sign-in configuration unavailable.",
				),
			);
	}, [publishableKey]);

	if (error)
		return (
			<div className="auth-screen" role="alert">
				{error}
			</div>
		);
	if (!publishableKey) return <div className="auth-screen">Loading sign-in…</div>;
	return (
		<ClerkProvider publishableKey={publishableKey}>
			<SignedInApp queryClient={queryClient} />
		</ClerkProvider>
	);
}
