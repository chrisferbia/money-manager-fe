import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { descriptionSuggestionsQuery } from "../api/queries";

export function DescriptionAutocomplete({
	value,
	onChange,
	formOpen,
}: {
	value: string;
	onChange: (value: string) => void;
	formOpen: boolean;
}) {
	const id = useId();
	const [focused, setFocused] = useState(false);
	const [dismissed, setDismissed] = useState(false);
	const [search, setSearch] = useState(value.trim());
	const [active, setActive] = useState(-1);
	const listRef = useRef<HTMLUListElement>(null);
	const trimmed = value.trim();
	useEffect(() => {
		if (!formOpen || !focused) return;
		const timer = window.setTimeout(() => setSearch(trimmed), 250);
		return () => window.clearTimeout(timer);
	}, [trimmed, formOpen, focused]);
	const enabled = formOpen && focused && !dismissed;
	const query = useQuery({
		...descriptionSuggestionsQuery(search),
		enabled: enabled && search === trimmed,
	});
	const suggestions = enabled && search === trimmed && !query.isError ? (query.data ?? []) : [];
	const expanded = suggestions.length > 0;
	const selected = expanded && active >= 0 && active < suggestions.length ? active : -1;
	useEffect(() => {
		if (selected >= 0)
			listRef.current?.children[selected]?.scrollIntoView({ block: "nearest" });
	}, [selected]);
	const choose = (description: string) => {
		onChange(description);
		setDismissed(true);
		setActive(-1);
	};
	return (
		<div className="description-autocomplete">
			<label htmlFor={id}>
				Description <span className="optional">(optional)</span>
			</label>
			<input
				id={id}
				role="combobox"
				aria-autocomplete="list"
				aria-expanded={expanded}
				aria-controls={expanded ? `${id}-list` : undefined}
				aria-activedescendant={selected >= 0 ? `${id}-option-${selected}` : undefined}
				autoComplete="off"
				value={value}
				placeholder="What was this for?"
				onFocus={() => {
					setFocused(true);
					setDismissed(false);
					setActive(-1);
					setSearch(trimmed);
				}}
				onBlur={() => {
					setFocused(false);
					setActive(-1);
				}}
				onChange={(event) => {
					onChange(event.target.value);
					setDismissed(false);
					setActive(-1);
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape" && !dismissed) {
						event.preventDefault();
						event.stopPropagation();
						setDismissed(true);
						setActive(-1);
					} else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && expanded) {
						event.preventDefault();
						setActive(
							event.key === "ArrowDown"
								? (selected + 1) % suggestions.length
								: (selected <= 0 ? suggestions.length : selected) - 1,
						);
					} else if (event.key === "Enter" && selected >= 0) {
						event.preventDefault();
						choose(suggestions[selected]);
					} else if (event.key === "Tab") {
						setDismissed(true);
						setActive(-1);
					}
				}}
			/>
			{enabled && (search !== trimmed || query.isFetching) && (
				<span className="description-loading" role="status">
					Finding suggestions…
				</span>
			)}
			{expanded && (
				<ul
					ref={listRef}
					id={`${id}-list`}
					role="listbox"
					aria-label="Description suggestions"
					className="description-suggestions"
				>
					{suggestions.map((description, index) => (
						<li
							key={description}
							id={`${id}-option-${index}`}
							role="option"
							aria-selected={selected === index}
							onPointerDown={(event) => event.preventDefault()}
							onClick={() => choose(description)}
						>
							{description}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
