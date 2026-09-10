import type { Dispatch, SetStateAction } from "react";

export type ActionFeedback = {
	setError: (message: string) => void;
	setNotice: (message: string) => void;
	setSaving: Dispatch<SetStateAction<boolean>>;
};
