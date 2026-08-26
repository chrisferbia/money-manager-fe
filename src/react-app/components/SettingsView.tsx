import {
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type FormEvent,
	type SetStateAction,
} from "react";
import type { Category, CategoryDraft, DisplayCurrency } from "../types";
import { categoryNameMaxLength } from "../utils/constants";

type SettingsViewProps = {
	categories: Category[];
	draft: CategoryDraft;
	setDraft: Dispatch<SetStateAction<CategoryDraft>>;
	editing: Category | null;
	setEditing: Dispatch<SetStateAction<Category | null>>;
	saving: boolean;
	deletingId: number | null;
	onSaveCategory: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
	onDeleteCategory: (category: Category) => void;
	currency: DisplayCurrency;
	onCurrencyChange: (value: DisplayCurrency) => void;
};

export function SettingsView({
	categories,
	draft,
	setDraft,
	editing,
	setEditing,
	saving,
	deletingId,
	onSaveCategory,
	onDeleteCategory,
	currency,
	onCurrencyChange,
}: SettingsViewProps) {
	const [formOpen, setFormOpen] = useState(false);
	const [expandedGroups, setExpandedGroups] = useState({ expense: false, income: false });
	const dialogRef = useRef<HTMLDialogElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const addButtonRef = useRef<HTMLButtonElement>(null);
	const returnFocusRef = useRef<HTMLButtonElement | null>(null);
	const expenses = categories
		.filter((category) => category.type === "expense")
		.sort((left, right) =>
			left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
		);
	const income = categories
		.filter((category) => category.type === "income")
		.sort((left, right) =>
			left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
		);
	const visibleExpenses = expandedGroups.expense ? expenses : expenses.slice(0, 4);
	const visibleIncome = expandedGroups.income ? income : income.slice(0, 4);
	const resetForm = () => {
		setEditing(null);
		setDraft({ name: "", type: "expense" });
		setFormOpen(false);
	};
	const closeForm = () => {
		resetForm();
		window.requestAnimationFrame(() => returnFocusRef.current?.focus());
	};
	const openAddForm = () => {
		returnFocusRef.current = addButtonRef.current;
		setEditing(null);
		setDraft({ name: "", type: "expense" });
		setFormOpen(true);
	};
	const handleSave = async (event: FormEvent<HTMLFormElement>) => {
		if (await onSaveCategory(event)) closeForm();
	};
	const startEdit = (category: Category, trigger: HTMLButtonElement) => {
		returnFocusRef.current = trigger;
		setEditing(category);
		setDraft({ name: category.name, type: category.type });
		setFormOpen(true);
		setExpandedGroups((current) => ({ ...current, [category.type]: true }));
	};
	const toggleExpanded = (type: Category["type"]) => {
		setExpandedGroups((current) => ({ ...current, [type]: !current[type] }));
	};

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (formOpen && !dialog.open) dialog.showModal();
		if (!formOpen && dialog.open) dialog.close();
		if (formOpen) nameInputRef.current?.focus();
	}, [formOpen]);

	return (
		<>
			<section className="page-heading">
				<div>
					<p className="eyebrow">CONFIGURATION</p>
					<h2>Settings</h2>
					<p className="muted">
						Adjust how Money Manager looks and organize your transaction labels.
					</p>
				</div>
			</section>
			<section className="preference-card panel">
				<div>
					<p className="eyebrow">PREFERENCES</p>
					<h3>Display currency</h3>
					<p className="muted">
						Choose how amounts are formatted throughout the app. This does not convert
						the stored value.
					</p>
				</div>
				<label>
					Currency
					<select
						value={currency}
						onChange={(event) =>
							onCurrencyChange(event.target.value as DisplayCurrency)
						}
					>
						<option value="IDR">IDR (Rp)</option>
						<option value="USD">USD ($)</option>
					</select>
				</label>
				<div className="setting-note">
					<strong>Stored as whole IDR units</strong>
					<span>
						For example, an amount of 1000 is IDR 1,000. USD mode changes the display
						symbol only.
					</span>
				</div>
			</section>
			<section className="settings-section">
				<div className="section-heading settings-heading category-section-heading">
					<div>
						<p className="eyebrow">TRANSACTION LABELS</p>
						<h3>Categories</h3>
						<p className="muted">
							{expenses.length} expense · {income.length} income categories.
						</p>
					</div>
					<button
						ref={addButtonRef}
						className="primary-button"
						type="button"
						onClick={openAddForm}
						aria-expanded={formOpen}
						aria-controls="category-form"
					>
						+ Add category
					</button>
				</div>
				<dialog
					ref={dialogRef}
					className="category-dialog"
					aria-labelledby="category-dialog-title"
					onCancel={(event) => {
						event.preventDefault();
						closeForm();
					}}
					onClick={(event) => {
						if (event.target === event.currentTarget) closeForm();
					}}
				>
					<section className="category-dialog-content" id="category-form">
						<div className="panel-heading">
							<div>
								<p className="eyebrow">
									{editing ? "EDIT CATEGORY" : "NEW CATEGORY"}
								</p>
								<h3 id="category-dialog-title">
									{editing ? "Update category" : "Add category"}
								</h3>
							</div>
							<button className="dialog-close" type="button" onClick={closeForm}>
								Close
							</button>
						</div>
						<form onSubmit={handleSave}>
							<label>
								Name
								<input
									ref={nameInputRef}
									value={draft.name}
									onChange={(event) =>
										setDraft({ ...draft, name: event.target.value })
									}
									placeholder="Groceries"
									required
									maxLength={categoryNameMaxLength}
									autoComplete="off"
								/>
							</label>
							{editing ? (
								<div className="category-edit-type">
									<span>Type</span>
									<strong>
										{editing.type === "expense" ? "Expense" : "Income"}
									</strong>
									<small>Category type cannot be changed after creation.</small>
								</div>
							) : (
								<label>
									Type
									<select
										value={draft.type}
										onChange={(event) =>
											setDraft({
												...draft,
												type: event.target.value as "income" | "expense",
											})
										}
									>
										<option value="expense">Expense</option>
										<option value="income">Income</option>
									</select>
								</label>
							)}
							<button
								className="submit-button"
								disabled={saving || deletingId !== null}
							>
								{saving ? "Saving..." : editing ? "Save category" : "Add category"}
							</button>
							{editing && (
								<button
									className="cancel-button"
									type="button"
									disabled={saving}
									onClick={closeForm}
								>
									Cancel
								</button>
							)}
						</form>
					</section>
				</dialog>
				<section className="panel category-list-panel">
					<div className="category-groups">
						<CategoryGroup
							title="Expense categories"
							type="expense"
							total={expenses.length}
							categories={visibleExpenses}
							expanded={expandedGroups.expense}
							onToggle={() => toggleExpanded("expense")}
							onEdit={startEdit}
							onDelete={onDeleteCategory}
							editing={editing}
							deletingId={deletingId}
						/>
						<CategoryGroup
							title="Income categories"
							type="income"
							total={income.length}
							categories={visibleIncome}
							expanded={expandedGroups.income}
							onToggle={() => toggleExpanded("income")}
							onEdit={startEdit}
							onDelete={onDeleteCategory}
							editing={editing}
							deletingId={deletingId}
						/>
					</div>
				</section>
			</section>
		</>
	);
}

