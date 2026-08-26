import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Category, CategoryDraft, DisplayCurrency } from "../types";

type SettingsViewProps = {
	categories: Category[];
	draft: CategoryDraft;
	setDraft: Dispatch<SetStateAction<CategoryDraft>>;
	editing: Category | null;
	setEditing: Dispatch<SetStateAction<Category | null>>;
	saving: boolean;
	onSaveCategory: (event: FormEvent<HTMLFormElement>) => void;
	onDeleteCategory: (id: number) => void;
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
	onSaveCategory,
	onDeleteCategory,
	currency,
	onCurrencyChange,
}: SettingsViewProps) {
	const [formOpen, setFormOpen] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const expenses = categories.filter((category) => category.type === "expense");
	const income = categories.filter((category) => category.type === "income");
	const visibleExpenses = expanded ? expenses : expenses.slice(0, 4);
	const visibleIncome = expanded ? income : income.slice(0, 4);
	const startEdit = (category: Category) => {
		setEditing(category);
		setDraft({ name: category.name, type: category.type });
		setFormOpen(true);
		setExpanded(true);
	};
	const cancelEdit = () => {
		setEditing(null);
		setDraft({ name: "", type: "expense" });
		setFormOpen(false);
	};

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
				<div className="section-heading settings-heading">
					<div>
						<p className="eyebrow">TRANSACTION LABELS</p>
						<h3>Categories</h3>
						<p className="muted">
							{expenses.length} expense · {income.length} income categories.
						</p>
					</div>
					<button
						className="text-button"
						onClick={() => {
							setFormOpen((current) => !current);
							if (editing) setEditing(null);
						}}
					>
						{formOpen ? "Close form" : "Add category"}
					</button>
				</div>
				{formOpen && (
					<section className="panel category-form-panel">
						<form onSubmit={onSaveCategory}>
							<div className="form-row">
								<label>
									Name
									<input
										autoFocus
										value={draft.name}
										onChange={(event) =>
											setDraft({ ...draft, name: event.target.value })
										}
										placeholder="Groceries"
									/>
								</label>
								{!editing && (
									<label>
										Type
										<select
											value={draft.type}
											onChange={(event) =>
												setDraft({
													...draft,
													type: event.target.value as
														"income" | "expense",
												})
											}
										>
											<option value="expense">Expense</option>
											<option value="income">Income</option>
										</select>
									</label>
								)}
							</div>
							<button className="submit-button" disabled={saving}>
								{editing ? "Save category" : "Add category"}
							</button>
							{editing && (
								<button
									className="cancel-button"
									type="button"
									onClick={cancelEdit}
								>
									Cancel
								</button>
							)}
						</form>
					</section>
				)}
				<section className="panel category-list-panel">
					<div className="category-groups">
						{visibleExpenses.length > 0 && (
							<CategoryGroup
								title="Expense categories"
								total={expenses.length}
								categories={visibleExpenses}
								onEdit={startEdit}
								onDelete={onDeleteCategory}
							/>
						)}
						{visibleIncome.length > 0 && (
							<CategoryGroup
								title="Income categories"
								total={income.length}
								categories={visibleIncome}
								onEdit={startEdit}
								onDelete={onDeleteCategory}
							/>
						)}
						{categories.length === 0 && (
							<p className="empty-copy">
								No categories yet. Add one to organize your transactions.
							</p>
						)}
					</div>
					{categories.length > 8 && (
						<button
							className="expand-button"
							onClick={() => setExpanded((current) => !current)}
							aria-expanded={expanded}
						>
							{expanded
								? "Show fewer categories"
								: `Show all ${categories.length} categories`}
						</button>
					)}
				</section>
			</section>
		</>
	);
}

function CategoryGroup({
	title,
	total,
	categories,
	onEdit,
	onDelete,
}: {
	title: string;
	total: number;
	categories: Category[];
	onEdit: (category: Category) => void;
	onDelete: (id: number) => void;
}) {
	return (
		<div className="category-group">
			<div className="category-group-heading">
				<strong>{title}</strong>
				<span>{total}</span>
			</div>
			<div className="managed-list">
				{categories.map((category) => (
					<div className="managed-row" key={category.id}>
						<div>
							<strong>{category.name}</strong>
							<span className={`type-pill ${category.type}`}>{category.type}</span>
						</div>
						<div className="row-actions">
							<button className="edit-button" onClick={() => onEdit(category)}>
								Edit
							</button>
							<button className="delete-button" onClick={() => onDelete(category.id)}>
								Delete
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