function CategoryGroup({
	title,
	type,
	total,
	categories,
	expanded,
	onToggle,
	onEdit,
	onDelete,
	editing,
	deletingId,
}: {
	title: string;
	type: Category["type"];
	total: number;
	categories: Category[];
	expanded: boolean;
	onToggle: () => void;
	onEdit: (category: Category, trigger: HTMLButtonElement) => void;
	onDelete: (category: Category) => void;
	editing: Category | null;
	deletingId: number | null;
}) {
	return (
		<div className="category-group">
			<div className="category-group-heading">
				<strong>{title}</strong>
				<span>{total}</span>
			</div>
			{total === 0 ? (
				<div className="category-empty-state">
					<strong>No {type} categories</strong>
					<span>Add one to organize your transactions.</span>
				</div>
			) : (
				<div className="managed-category-grid" id={`category-${type}-list`}>
					{categories.map((category) => {
						const isEditing = editing?.id === category.id;

						return (
							<article
								className={`managed-category-card${isEditing ? " is-editing" : ""}`}
								key={category.id}
							>
								<div className="category-card-header">
									<div className={`category-type-label ${category.type}`}>
										<span
											className={`category-type-mark ${category.type}`}
											aria-hidden="true"
										>
											{category.type === "income" ? "+" : "-"}
										</span>
										<span>
											{category.type === "income" ? "Income" : "Expense"}
										</span>
									</div>
									<div className="category-card-actions">
										<button
											type="button"
											className="edit-button"
											disabled={deletingId !== null}
											aria-label={`Edit ${category.name}`}
											onClick={(event) =>
												onEdit(category, event.currentTarget)
											}
										>
											Edit
										</button>
										<button
											type="button"
											className="delete-button"
											disabled={deletingId !== null || isEditing}
											aria-label={`Delete ${category.name}`}
											title={
												isEditing
													? "Cancel editing before deleting"
													: undefined
											}
											onClick={() => onDelete(category)}
										>
											{deletingId === category.id ? "Deleting..." : "Delete"}
										</button>
									</div>
								</div>
								<strong className="category-card-name" title={category.name}>
									{category.name}
								</strong>
							</article>
						);
					})}
				</div>
			)}
			{total > 4 && (
				<button
					className="expand-button"
					type="button"
					onClick={onToggle}
					aria-expanded={expanded}
					aria-controls={`category-${type}-list`}
				>
					{expanded
						? `Show fewer ${title.toLowerCase()}`
						: `Show all ${total} ${title.toLowerCase()}`}
				</button>
			)}
		</div>
	);
}
